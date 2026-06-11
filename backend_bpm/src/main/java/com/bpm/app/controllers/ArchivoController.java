package com.bpm.app.controllers;

import com.bpm.data.entities.ArchivoAdjunto;
import com.bpm.data.repositories.ArchivoAdjuntoRepository;
import com.bpm.domain.services.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.Set;

import com.bpm.domain.services.DocumentPermissionService;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import com.bpm.data.entities.BitacoraAcceso;
import com.bpm.data.repositories.BitacoraAccesoRepository;
import com.bpm.data.entities.Usuario;
import com.bpm.data.repositories.UsuarioRepository;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/archivos")
public class ArchivoController {

    private final StorageService storageService;
    private final ArchivoAdjuntoRepository archivoRepository;
    private final DocumentPermissionService permissionService;
    private final TramiteInstanciaRepository tramiteRepository;
    private final BitacoraAccesoRepository bitacoraRepository;
    private final UsuarioRepository usuarioRepository;

    private static final Set<String> ALLOWED_TYPES = Set.of(
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "video/mp4", "video/webm", "video/avi"
    );

    @Autowired
    public ArchivoController(StorageService storageService, ArchivoAdjuntoRepository archivoRepository,
            DocumentPermissionService permissionService,
            TramiteInstanciaRepository tramiteRepository,
            BitacoraAccesoRepository bitacoraRepository,
            UsuarioRepository usuarioRepository) {
        this.storageService = storageService;
        this.archivoRepository = archivoRepository;
        this.permissionService = permissionService;
        this.tramiteRepository = tramiteRepository;
        this.bitacoraRepository = bitacoraRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("idTramite") String idTramite,
            @RequestParam("idUsuario") String idUsuario,
            @RequestParam(value = "departamentoOrigenId", required = false) String departamentoOrigenId,
            @RequestParam(value = "idOrganizacion", required = false) String idOrganizacion) {
        try {
            if (file.getContentType() == null || !ALLOWED_TYPES.contains(file.getContentType())) {
                return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body("Tipo de archivo no permitido");
            }

            TramiteInstancia tramite = tramiteRepository.findById(idTramite).orElse(null);
            String idPolitica = tramite != null ? tramite.getIdPolitica() : null;
            String idCliente = tramite != null ? tramite.getIdUsuarioSolicitante() : null;

            String gridFsId = storageService.uploadFileHierarchical(
                    file.getInputStream(), 
                    file.getOriginalFilename(), 
                    file.getContentType(),
                    idOrganizacion, idPolitica, idCliente, idTramite
            );

            ArchivoAdjunto adjunto = ArchivoAdjunto.builder()
                     .idTramiteInstancia(idTramite)
                     .idUsuarioSubida(idUsuario)
                     .nombreOriginal(file.getOriginalFilename())
                     .contentType(file.getContentType())
                     .tamano(file.getSize())
                     .gridFsId(gridFsId)
                     .idPolitica(idPolitica)
                     .idCliente(idCliente)
                     .departamentoOrigenId(departamentoOrigenId)
                     .tipoDocumento((departamentoOrigenId != null && departamentoOrigenId.contains("LEGAL")) ? "CONTRATO" : "GENERAL")
                     .build();

            permissionService.asignarPermisosPorDefecto(adjunto, tramite, departamentoOrigenId);

            return ResponseEntity.ok(archivoRepository.save(adjunto));
        } catch (Exception e) {
            throw new RuntimeException("Error al subir archivo", e);
        }
    }

    @GetMapping("/tramite/{idTramite}")
    public ResponseEntity<List<ArchivoAdjunto>> listarPorTramite(@PathVariable String idTramite) {
        return ResponseEntity.ok(archivoRepository.findByIdTramiteInstancia(idTramite));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<?> downloadFile(
            @PathVariable String id,
            @RequestParam("idUsuario") String idUsuario) {
        ArchivoAdjunto adjunto = archivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Metadata de archivo no encontrada: " + id));

        if (!permissionService.verificarPermiso(adjunto, idUsuario, "READ")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado: no tiene permisos de lectura.");
        }

        InputStream stream = storageService.downloadFile(adjunto.getGridFsId());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + adjunto.getNombreOriginal() + "\"")
                .contentType(MediaType.parseMediaType(adjunto.getContentType()))
                .body(new InputStreamResource(stream));
    }

    @GetMapping("/preview/{id}")
    public ResponseEntity<?> previewFile(
            @PathVariable String id,
            @RequestParam("idUsuario") String idUsuario) {
        ArchivoAdjunto adjunto = archivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Metadata de archivo no encontrada: " + id));

        if (!permissionService.verificarPermiso(adjunto, idUsuario, "READ")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado: no tiene permisos de lectura.");
        }

        InputStream stream = storageService.downloadFile(adjunto.getGridFsId());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + adjunto.getNombreOriginal() + "\"")
                .contentType(MediaType.parseMediaType(adjunto.getContentType()))
                .body(new InputStreamResource(stream));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFile(
            @PathVariable String id,
            @RequestParam("idUsuario") String idUsuario) {
        ArchivoAdjunto adjunto = archivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + id));

        // Verificar si es el creador del archivo o tiene permisos de ADMIN
        boolean esCreador = idUsuario.equals(adjunto.getIdUsuarioSubida());
        boolean esAdmin = permissionService.verificarPermiso(adjunto, idUsuario, "ADMIN");

        if (!esCreador && !esAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("No autorizado: solo el creador del archivo o administradores pueden eliminarlo.");
        }

        // Eliminar del almacenamiento físico (S3 o GridFS)
        try {
            storageService.deleteFile(adjunto.getGridFsId());
        } catch (Exception e) {
            // Continuar borrando de la BD
        }

        // Eliminar de la base de datos
        archivoRepository.delete(adjunto);

        return ResponseEntity.ok().build();
    }

    // --- NUEVOS ENDPOINTS DE BÚSQUEDA ---

    @GetMapping("/cliente/{idCliente}")
    public ResponseEntity<List<ArchivoAdjunto>> listarPorCliente(@PathVariable String idCliente) {
        return ResponseEntity.ok(archivoRepository.findByIdCliente(idCliente));
    }

    @GetMapping("/politica/{idPolitica}")
    public ResponseEntity<List<ArchivoAdjunto>> listarPorPolitica(@PathVariable String idPolitica) {
        return ResponseEntity.ok(archivoRepository.findByIdPolitica(idPolitica));
    }

    @GetMapping("/global")
    public ResponseEntity<List<ArchivoAdjunto>> listarGlobal(
            @RequestParam("idUsuario") String idUsuario) {
        // Aquí verificar que el idUsuario sea ADMIN/GERENTE
        return ResponseEntity.ok(archivoRepository.findAll());
    }

    // --- NUEVOS ENDPOINTS DE PERMISOS ---

    @GetMapping("/{id}/metadata")
    public ResponseEntity<?> getMetadata(@PathVariable String id) {
        ArchivoAdjunto adjunto = archivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + id));
        return ResponseEntity.ok(adjunto);
    }

    @GetMapping("/{id}/permisos")
    public ResponseEntity<?> getPermisos(@PathVariable String id) {
        ArchivoAdjunto adjunto = archivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + id));
        return ResponseEntity.ok(adjunto.getPermisos() != null ? adjunto.getPermisos() : List.of());
    }

    @PatchMapping("/{id}/permisos")
    public ResponseEntity<?> updatePermisos(
            @PathVariable String id,
            @RequestParam("idUsuario") String idUsuario,
            @RequestBody List<ArchivoAdjunto.DocumentPermission> nuevosPermisos) {
        ArchivoAdjunto adjunto = archivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + id));

        // Solo ADMIN puede modificar permisos
        if (!permissionService.verificarPermiso(adjunto, idUsuario, "ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo usuarios con permiso ADMIN pueden modificar permisos de documentos.");
        }

        adjunto.setPermisos(nuevosPermisos);
        archivoRepository.save(adjunto);
        return ResponseEntity.ok(adjunto);
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<List<BitacoraAcceso>> getHistorialArchivo(
            @PathVariable String id,
            @RequestParam("idUsuario") String idUsuario) {
        ArchivoAdjunto adjunto = archivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + id));

        // Verificar permisos de lectura antes de mostrar el historial
        if (!permissionService.verificarPermiso(adjunto, idUsuario, "READ")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<BitacoraAcceso> historial = bitacoraRepository.findByResourceId(id);
        
        // Reemplazar IDs de usuario o "anonymousUser" con nombres legibles
        for (BitacoraAcceso b : historial) {
            String u = b.getUsername();
            if (u != null && !u.equals("ANONIMO") && !u.equals("SISTEMA")) {
                if (u.equals("anonymousUser")) {
                    b.setUsername("ANONIMO (Document Server)");
                } else if (u.contains(",")) {
                    String[] parts = u.split(",");
                    List<String> names = new java.util.ArrayList<>();
                    for (String part : parts) {
                        String cleanPart = part.trim();
                        Usuario usr = usuarioRepository.findById(cleanPart).orElse(null);
                        if (usr != null) {
                            names.add((usr.getNombre() + " " + (usr.getApellidos() != null ? usr.getApellidos() : "")).trim());
                        } else {
                            names.add(cleanPart);
                        }
                    }
                    b.setUsername(String.join(", ", names));
                } else {
                    Usuario usr = null;
                    if (u.contains("@")) {
                        List<Usuario> byEmail = usuarioRepository.findByEmail(u);
                        if (byEmail != null && !byEmail.isEmpty()) {
                            usr = byEmail.get(0);
                        }
                    } else {
                        usr = usuarioRepository.findById(u).orElse(null);
                    }
                    if (usr != null) {
                        String nombre = usr.getNombre() + " " + (usr.getApellidos() != null ? usr.getApellidos() : "");
                        b.setUsername(nombre.trim());
                    }
                }
            }
        }

        return ResponseEntity.ok(historial);
    }

}
