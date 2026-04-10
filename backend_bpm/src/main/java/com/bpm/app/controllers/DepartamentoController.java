package com.bpm.app.controllers;

import com.bpm.app.dto.DepartamentoRequestDTO;
import com.bpm.app.dto.DepartamentoResponseDTO;
import com.bpm.domain.services.DepartamentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/departamentos")
@RequiredArgsConstructor
public class DepartamentoController {

    private final DepartamentoService departamentoService;

    @PostMapping
    public ResponseEntity<DepartamentoResponseDTO> crear(@RequestBody DepartamentoRequestDTO dto) {
        return new ResponseEntity<>(departamentoService.crearDepartamento(dto), HttpStatus.CREATED);
    }

    @GetMapping("/organizacion/{idOrganizacion}")
    public ResponseEntity<List<DepartamentoResponseDTO>> listarPorOrganizacion(@PathVariable String idOrganizacion) {
        return ResponseEntity.ok(departamentoService.listarPorOrganizacion(idOrganizacion));
    }
}
