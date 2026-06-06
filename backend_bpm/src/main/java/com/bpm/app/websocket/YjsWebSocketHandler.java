package com.bpm.app.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

import com.bpm.domain.services.DocumentPermissionService;
import com.bpm.data.repositories.ArchivoAdjuntoRepository;
import com.bpm.data.repositories.BitacoraAccesoRepository;
import com.bpm.data.entities.ArchivoAdjunto;
import com.bpm.data.entities.BitacoraAcceso;
import org.springframework.beans.factory.annotation.Autowired;

@Component
public class YjsWebSocketHandler extends BinaryWebSocketHandler {

    // Límite máximo de usuarios concurrentes por documento (requisito RF1.5)
    private static final int MAX_USERS_PER_ROOM = 3;

    // Map: DocumentId -> Set of Sessions
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    private final DocumentPermissionService permissionService;
    private final ArchivoAdjuntoRepository archivoRepository;
    private final BitacoraAccesoRepository bitacoraRepository;

    // RF-1.6: Debounce para trazabilidad - evita saturar la BD con un registro por keystroke
    private final Map<String, Long> lastAuditTimestamp = new ConcurrentHashMap<>();
    private static final long AUDIT_DEBOUNCE_MS = 10_000; // 10 segundos

    @Autowired
    public YjsWebSocketHandler(DocumentPermissionService permissionService, 
                                ArchivoAdjuntoRepository archivoRepository,
                                BitacoraAccesoRepository bitacoraRepository) {
        this.permissionService = permissionService;
        this.archivoRepository = archivoRepository;
        this.bitacoraRepository = bitacoraRepository;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        String docId = getDocId(session);
        if (docId == null) {
            System.err.println("Yjs client connected without document ID");
            session.close(CloseStatus.BAD_DATA.withReason("Document ID is required"));
            return;
        }

        // Verificar límite de 3 usuarios concurrentes
        Set<WebSocketSession> room = rooms.computeIfAbsent(docId, k -> new CopyOnWriteArraySet<>());
        long activeCount = room.stream().filter(WebSocketSession::isOpen).count();

        if (activeCount >= MAX_USERS_PER_ROOM) {
            System.err.println("Yjs room for document " + docId + " is full (" + MAX_USERS_PER_ROOM + " users max).");
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason(
                    "Límite de " + MAX_USERS_PER_ROOM + " usuarios simultáneos alcanzado para este documento."));
            return;
        }

        // Verificar ACL: extraer userId del query param y validar permiso WRITE
        String userId = getUserId(session);
        if (userId == null || userId.isBlank()) {
            System.err.println("Yjs client connected without userId for ACL check");
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Debe proporcionar userId para verificación de permisos."));
            return;
        }

        // Validación ACL real
        ArchivoAdjunto archivo = archivoRepository.findById(docId).orElse(null);
        if (archivo == null) {
            System.err.println("Yjs client '" + userId + "' requested non-existent document " + docId);
            session.close(CloseStatus.BAD_DATA.withReason("Documento no encontrado."));
            return;
        }

        boolean tienePermiso = permissionService.verificarPermiso(archivo, userId, "WRITE");
        if (!tienePermiso) {
            System.err.println("Yjs client '" + userId + "' denied access to document " + docId);
            session.close(CloseStatus.POLICY_VIOLATION.withReason("No tiene permiso WRITE para este documento."));
            return;
        }

        room.add(session);
        System.out.println("Yjs client '" + userId + "' connected to document: " + docId 
                + " (" + room.size() + "/" + MAX_USERS_PER_ROOM + " slots used)");
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        String docId = getDocId(session);
        if (docId != null) {
            // RF-1.6: Registrar edición en BitacoraAcceso con debounce
            String userId = getUserId(session);
            if (userId != null) {
                String debounceKey = userId + ":" + docId;
                long now = System.currentTimeMillis();
                Long lastTime = lastAuditTimestamp.get(debounceKey);
                if (lastTime == null || (now - lastTime) > AUDIT_DEBOUNCE_MS) {
                    lastAuditTimestamp.put(debounceKey, now);
                    try {
                        String nombreDoc = archivoRepository.findById(docId)
                                .map(ArchivoAdjunto::getNombreOriginal).orElse(docId);
                        BitacoraAcceso registro = BitacoraAcceso.builder()
                                .username(userId)
                                .action("MODIFICACION")
                                .resource("Documento Colaborativo")
                                .resourceId(docId)
                                .details("Edición en sesión colaborativa: " + nombreDoc)
                                .timestamp(LocalDateTime.now())
                                .build();
                        bitacoraRepository.save(registro);
                    } catch (Exception e) {
                        System.err.println("Error registrando edición colaborativa en bitácora: " + e.getMessage());
                    }
                }
            }

            Set<WebSocketSession> room = rooms.get(docId);
            if (room != null) {
                for (WebSocketSession s : room) {
                    if (s.isOpen() && !s.getId().equals(session.getId())) {
                        try {
                            s.sendMessage(message);
                        } catch (IOException e) {
                            System.err.println("Error relaying Yjs message: " + e.getMessage());
                        }
                    }
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String docId = getDocId(session);
        if (docId != null) {
            Set<WebSocketSession> room = rooms.get(docId);
            if (room != null) {
                room.remove(session);
                String userId = getUserId(session);
                System.out.println("Yjs client '" + userId + "' disconnected from document: " + docId
                        + " (" + room.size() + "/" + MAX_USERS_PER_ROOM + " slots used)");
                if (room.isEmpty()) {
                    rooms.remove(docId);
                    System.out.println("All users left document " + docId + ". Room removed.");
                }
            }
        }
    }

    private String getDocId(WebSocketSession session) {
        // La URL debe ser /api/v1/yjs/{docId}?userId=xxx
        if (session.getUri() == null) return null;
        String path = session.getUri().getPath();
        String[] parts = path.split("/");
        if (parts.length > 0) {
            return parts[parts.length - 1];
        }
        return null;
    }

    private String getUserId(WebSocketSession session) {
        if (session.getUri() == null) return null;
        String query = session.getUri().getQuery();
        if (query != null) {
            for (String param : query.split("&")) {
                String[] kv = param.split("=", 2);
                if (kv.length == 2 && "userId".equals(kv[0])) {
                    return kv[1];
                }
            }
        }
        return null;
    }
}
