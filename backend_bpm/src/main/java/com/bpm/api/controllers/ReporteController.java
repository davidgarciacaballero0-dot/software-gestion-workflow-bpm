package com.bpm.api.controllers;

import com.bpm.app.dto.ReporteNlpRequestDTO;
import com.bpm.domain.services.ReporteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reportes")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService reporteService;

    @PostMapping("/nlp")
    public ResponseEntity<List<Map<String, Object>>> generarReporteNlp(@RequestBody ReporteNlpRequestDTO request) {
        if (request.getPrompt() == null || request.getPrompt().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        List<Map<String, Object>> resultado = reporteService.generarReporteDesdePrompt(request.getPrompt());
        return ResponseEntity.ok(resultado);
    }
}
