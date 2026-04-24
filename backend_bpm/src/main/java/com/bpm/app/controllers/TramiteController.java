package com.bpm.app.controllers;

import com.bpm.app.dto.AvanzarTramiteRequestDTO;
import com.bpm.app.dto.IntervencionRequestDTO;
import com.bpm.app.dto.StartProcedureRequestDTO;
import com.bpm.app.dto.TramiteResponseDTO;
import com.bpm.data.entities.EventoHistorial;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.domain.services.TramiteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tramites")
public class TramiteController {

    private final TramiteService tramiteService;

    @Autowired
    public TramiteController(TramiteService tramiteService) {
        this.tramiteService = tramiteService;
    }

    @PostMapping("/iniciar")
    public ResponseEntity<TramiteResponseDTO> iniciarTramite(@RequestBody StartProcedureRequestDTO request) {
        TramiteResponseDTO response = tramiteService.iniciarTramite(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/avanzar")
    public ResponseEntity<TramiteResponseDTO> avanzarTramite(@RequestBody AvanzarTramiteRequestDTO request) {
        TramiteResponseDTO response = tramiteService.avanzarTramite(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{tramiteId}")
    public ResponseEntity<TramiteResponseDTO> obtenerTramite(@PathVariable String tramiteId) {
        TramiteInstancia tramite = tramiteService.obtenerTramitePorId(tramiteId);
        return ResponseEntity.ok(tramiteService.mapearADTO(tramite, 
            tramiteService.obtenerNombrePolitica(tramite.getIdPolitica())));
    }

    // CU-10: Historial de Trazabilidad
    @GetMapping("/{tramiteId}/historial")
    public ResponseEntity<List<EventoHistorial>> listarHistorial(@PathVariable String tramiteId) {
        return ResponseEntity.ok(tramiteService.listarHistorial(tramiteId));
    }

    @GetMapping("/departamento/{departamentoId}")
    public ResponseEntity<List<TramiteResponseDTO>> listarBandejaDepartamento(@PathVariable String departamentoId) {
        return ResponseEntity.ok(tramiteService.listarBandejaDepartamento(departamentoId));
    }

    @GetMapping("/solicitante/{usuarioId}")
    public ResponseEntity<List<TramiteResponseDTO>> listarBandejaPersonal(@PathVariable String usuarioId) {
        return ResponseEntity.ok(tramiteService.listarBandejaPersonal(usuarioId));
    }

    // Búsqueda por Carnet de Identidad (REQ FASE 4)
    @GetMapping("/search/ci/{ci}")
    public ResponseEntity<List<TramiteResponseDTO>> buscarPorCi(@PathVariable String ci) {
        return ResponseEntity.ok(tramiteService.buscarPorCi(ci));
    }

    // CU-20: Supervisión de Jefatura
    @GetMapping("/supervision/{departamentoId}")
    public ResponseEntity<List<TramiteResponseDTO>> listarSupervision(@PathVariable String departamentoId) {
        if ("ALL".equalsIgnoreCase(departamentoId)) {
            return ResponseEntity.ok(tramiteService.listarSupervisionGlobal());
        }
        return ResponseEntity.ok(tramiteService.listarSupervisionDepartamento(departamentoId));
    }

    // CU-21: Intervención y Reasignación Administrativa
    @PostMapping("/intervencion")
    public ResponseEntity<TramiteResponseDTO> intervenirTramite(@RequestBody IntervencionRequestDTO request) {
        TramiteResponseDTO response = tramiteService.intervenirTramite(request);
        return ResponseEntity.ok(response);
    }
}
