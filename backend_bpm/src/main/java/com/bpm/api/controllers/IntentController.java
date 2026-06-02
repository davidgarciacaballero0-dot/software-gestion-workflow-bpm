package com.bpm.api.controllers;

import com.bpm.app.dto.ReporteNlpRequestDTO;
import com.bpm.domain.services.IntentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/intent")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class IntentController {

    private final IntentService intentService;

    @PostMapping("/policy")
    public ResponseEntity<Map<String, Object>> asignarPolitica(@RequestBody ReporteNlpRequestDTO request) {
        if (request.getPrompt() == null || request.getPrompt().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        
        Map<String, Object> resultado = intentService.asignarPoliticaPorIntencion(request.getPrompt());
        return ResponseEntity.ok(resultado);
    }
}
