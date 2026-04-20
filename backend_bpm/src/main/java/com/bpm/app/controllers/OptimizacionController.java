package com.bpm.app.controllers;

import com.bpm.domain.services.AnaliticaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/optimization")
@RequiredArgsConstructor
public class OptimizacionController {

    private final AnaliticaService analiticaService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final String IA_URL = "http://localhost:8000/ia";

    @GetMapping("/metrics")
    public ResponseEntity<List<AnaliticaService.MetricDataDTO>> getMetrics() {
        return ResponseEntity.ok(analiticaService.calcularMetricasDepartamentales());
    }

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeBottlenecks() {
        List<AnaliticaService.MetricDataDTO> metrics = analiticaService.calcularMetricasDepartamentales();
        
        Map<String, Object> request = new HashMap<>();
        request.put("metricas", metrics);

        try {
            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/analizar-rendimiento", request, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Microservicio IA fuera de línea o error en procesamiento.");
            error.put("details", e.getMessage());
            return ResponseEntity.status(503).body(error);
        }
    }

    @PostMapping("/analyze-flow")
    public ResponseEntity<Map<String, Object>> analyzeFlow(@RequestBody Map<String, String> request) {
        try {
            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/generar-flujo", request, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error al generar flujo con IA.");
            return ResponseEntity.status(503).body(error);
        }
    }

    @PostMapping("/reassign")
    public ResponseEntity<Map<String, String>> reassignStaff(
            @RequestParam String idOrigen,
            @RequestParam String idDestino,
            @RequestParam int cantidad) {
        
        analiticaService.reasignarPersonal(idOrigen, idDestino, cantidad);
        Map<String, String> res = new HashMap<>();
        res.put("message", "Reasignación ejecutada exitosamente.");
        return ResponseEntity.ok(res);
    }

    @GetMapping("/report/excel")
    public ResponseEntity<byte[]> downloadExcelReport() {
        byte[] content = analiticaService.exportarMetricasExcel();
        return ResponseEntity.ok()
                .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("Content-Disposition", "attachment; filename=reporte_gestion_bpm.xlsx")
                .body(content);
    }

    @PostMapping("/report/pdf")
    public ResponseEntity<byte[]> downloadPdfReport(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        byte[] content = analiticaService.generarPDFAnalisis(text);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=informe_ia_consultoria.pdf")
                .body(content);
    }

    @PostMapping("/asistente")
    public ResponseEntity<Map<String, Object>> chatAssistant(@RequestBody Map<String, String> request) {
        try {
            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/asistente", request, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (HttpStatusCodeException e) {
            Map<String, Object> error = new HashMap<>();
            if (e.getStatusCode().value() == 429) {
                error.put("error", "El asistente virtual está muy solicitado en este momento.");
                error.put("details", "Por favor, espera unos segundos e intenta de nuevo.");
                return ResponseEntity.status(429).body(error);
            }
            error.put("error", "Error en el asistente virtual.");
            return ResponseEntity.status(e.getStatusCode()).body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error al conectar con el asistente virtual.");
            return ResponseEntity.status(503).body(error);
        }
    }
}
