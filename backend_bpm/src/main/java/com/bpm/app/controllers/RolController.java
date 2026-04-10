package com.bpm.app.controllers;

import com.bpm.app.dto.RolRequestDTO;
import com.bpm.app.dto.RolResponseDTO;
import com.bpm.domain.services.RolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RolController {

    private final RolService rolService;

    @PostMapping
    public ResponseEntity<RolResponseDTO> crearRol(@RequestBody RolRequestDTO request) {
        RolResponseDTO response = rolService.crearRol(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<RolResponseDTO>> listarRoles() {
        return ResponseEntity.ok(rolService.listarRoles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RolResponseDTO> obtenerRolPorId(@PathVariable String id) {
        return ResponseEntity.ok(rolService.obtenerPorId(id));
    }
}
