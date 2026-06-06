package com.bpm.app.controllers;

import com.bpm.data.entities.ArchivoAdjunto;
import com.bpm.data.repositories.ArchivoAdjuntoRepository;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import com.bpm.domain.services.DocumentPermissionService;
import com.bpm.domain.services.OnlyOfficeService;
import com.bpm.domain.services.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import com.bpm.data.entities.BitacoraAcceso;
import com.bpm.data.repositories.BitacoraAccesoRepository;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/onlyoffice")
public class OnlyOfficeController {

    private final OnlyOfficeService onlyOfficeService;
    private final ArchivoAdjuntoRepository archivoRepository;
    private final StorageService storageService;
    private final DocumentPermissionService permissionService;
    private final TramiteInstanciaRepository tramiteRepository;
    private final BitacoraAccesoRepository bitacoraRepository;

    @Autowired
    public OnlyOfficeController(OnlyOfficeService onlyOfficeService,
                                ArchivoAdjuntoRepository archivoRepository,
                                StorageService storageService,
                                DocumentPermissionService permissionService,
                                TramiteInstanciaRepository tramiteRepository,
                                BitacoraAccesoRepository bitacoraRepository) {
        this.onlyOfficeService = onlyOfficeService;
        this.archivoRepository = archivoRepository;
        this.storageService = storageService;
        this.permissionService = permissionService;
        this.tramiteRepository = tramiteRepository;
        this.bitacoraRepository = bitacoraRepository;
    }

    @GetMapping("/config/{archivoId}")
    public ResponseEntity<?> getConfig(
            @PathVariable String archivoId,
            @RequestParam("idUsuario") String idUsuario) {
        
        ArchivoAdjunto archivo = archivoRepository.findById(archivoId)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + archivoId));

        if (!permissionService.verificarPermiso(archivo, idUsuario, "READ")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado.");
        }

        Map<String, Object> config = onlyOfficeService.generateConfig(archivo, idUsuario);
        return ResponseEntity.ok(config);
    }

    @GetMapping("/download/{archivoId}")
    public ResponseEntity<?> downloadForOnlyOffice(
            @PathVariable String archivoId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        if (token == null || !onlyOfficeService.isValidOnlyOfficeToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Acceso no autorizado: Token inválido o ausente.");
        }

        ArchivoAdjunto archivo = archivoRepository.findById(archivoId)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + archivoId));

        try {
            InputStream stream = storageService.downloadFile(archivo.getGridFsId());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + archivo.getNombreOriginal() + "\"")
                    .contentType(MediaType.parseMediaType(archivo.getContentType() != null ? archivo.getContentType() : "application/octet-stream"))
                    .body(new InputStreamResource(stream));
        } catch (Exception e) {
            // Registrar advertencia de fallback en la bitácora
            try {
                bitacoraRepository.save(BitacoraAcceso.builder()
                        .username("SISTEMA")
                        .role("SISTEMA")
                        .action("LECTURA")
                        .resource("ArchivoAdjunto")
                        .resourceId(archivoId)
                        .details("⚠️ Archivo físico ausente en almacenamiento (GCS/GridFS). Se sirvió una plantilla vacía de contingencia.")
                        .ipAddress("127.0.0.1")
                        .timestamp(LocalDateTime.now())
                        .build());
            } catch (Exception ex) {
                // Silencioso
            }

            // Fallback: si el archivo físico no existe en GCS/GridFS (típico en datos semilla/mock de base de datos),
            // devolvemos dinámicamente un documento vacío del tipo correspondiente para evitar la caída de OnlyOffice.
            byte[] fileData;
            String contentType = archivo.getContentType();
            if (contentType != null && contentType.contains("spreadsheet")) {
                fileData = onlyOfficeService.createBlankExcel();
            } else {
                fileData = onlyOfficeService.createBlankWord();
            }
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + archivo.getNombreOriginal() + "\"")
                    .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                    .body(new InputStreamResource(new java.io.ByteArrayInputStream(fileData)));
        }
    }

    @PostMapping("/callback")
    public ResponseEntity<Map<String, Integer>> callback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        try {
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else if (body.containsKey("token")) {
                token = (String) body.get("token");
            }

            if (token == null || !onlyOfficeService.isValidOnlyOfficeToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", 1));
            }

            int status = (Integer) body.get("status");
            // Status 2 significa que el documento ha sido guardado y editado
            // Status 3 significa guardado en progreso, 6 cerrado sin cambios
            if (status == 2 || status == 3) {
                String downloadUri = (String) body.get("url");
                String keyStr = (String) body.get("key");
                String archivoId = keyStr.split("-")[0];

                ArchivoAdjunto archivo = archivoRepository.findById(archivoId)
                        .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + archivoId));

                // Descargar archivo modificado desde Document Server
                RestTemplate restTemplate = new RestTemplate();
                byte[] fileData = restTemplate.getForObject(downloadUri, byte[].class);

                if (fileData != null) {
                    // Reemplazar o subir el nuevo contenido al storage
                    // Como el StorageService sube uno nuevo, podemos actualizar el ID de GridFs
                    String nuevoGridFsId = storageService.uploadFileHierarchical(
                            new ByteArrayInputStream(fileData),
                            archivo.getNombreOriginal(),
                            archivo.getContentType(),
                            null, archivo.getIdPolitica(), archivo.getIdCliente(), archivo.getIdTramiteInstancia()
                    );
                    
                    archivo.setGridFsId(nuevoGridFsId);
                    archivo.setTamano((long) fileData.length);
                    archivo.setUpdatedAt(LocalDateTime.now());
                    archivoRepository.save(archivo);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", 1));
        }

        // Return {"error": 0} to let OnlyOffice know we succeeded
        return ResponseEntity.ok(Map.of("error", 0));
    }

    @PostMapping("/create-blank")
    public ResponseEntity<ArchivoAdjunto> createBlankDocument(
            @RequestParam("tipo") String tipo,
            @RequestParam("idTramite") String idTramite,
            @RequestParam("idUsuario") String idUsuario) {
        
        byte[] fileData;
        String contentType;
        String extension;

        if ("word".equalsIgnoreCase(tipo)) {
            fileData = onlyOfficeService.createBlankWord();
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            extension = ".docx";
        } else if ("excel".equalsIgnoreCase(tipo)) {
            fileData = onlyOfficeService.createBlankExcel();
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            extension = ".xlsx";
        } else {
            return ResponseEntity.badRequest().build();
        }

        String nombreOriginal = "Nuevo Documento " + System.currentTimeMillis() + extension;
        String gridFsId = storageService.uploadFileHierarchical(
                new ByteArrayInputStream(fileData),
                nombreOriginal,
                contentType,
                null, null, null, idTramite
        );

        ArchivoAdjunto adjunto = ArchivoAdjunto.builder()
                .idTramiteInstancia(idTramite)
                .idUsuarioSubida(idUsuario)
                .nombreOriginal(nombreOriginal)
                .contentType(contentType)
                .tamano((long) fileData.length)
                .gridFsId(gridFsId)
                .tipoDocumento("GENERAL")
                .build();
        
        adjunto.setCreatedAt(LocalDateTime.now());
        adjunto.setUpdatedAt(LocalDateTime.now());

        TramiteInstancia tramite = tramiteRepository.findById(idTramite).orElse(null);
        if (tramite != null) {
            adjunto.setIdPolitica(tramite.getIdPolitica());
            adjunto.setIdCliente(tramite.getIdUsuarioSolicitante());
        }
        permissionService.asignarPermisosPorDefecto(adjunto, tramite, null);

        return ResponseEntity.ok(archivoRepository.save(adjunto));
    }
}
