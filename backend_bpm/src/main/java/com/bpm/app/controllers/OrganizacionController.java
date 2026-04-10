package com.bpm.app.controllers;

import com.bpm.app.dto.OrganizacionRequestDTO;
import com.bpm.app.dto.OrganizacionResponseDTO;
import com.bpm.domain.services.OrganizacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/organizaciones")
@RequiredArgsConstructor
public class OrganizacionController {

    private final OrganizacionService organizacionService;

    @PostMapping
    public ResponseEntity<OrganizacionResponseDTO> crear(@RequestBody OrganizacionRequestDTO dto) {
        return new ResponseEntity<>(organizacionService.crearOrganizacion(dto), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrganizacionResponseDTO> obtenerPorId(@PathVariable String id) {
        return ResponseEntity.ok(organizacionService.obtenerPorId(id));
    }

    @GetMapping
    public ResponseEntity<List<OrganizacionResponseDTO>> listarTodas() {
        return ResponseEntity.ok(organizacionService.listarTodas());
    }
}
