package com.bpm.app.jobs;

import com.bpm.domain.services.AnaliticaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.time.LocalDateTime;

@Component
public class InsightScheduler {

    @Autowired
    private AnaliticaService analiticaService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Value("${ia.microservice.url:http://localhost:8000}")
    private String iaMicroserviceUrl;

    // Ejecutar todos los días a las 8 AM
    @Scheduled(cron = "0 0 8 * * ?")
    public void generarSugerenciasProactivas() {
        System.out.println("[InsightScheduler] Ejecutando generación de Insights Proactivos...");
        
        try {
            List<AnaliticaService.MetricDataDTO> metricas = analiticaService.calcularMetricasDepartamentales();
            
            // Detectar situaciones anómalas
            List<String> alertas = new ArrayList<>();
            double promedioGeneral = metricas.stream()
                    .mapToDouble(AnaliticaService.MetricDataDTO::getTiempoPromedioHoras)
                    .average().orElse(0);

            for (AnaliticaService.MetricDataDTO m : metricas) {
                if (m.getTiempoPromedioHoras() > 48) {
                    alertas.add(String.format("⚠️ %s tiene un tiempo promedio de %.1f horas (crítico)", 
                            m.getNombreDepartamento(), m.getTiempoPromedioHoras()));
                }
                if (m.getRetrasosSla() > 5) {
                    alertas.add(String.format("🔴 %s acumula %d retrasos de SLA", 
                            m.getNombreDepartamento(), m.getRetrasosSla()));
                }
                if (m.getTiempoPromedioHoras() > promedioGeneral * 2) {
                    alertas.add(String.format("📊 %s duplica el promedio general de tiempo (%.1fh vs %.1fh)", 
                            m.getNombreDepartamento(), m.getTiempoPromedioHoras(), promedioGeneral));
                }
            }

            if (!alertas.isEmpty()) {
                // Invocar Gemini para análisis narrativo
                String analisisIA = "";
                try {
                    RestTemplate rest = new RestTemplate();
                    Map<String, Object> requestBody = new HashMap<>();
                    List<Map<String, Object>> metricasSerializadas = new ArrayList<>();
                    for (AnaliticaService.MetricDataDTO m : metricas) {
                        Map<String, Object> metrica = new HashMap<>();
                        metrica.put("nombreDepartamento", m.getNombreDepartamento());
                        metrica.put("cantidadTramites", m.getCantidadTramites());
                        metrica.put("tiempoPromedioHoras", m.getTiempoPromedioHoras());
                        metrica.put("retrasosSla", m.getRetrasosSla());
                        metricasSerializadas.add(metrica);
                    }
                    requestBody.put("metricas", metricasSerializadas);
                    requestBody.put("politicas", List.of());

                    @SuppressWarnings("unchecked")
                    Map<String, Object> iaResponse = rest.postForObject(
                            iaMicroserviceUrl + "/ia/analizar-rendimiento", requestBody, Map.class);
                    if (iaResponse != null) {
                        analisisIA = iaResponse.getOrDefault("analisis", "").toString();
                    }
                } catch (Exception iaErr) {
                    System.err.println("[InsightScheduler] No se pudo obtener análisis de IA: " + iaErr.getMessage());
                    analisisIA = "Análisis de IA no disponible en este momento.";
                }

                // Construir mensaje de notificación
                StringBuilder mensaje = new StringBuilder();
                mensaje.append("💡 **Sugerencia Proactiva de la IA** (").append(LocalDateTime.now().toLocalDate()).append(")\n\n");
                mensaje.append("Se detectaron ").append(alertas.size()).append(" situaciones que requieren atención:\n\n");
                for (String alerta : alertas) {
                    mensaje.append("• ").append(alerta).append("\n");
                }
                if (!analisisIA.isEmpty()) {
                    mensaje.append("\n📝 Análisis IA: ").append(analisisIA.length() > 500 ? analisisIA.substring(0, 500) + "..." : analisisIA);
                }

                // Enviar notificación WebSocket a administradores
                if (messagingTemplate != null) {
                    Map<String, Object> notification = new HashMap<>();
                    notification.put("tipo", "INSIGHT_PROACTIVO");
                    notification.put("mensaje", mensaje.toString());
                    notification.put("alertas", alertas);
                    notification.put("timestamp", LocalDateTime.now().toString());
                    notification.put("analisisIA", analisisIA);

                    messagingTemplate.convertAndSend("/topic/insights", (Object) notification);
                    System.out.println("[InsightScheduler] Notificación enviada a /topic/insights con " + alertas.size() + " alertas.");
                }
            } else {
                System.out.println("[InsightScheduler] No se detectaron anomalías. Sistema operando normalmente.");
            }

        } catch (Exception e) {
            System.err.println("[InsightScheduler] Error al generar insights proactivos: " + e.getMessage());
        }
    }
}
