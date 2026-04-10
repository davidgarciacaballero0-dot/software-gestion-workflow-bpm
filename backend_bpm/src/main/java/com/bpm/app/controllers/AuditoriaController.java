package com.bpm.app.controllers;

import com.bpm.app.dto.AuditoriaResponseDTO;
import com.bpm.domain.services.AuditoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auditoria")
@RequiredArgsConstructor
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    @GetMapping
    public ResponseEntity<List<AuditoriaResponseDTO>> listarTodos() {
        return ResponseEntity.ok(auditoriaService.listarTodos());
    }

    @GetMapping("/usuario/{idUsuario}")
    public ResponseEntity<List<AuditoriaResponseDTO>> listarPorUsuario(@PathVariable String idUsuario) {
        return ResponseEntity.ok(auditoriaService.listarPorUsuario(idUsuario));
    }
}
