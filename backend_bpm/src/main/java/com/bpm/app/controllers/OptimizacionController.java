package com.bpm.app.controllers;

import com.bpm.app.dto.TramiteResponseDTO;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.entities.Usuario;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import com.bpm.data.repositories.UsuarioRepository;
import com.bpm.domain.services.AnaliticaService;
import com.bpm.domain.services.TramiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
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
    private final TramiteService tramiteService;
    private final UsuarioRepository usuarioRepository;
    private final TramiteInstanciaRepository tramiteInstanciaRepository;
    private final com.bpm.data.repositories.SugerenciaReasignacionRepository sugerenciaReasignacionRepository;

    // Timeout de 120 segundos para dar tiempo al modelo Pro de Gemini
    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15_000);  // 15 seg para conectar
        factory.setReadTimeout(120_000);    // 120 seg para leer respuesta
        return new RestTemplate(factory);
    }

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
    public ResponseEntity<Map<String, Object>> analyzeBottlenecks(
            @RequestBody(required = false) Map<String, Object> payload) {
        Integer meses = 0;
        String idDepartamento = null;

        if (payload != null) {
            if (payload.get("meses") != null) {
                meses = (Integer) payload.get("meses");
            }
            if (payload.get("idDepartamento") != null) {
                idDepartamento = (String) payload.get("idDepartamento");
                if (idDepartamento != null && idDepartamento.trim().isEmpty())
                    idDepartamento = null;
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
        request.put("politicas", analiticaService.obtenerTodasLasPoliticas());

        try {
            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/analizar-rendimiento",
                    request, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Microservicio IA fuera de línea o error en procesamiento.");
            error.put("details", e.getMessage());
            return ResponseEntity.status(503).body(error);
        }
    }

    @PostMapping("/analyze-flow")
    public ResponseEntity<Map<String, Object>> analyzeFlow(@RequestBody Map<String, Object> request) {
        try {
            // REQ-14 Fix: Mapear 'descripcion' (frontend) a 'prompt' (IA Microservice)
            if (!request.containsKey("prompt") && request.containsKey("descripcion")) {
                request.put("prompt", request.get("descripcion"));
            }

            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/generar-flujo",
                    request, responseType);
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
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(
                org.springframework.http.ContentDisposition.attachment()
                        .filename("reporte_gestion_bpm.xlsx")
                        .build());
        headers.setContentLength(content.length);
        return new ResponseEntity<>(content, headers, org.springframework.http.HttpStatus.OK);
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
                    .cantidadTramites(m.get("cantidadTramites") != null ? ((Number) m.get("cantidadTramites")).intValue() : 0)
                    .tiempoPromedioHoras(Double.valueOf(String.valueOf(m.getOrDefault("tiempoPromedioHoras", 0.0))))
                    .capacidadPersonal(m.get("capacidadPersonal") != null ? ((Number) m.get("capacidadPersonal")).intValue() : 0)
                    .build()).collect(Collectors.toList());
        }

        byte[] content = analiticaService.generarPDFAnalisis(text, chartImage, metrics);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                org.springframework.http.ContentDisposition.attachment()
                        .filename("informe_ia_consultoria.pdf")
                        .build());
        headers.setContentLength(content.length);
        return new ResponseEntity<>(content, headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/report/word")
    public ResponseEntity<byte[]> downloadWordReport(@RequestBody Map<String, Object> request) {
        String text = (String) request.get("text");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> metricsRaw = (List<Map<String, Object>>) request.get("metrics");

        List<AnaliticaService.MetricDataDTO> metrics = null;
        if (metricsRaw != null) {
            metrics = metricsRaw.stream().map(m -> AnaliticaService.MetricDataDTO.builder()
                    .nombreDepartamento((String) m.get("nombreDepartamento"))
                    .cantidadTramites(m.get("cantidadTramites") != null ? ((Number) m.get("cantidadTramites")).intValue() : 0)
                    .tiempoPromedioHoras(Double.valueOf(String.valueOf(m.getOrDefault("tiempoPromedioHoras", 0.0))))
                    .capacidadPersonal(m.get("capacidadPersonal") != null ? ((Number) m.get("capacidadPersonal")).intValue() : 0)
                    .build()).collect(Collectors.toList());
        }

        byte[] content = analiticaService.generarReporteWord(text, metrics);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        headers.setContentDisposition(
                org.springframework.http.ContentDisposition.attachment()
                        .filename("informe_estrategico.docx")
                        .build());
        headers.setContentLength(content.length);
        return new ResponseEntity<>(content, headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/asistente")
    public ResponseEntity<Map<String, Object>> chatAssistant(@RequestBody Map<String, String> request) {
        try {
            Map<String, Object> iaRequest = new HashMap<>(request);
            
            // Inyectar rol si falta
            if (!iaRequest.containsKey("rol")) {
                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication();
                String rol = "CLIENTE";
                if (auth != null) {
                    rol = auth.getAuthorities().stream()
                            .map(r -> r.getAuthority().replace("ROLE_", ""))
                            .findFirst().orElse("CLIENTE");
                }
                iaRequest.put("rol", rol);
            }

            // Inyectar contexto real de la empresa para que el chatbot sea específico
            try {
                StringBuilder contexto = new StringBuilder();
                String email = "anonimo";
                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                        .getContext().getAuthentication();
                if (auth != null) {
                    email = auth.getName();
                }

                String rol = "CLIENTE";
                if (iaRequest.containsKey("rol")) {
                    rol = iaRequest.get("rol").toString();
                }

                // SI ES CLIENTE: Inyectar sus trámites personales + Catálogo disponible
                if ("CLIENTE".equals(rol)) {
                    java.util.List<Usuario> users = usuarioRepository.findByEmail(email);
                    Usuario user = users.isEmpty() ? null : users.get(0);
                    if (user != null) {
                        List<TramiteResponseDTO> misTramites = tramiteService.listarBandejaPersonal(user.getId());
                        if (misTramites != null && !misTramites.isEmpty()) {
                            contexto.append("MIS TRÁMITES ACTUALES E HISTÓRICOS:\n");
                            for (TramiteResponseDTO t : misTramites) {
                                contexto.append(String.format("- Código: %s, Trámite: %s, Estado: %s, Fecha: %s\n",
                                        t.getCodigoTramite(), t.getNombrePolitica(), t.getEstadoActual(), t.getCreatedAt()));
                            }
                        } else {
                            contexto.append("El cliente no tiene trámites registrados aún.\n");
                        }
                    }
                    
                    // También inyectar el catálogo para que pueda consultar requisitos de nuevos trámites
                    List<com.bpm.data.entities.PoliticaWorkflow> politicas = analiticaService.obtenerTodasLasPoliticas();
                    if (politicas != null && !politicas.isEmpty()) {
                        contexto.append("\nTRÁMITES QUE PUEDES INICIAR Y SUS REQUISITOS:\n");
                        for (com.bpm.data.entities.PoliticaWorkflow p : politicas) {
                            contexto.append(String.format("- %s: %s\n", p.getNombre(), p.getDescription()));
                            if (p.getNodes() != null) {
                                for (com.bpm.data.entities.embedded.WorkflowNode n : p.getNodes()) {
                                    if (n.getRequiredDocuments() != null && !n.getRequiredDocuments().isEmpty()) {
                                        contexto.append(String.format("  * Requisitos en %s: %s\n", n.getName(), String.join(", ", n.getRequiredDocuments())));
                                    }
                                }
                            }
                        }
                    }
                } 
                // SI ES FUNCIONARIO O ADMIN: Inyectar contexto de procesos y métricas
                else {
                    // Políticas activas con detalle de flujo y requisitos
                    List<com.bpm.data.entities.PoliticaWorkflow> politicas = analiticaService.obtenerTodasLasPoliticas();
                    if (politicas != null && !politicas.isEmpty()) {
                        contexto.append("CATÁLOGO DE TRÁMITES Y FLUJOS DETALLADOS:\n");
                        for (com.bpm.data.entities.PoliticaWorkflow p : politicas) {
                            contexto.append(String.format("### TRÁMITE: %s\n", p.getNombre()));
                            contexto.append(String.format("Descripción: %s\n", p.getDescription() != null ? p.getDescription() : "Sin descripción"));
                            contexto.append("Pasos del flujo:\n");
                            if (p.getNodes() != null) {
                                for (com.bpm.data.entities.embedded.WorkflowNode n : p.getNodes()) {
                                    if (n.getType() == com.bpm.data.entities.enums.NodeType.START) continue;
                                    contexto.append(String.format("  - Tarea: %s\n", n.getName()));
                                    if (n.getRequiredDocuments() != null && !n.getRequiredDocuments().isEmpty()) {
                                        contexto.append(String.format("    Requisitos: %s\n", String.join(", ", n.getRequiredDocuments())));
                                    }
                                }
                            }
                            contexto.append("\n");
                        }
                    }
                    
                    // Métricas departamentales
                    List<AnaliticaService.MetricDataDTO> metricas = analiticaService.calcularMetricasDepartamentales();
                    if (metricas != null && !metricas.isEmpty()) {
                        contexto.append("\nESTADO DE CARGA POR DEPARTAMENTO:\n");
                        for (AnaliticaService.MetricDataDTO m : metricas) {
                            contexto.append(String.format("- %s: %d trámites, tiempo promedio %.1fh, capacidad %d personas\n",
                                    m.getNombreDepartamento(), m.getCantidadTramites(),
                                    m.getTiempoPromedioHoras(), m.getCapacidadPersonal()));
                        }
                    }
                }
                
                iaRequest.put("contexto_empresa", contexto.toString());
            } catch (Exception ctxErr) {
                System.err.println("Warning: No se pudo cargar contexto empresarial: " + ctxErr.getMessage());
            }

            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/chat-interactivo",
                    iaRequest, responseType);
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

    @PostMapping("/voice-orchestrator")
    public ResponseEntity<Map<String, Object>> voiceOrchestrator(@RequestBody Map<String, Object> payload) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("comando", payload.get("comando"));
            
            // Add current context
            Map<String, Object> contexto = new HashMap<>();
            contexto.put("metricas", analiticaService.calcularMetricasDepartamentales());
            request.put("contexto", contexto);

            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/orquestador-voz",
                    request, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            System.err.println("Error calling IA Voice Orchestrator: " + e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("action", "TEXT_ONLY");
            error.put("text_response", "Error al conectar con el Orquestador IA: " + e.getMessage());
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
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(IA_URL + "/proyectar-demanda",
                    request, responseType);
            return ResponseEntity.ok(response.getBody());
        } catch (HttpStatusCodeException e) {
            Map<String, Object> error = new HashMap<>();
            if (e.getStatusCode().value() == 429) {
                error.put("error", "⚠️ Cuota de IA agotada");
                error.put("details", "La API de Google Gemini ha alcanzado su límite de uso. Intente nuevamente en unos minutos o actualice su plan de API.");
                error.put("errorType", "QUOTA_EXHAUSTED");
                return ResponseEntity.status(429).body(error);
            }
            error.put("error", "Error interno en el microservicio de IA.");
            error.put("details", e.getResponseBodyAsString());
            error.put("errorType", "IA_INTERNAL_ERROR");
            return ResponseEntity.status(e.getStatusCode()).body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("Connection refused")) {
                error.put("error", "🔌 Microservicio de IA no disponible");
                error.put("details", "El servicio de inteligencia artificial no está en ejecución. Verifique que el contenedor ia-service esté activo.");
                error.put("errorType", "SERVICE_DOWN");
            } else if (msg.contains("Read timed out")) {
                error.put("error", "⏱️ Tiempo de espera agotado");
                error.put("details", "El modelo de IA tardó demasiado en responder. Intente nuevamente.");
                error.put("errorType", "TIMEOUT");
            } else {
                error.put("error", "Error inesperado al generar proyecciones.");
                error.put("details", msg);
                error.put("errorType", "UNKNOWN");
            }
            return ResponseEntity.status(503).body(error);
        }
    }

    @PostMapping("/nlp-report")
    public ResponseEntity<Map<String, Object>> getReportByNLP(@RequestBody Map<String, String> requestPayload) {
        String prompt = requestPayload.get("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "El prompt NLP no puede estar vacío.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            // 1. Enviar el prompt a FastAPI para extraer parámetros estructurados de forma segura
            Map<String, String> iaRequest = new HashMap<>();
            iaRequest.put("prompt", prompt);

            ResponseEntity<AnaliticaService.NlpReportParams> iaResponse = restTemplate.postForEntity(
                IA_URL + "/parsear-reporte-nlp",
                iaRequest,
                AnaliticaService.NlpReportParams.class
            );

            AnaliticaService.NlpReportParams params = iaResponse.getBody();
            if (params == null) {
                throw new RuntimeException("No se pudieron parsear los parámetros del reporte con IA.");
            }

            // 2. Ejecutar la agregación parametrizada y segura en Spring Boot / MongoDB
            AnaliticaService.NlpReportResult result = analiticaService.ejecutarReporteDinamicoNLP(params);

            // 3. Generar el resumen narrativo del reporte usando Gemini
            String resumenNarrativo = "No se pudo generar el análisis automático de los datos.";
            try {
                Map<String, Object> summarizeRequest = new HashMap<>();
                summarizeRequest.put("prompt", prompt);
                summarizeRequest.put("dimension", params.getDimension());
                summarizeRequest.put("metric", params.getMetric());
                summarizeRequest.put("data", result.getData());

                @SuppressWarnings("unchecked")
                Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
                ResponseEntity<Map<String, Object>> summarizeResponse = restTemplate.postForEntity(
                    IA_URL + "/resumir-reporte-nlp",
                    summarizeRequest,
                    responseType
                );
                if (summarizeResponse.getBody() != null && summarizeResponse.getBody().containsKey("resumen")) {
                    resumenNarrativo = (String) summarizeResponse.getBody().get("resumen");
                }
            } catch (Exception sumErr) {
                System.err.println("Error generating NLP report summary: " + sumErr.getMessage());
            }

            // 4. Empaquetar y devolver respuesta con metadatos para renderizado premium
            Map<String, Object> response = new HashMap<>();
            response.put("params", params);
            response.put("result", result);
            response.put("summary", resumenNarrativo);
            response.put("status", "success");
            return ResponseEntity.ok(response);

        } catch (HttpStatusCodeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error en el procesamiento de IA del reporte.");
            error.put("details", e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error al ejecutar reporte dinámico por NLP.");
            error.put("details", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/nlp-policy-assignment")
    public ResponseEntity<Map<String, Object>> assignPolicyByIntent(@RequestBody Map<String, String> requestPayload) {
        String requerimiento = requestPayload.get("requerimiento");
        if (requerimiento == null || requerimiento.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "El requerimiento no puede estar vacío.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            // 1. Obtener todas las políticas de negocio disponibles
            List<com.bpm.data.entities.PoliticaWorkflow> politicas = analiticaService.obtenerTodasLasPoliticas();
            if (politicas.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "No hay políticas de negocio registradas en el sistema para realizar la asignación.");
                return ResponseEntity.status(404).body(error);
            }

            // 2. Construir payload para FastAPI
            Map<String, Object> iaRequest = new HashMap<>();
            iaRequest.put("requerimiento", requerimiento);
            iaRequest.put("politicas", politicas);

            // 3. Enviar a FastAPI para análisis de similitud
            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> iaResponse = restTemplate.postForEntity(
                IA_URL + "/analisis-intencion-politica",
                iaRequest,
                responseType
            );

            return ResponseEntity.ok(iaResponse.getBody());

        } catch (HttpStatusCodeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error en el microservicio de IA al analizar intención.");
            error.put("details", e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Error al asignar política por intención NLP.");
            error.put("details", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // =====================================================
    // RF-4.4: Sugerencias Proactivas de IA
    // =====================================================

    @GetMapping("/suggestions")
    public ResponseEntity<Map<String, Object>> getProactiveSuggestions() {
        try {
            // 1. Recopilar estadísticas rápidas del sistema
            List<AnaliticaService.MetricDataDTO> metrics = analiticaService.calcularMetricasDepartamentales();
            
            int totalTramites = metrics.stream().mapToInt(AnaliticaService.MetricDataDTO::getCantidadTramites).sum();
            int totalRetrasos = metrics.stream().mapToInt(AnaliticaService.MetricDataDTO::getRetrasosSla).sum();
            String deptoMasCargado = metrics.stream()
                    .max(java.util.Comparator.comparingInt(AnaliticaService.MetricDataDTO::getCantidadTramites))
                    .map(AnaliticaService.MetricDataDTO::getNombreDepartamento)
                    .orElse("N/A");

            // Calcular trámites anómalos y más antiguo
            List<TramiteInstancia> activos = tramiteInstanciaRepository.findAll().stream()
                    .filter(t -> !"FINALIZADO".equalsIgnoreCase(t.getEstadoActual())
                            && !"RECHAZADO".equalsIgnoreCase(t.getEstadoActual()))
                    .collect(Collectors.toList());

            long anomalos = activos.stream().filter(t -> Boolean.TRUE.equals(t.getEsAnomalo())).count();
            long diasMasAntiguo = activos.stream()
                    .filter(t -> t.getCreatedAt() != null)
                    .mapToLong(t -> java.time.Duration.between(t.getCreatedAt(), java.time.LocalDateTime.now()).toDays())
                    .max().orElse(0);

            // 2. Construir petición para FastAPI
            Map<String, Object> iaRequest = new HashMap<>();
            iaRequest.put("total_tramites_activos", totalTramites);
            iaRequest.put("total_anomalos", (int) anomalos);
            iaRequest.put("departamento_mas_cargado", deptoMasCargado);
            iaRequest.put("tramite_mas_antiguo_dias", (int) diasMasAntiguo);
            iaRequest.put("total_departamentos", metrics.size());
            iaRequest.put("retrasos_sla", totalRetrasos);

            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                    IA_URL + "/sugerir-reportes", iaRequest, responseType);

            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            // Fallback: sugerencias estáticas si la IA no responde
            Map<String, Object> fallback = new HashMap<>();
            List<Map<String, String>> suggestions = new java.util.ArrayList<>();
            suggestions.add(Map.of("titulo", "Trámites por Departamento", "descripcion", "Visualice la distribución de carga actual", "prompt_nlp", "Muéstrame la cantidad de trámites por departamento", "urgencia", "alta", "icono", "📊"));
            suggestions.add(Map.of("titulo", "Retrasos SLA", "descripcion", "Identifique los cuellos de botella recientes", "prompt_nlp", "Muéstrame los trámites con retraso de los últimos 30 días", "urgencia", "alta", "icono", "⚠️"));
            suggestions.add(Map.of("titulo", "Tendencia Mensual", "descripcion", "Analice la evolución temporal", "prompt_nlp", "Muéstrame la cantidad de trámites por mes", "urgencia", "media", "icono", "📈"));
            fallback.put("suggestions", suggestions);
            fallback.put("status", "fallback");
            return ResponseEntity.ok(fallback);
        }
    }

    // =====================================================
    // RF-3.4: Reasignación Semi-automática de Recursos
    // =====================================================

    @GetMapping("/suggestions/reassign")
    public ResponseEntity<java.util.List<com.bpm.data.entities.SugerenciaReasignacion>> getPendingReassignments() {
        return ResponseEntity.ok(sugerenciaReasignacionRepository.findByEstadoOrderByCreatedAtDesc("PENDIENTE"));
    }

    @PatchMapping("/suggestions/reassign/{id}/approve")
    public ResponseEntity<Map<String, String>> approveReassignment(@PathVariable String id) {
        return sugerenciaReasignacionRepository.findById(id).map(s -> {
            s.setEstado("APROBADA");
            s.setResueltaPor("SUPERVISOR");
            s.setResolvedAt(java.time.LocalDateTime.now());
            sugerenciaReasignacionRepository.save(s);

            tramiteInstanciaRepository.findById(s.getTramiteId()).ifPresent(t -> {
                t.setDepartamentoActualId(s.getDepartamentoDestinoId());
                tramiteInstanciaRepository.save(t);
            });

            Map<String, String> res = new HashMap<>();
            res.put("message", "Reasignación aprobada y ejecutada.");
            return ResponseEntity.ok(res);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/suggestions/reassign/{id}/reject")
    public ResponseEntity<Map<String, String>> rejectReassignment(@PathVariable String id) {
        return sugerenciaReasignacionRepository.findById(id).map(s -> {
            s.setEstado("RECHAZADA");
            s.setResueltaPor("SUPERVISOR");
            s.setResolvedAt(java.time.LocalDateTime.now());
            sugerenciaReasignacionRepository.save(s);

            Map<String, String> res = new HashMap<>();
            res.put("message", "Sugerencia rechazada.");
            return ResponseEntity.ok(res);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}

