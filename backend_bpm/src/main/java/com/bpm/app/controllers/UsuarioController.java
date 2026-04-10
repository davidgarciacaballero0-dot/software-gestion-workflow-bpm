package com.bpm.app.controllers;

import com.bpm.app.dto.UsuarioRequestDTO;
import com.bpm.app.dto.UsuarioResponseDTO;
import com.bpm.domain.services.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @PostMapping
    public ResponseEntity<UsuarioResponseDTO> registrarUsuario(@RequestBody UsuarioRequestDTO request) {
        // En este punto viaja la data cruda, y será interceptada por el triple anillo
        // del servicio antes de devolverse blindada como DTO (Status 201 Created)
        UsuarioResponseDTO response = usuarioService.registrarFuncionario(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/departamento/{idDepartamento}")
    public ResponseEntity<List<UsuarioResponseDTO>> listarUsuariosPorDepartamento(@PathVariable String idDepartamento) {
        return ResponseEntity.ok(usuarioService.listarPorDepartamento(idDepartamento));
    }
}
