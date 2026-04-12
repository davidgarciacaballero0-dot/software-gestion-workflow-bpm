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

@RestController
@RequestMapping("/api/v1/archivos")
public class ArchivoController {

    private final StorageService storageService;
    private final ArchivoAdjuntoRepository archivoRepository;

    @Autowired
    public ArchivoController(StorageService storageService, ArchivoAdjuntoRepository archivoRepository) {
        this.storageService = storageService;
        this.archivoRepository = archivoRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<ArchivoAdjunto> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("idTramite") String idTramite,
            @RequestParam("idUsuario") String idUsuario) {
        try {
            String gridFsId = storageService.uploadFile(
                    file.getInputStream(), 
                    file.getOriginalFilename(), 
                    file.getContentType()
            );

            ArchivoAdjunto adjunto = ArchivoAdjunto.builder()
                    .idTramiteInstancia(idTramite)
                    .idUsuarioSubida(idUsuario)
                    .nombreOriginal(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .tamano(file.getSize())
                    .gridFsId(gridFsId)
                    .build();

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
    public ResponseEntity<InputStreamResource> downloadFile(@PathVariable String id) {
        ArchivoAdjunto adjunto = archivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Metadata de archivo no encontrada: " + id));

        InputStream stream = storageService.downloadFile(adjunto.getGridFsId());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + adjunto.getNombreOriginal() + "\"")
                .contentType(MediaType.parseMediaType(adjunto.getContentType()))
                .body(new InputStreamResource(stream));
    }
}
