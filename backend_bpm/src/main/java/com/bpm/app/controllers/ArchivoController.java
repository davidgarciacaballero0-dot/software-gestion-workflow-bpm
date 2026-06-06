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
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/archivos")
public class ArchivoController {

    private final StorageService storageService;
    private final ArchivoAdjuntoRepository archivoRepository;
    private final DocumentPermissionService permissionService;
    private final TramiteInstanciaRepository tramiteRepository;

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
            TramiteInstanciaRepository tramiteRepository) {
        this.storageService = storageService;
        this.archivoRepository = archivoRepository;
        this.permissionService = permissionService;
        this.tramiteRepository = tramiteRepository;
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

}
