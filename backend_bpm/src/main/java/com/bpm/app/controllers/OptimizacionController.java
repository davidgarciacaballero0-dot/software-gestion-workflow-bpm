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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/optimization")
@RequiredArgsConstructor
public class OptimizacionController {

    private final AnaliticaService analiticaService;
    private final RestTemplate restTemplate = new RestTemplate();
    
    @org.springframework.beans.factory.annotation.Value("${ia.service.url:http://localhost:8000/ia}")
    private String IA_URL;

    @GetMapping("/metrics")
    public ResponseEntity<List<AnaliticaService.MetricDataDTO>> getMetrics(
            @RequestParam(required = false) Integer meses,
            @RequestParam(required = false) String idDepartamento,
            @RequestParam(required = false) String idPolitica) {
        
        if (meses != null && meses > 0) {
            return ResponseEntity.ok(analiticaService.calcularMetricasHistoricas(meses, idDepartamento, idPolitica));
        }
        return ResponseEntity.ok(analiticaService.calcularMetricasDepartamentales());
    }

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeBottlenecks(@RequestBody(required = false) Map<String, Object> payload) {
        Integer meses = 0;
        String idDepartamento = null;
        
        if (payload != null) {
            if (payload.get("meses") != null) {
                meses = (Integer) payload.get("meses");
            }
            if (payload.get("idDepartamento") != null) {
                idDepartamento = (String) payload.get("idDepartamento");
                if (idDepartamento != null && idDepartamento.trim().isEmpty()) idDepartamento = null;
            }
        }

        List<AnaliticaService.MetricDataDTO> metrics;
        if (meses != null && meses > 0) {
            metrics = analiticaService.calcularMetricasHistoricas(meses, idDepartamento, null);
        } else {
            metrics = analiticaService.calcularMetricasDepartamentales();
        }
        
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
            // REQ-14 Fix: Mapear 'descripcion' (frontend) a 'prompt' (IA Microservice)
            Map<String, String> iaRequest = new HashMap<>();
            String prompt = request.get("prompt");
            if (prompt == null) prompt = request.get("descripcion");
            
            iaRequest.put("prompt", prompt);

            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/generar-flujo", iaRequest, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            System.err.println("Error calling IA flow generation: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error al generar flujo con IA.");
            error.put("details", e.getMessage());
            return ResponseEntity.status(503).body(error);
        }
    }

    @PostMapping("/reassign")
    public ResponseEntity<Map<String, String>> reassignStaff(@RequestBody ReassignRequest request) {
        analiticaService.reasignarPersonal(request.getIdDestino(), request.getUserIds());
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
    public ResponseEntity<byte[]> downloadPdfReport(@RequestBody Map<String, Object> request) {
        String text = (String) request.get("text");
        String chartImage = (String) request.get("chartImage");
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> metricsRaw = (List<Map<String, Object>>) request.get("metrics");
        
        List<AnaliticaService.MetricDataDTO> metrics = null;
        if (metricsRaw != null) {
            metrics = metricsRaw.stream().map(m -> AnaliticaService.MetricDataDTO.builder()
                .nombreDepartamento((String) m.get("nombreDepartamento"))
                .cantidadTramites((Integer) m.get("cantidadTramites"))
                .tiempoPromedioHoras(Double.valueOf(String.valueOf(m.getOrDefault("tiempoPromedioHoras", 0.0))))
                .capacidadPersonal((Integer) m.get("capacidadPersonal"))
                .build()).collect(Collectors.toList());
        }

        byte[] content = analiticaService.generarPDFAnalisis(text, chartImage, metrics);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=informe_ia_consultoria.pdf")
                .body(content);
    }

    @PostMapping("/asistente")
    public ResponseEntity<Map<String, Object>> chatAssistant(@RequestBody Map<String, String> request) {
        try {
            // REQ-14: Inyectar rol si falta para compatibilidad con microservicio IA
            Map<String, String> iaRequest = new HashMap<>(request);
            if (!iaRequest.containsKey("rol")) {
                org.springframework.security.core.Authentication auth = 
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                String rol = "CLIENTE"; // Default
                if (auth != null) {
                    rol = auth.getAuthorities().stream()
                        .map(r -> r.getAuthority().replace("ROLE_", ""))
                        .findFirst().orElse("CLIENTE");
                }
                iaRequest.put("rol", rol);
            }

            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/chat-interactivo", iaRequest, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (HttpStatusCodeException e) {
            System.err.println("IA Service HTTP Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
            Map<String, Object> error = new HashMap<>();
            if (e.getStatusCode().value() == 429) {
                error.put("error", "El asistente virtual está muy solicitado en este momento.");
                error.put("details", "Por favor, espera unos segundos e intenta de nuevo.");
                return ResponseEntity.status(429).body(error);
            }
            error.put("error", "Error en el asistente virtual.");
            return ResponseEntity.status(e.getStatusCode()).body(error);
        } catch (Exception e) {
            System.err.println("Error connecting to IA assistant: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error al conectar con el asistente virtual.");
            error.put("details", e.getMessage());
            return ResponseEntity.status(503).body(error);
        }
    }

    @lombok.Data
    public static class ReassignRequest {
        private String idOrigen;
        private String idDestino;
        private List<String> userIds;
        private String motivo;
    }

    @PostMapping("/projections")
    public ResponseEntity<Map<String, Object>> downloadProjections(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/proyectar-demanda", request, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error al generar proyecciones con IA.");
            error.put("details", e.getMessage());
            return ResponseEntity.status(503).body(error);
        }
    }
}
