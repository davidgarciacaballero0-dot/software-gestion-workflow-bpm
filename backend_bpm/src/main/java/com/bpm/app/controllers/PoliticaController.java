package com.bpm.app.controllers;

import com.bpm.app.dto.WorkflowRequestDTO;
import com.bpm.app.dto.WorkflowResponseDTO;
import com.bpm.domain.services.PoliticaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/policies")
@RequiredArgsConstructor
public class PoliticaController {

    private final PoliticaService politicaService;

    @PostMapping
    public ResponseEntity<WorkflowResponseDTO> guardarPolitica(@RequestBody WorkflowRequestDTO request) {
        WorkflowResponseDTO response = politicaService.guardarPolitica(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkflowResponseDTO> actualizarPolitica(@PathVariable String id, @RequestBody WorkflowRequestDTO request) {
        request.setId(id);
        WorkflowResponseDTO response = politicaService.guardarPolitica(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/organization/{idOrganizacion}")
    public ResponseEntity<List<WorkflowResponseDTO>> listarPorOrganizacion(@PathVariable String idOrganizacion) {
        return ResponseEntity.ok(politicaService.listarPorOrganizacion(idOrganizacion));
    }

    @GetMapping("/catalog")
    public ResponseEntity<List<WorkflowResponseDTO>> listarCatalogoPublico() {
        return ResponseEntity.ok(politicaService.listarCatalogoPublico());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkflowResponseDTO> obtenerPolitica(@PathVariable String id) {
        return ResponseEntity.ok(politicaService.obtenerPolitica(id));
    }

    @PatchMapping("/{id}/publish")
    public ResponseEntity<WorkflowResponseDTO> publicarPolitica(@PathVariable String id) {
        return ResponseEntity.ok(politicaService.publicarPolitica(id));
    }

    @PostMapping("/{id}/new-version")
    public ResponseEntity<WorkflowResponseDTO> crearNuevaVersion(@PathVariable String id) {
        return new ResponseEntity<>(politicaService.crearNuevaVersion(id), HttpStatus.CREATED);
    }
}
