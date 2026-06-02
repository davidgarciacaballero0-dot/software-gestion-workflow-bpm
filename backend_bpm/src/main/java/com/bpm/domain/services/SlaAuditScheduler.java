package com.bpm.domain.services;

import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.EventoHistorialRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class SlaAuditScheduler {

    private final TramiteInstanciaRepository tramiteRepository;
    private final DepartamentoRepository departamentoRepository;
    private final EventoHistorialRepository historialRepository;
    private final NotificationService notificationService;

    @Value("${ia.service.url:http://localhost:8000/ia}")
    private String IA_URL;

    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);  // 5 seg
        factory.setReadTimeout(10_000);    // 10 seg (job asíncrono, no bloquea al usuario)
        return new RestTemplate(factory);
    }

    /**
     * Tarea programada en segundo plano para auditar y recalcular SLAs y riesgos
     * de estancamiento (CU-29 y CU-30) de forma totalmente asíncrona cada 60 segundos.
     */
    @Scheduled(fixedDelay = 60000)
    public void auditarTramitesSlaYPrioridades() {
        log.info("⏰ Iniciando Job asíncrono de auditoría de SLAs y Anomalías (CU-29 y CU-30)...");

        // 1. Obtener todos los trámites activos (no finalizados ni rechazados)
        List<TramiteInstancia> tramitesActivos = tramiteRepository.findAll().stream()
                .filter(t -> !"FINALIZADO".equalsIgnoreCase(t.getEstadoActual()) 
                        && !"RECHAZADO".equalsIgnoreCase(t.getEstadoActual()))
                .collect(Collectors.toList());

        if (tramitesActivos.isEmpty()) {
            log.info("ℹ️ No hay trámites activos para evaluar.");
            return;
        }

        // 2. Procesar cada trámite de forma individual y segura
        for (TramiteInstancia t : tramitesActivos) {
            if (t.getVersion() == null) {
                t.setVersion(1L);
            }
            try {
                LocalDateTime ahora = LocalDateTime.now();
                LocalDateTime inicio = t.getCreatedAt() != null ? t.getCreatedAt() : ahora;
                LocalDateTime vencimiento = t.getFechaVencimientoSla() != null ? t.getFechaVencimientoSla() : inicio.plusHours(48);

                long diasActivo = Duration.between(inicio, ahora).toDays();
                double horasRestantes = Duration.between(ahora, vencimiento).toMinutes() / 60.0;

                // Obtener nombre del departamento
                String deptoNombre = "Sin Asignar";
                if (t.getDepartamentoActualId() != null) {
                    deptoNombre = departamentoRepository.findById(t.getDepartamentoActualId())
                            .map(d -> d.getNombre())
                            .orElse("Desconocido");
                }

                // Consultar eventos del historial para pasarlos como contexto a la IA
                List<String> historialSucesos = historialRepository.findByIdTramite(t.getId()).stream()
                        .map(e -> String.format("[%s] Tarea '%s' ejecutada por %s", 
                                e.getCreatedAt(), e.getNodoDestinoNombre(), e.getEjecutadoPorNombre()))
                        .collect(Collectors.toList());

                // 3. Construir petición para FastAPI
                Map<String, Object> request = new HashMap<>();
                request.put("codigoTramite", t.getCodigoTramite() != null ? t.getCodigoTramite() : "TRM-TEMP");
                request.put("diasActivo", diasActivo);
                request.put("horasRestantesSla", horasRestantes);
                request.put("departamentoActual", deptoNombre);
                request.put("prioridad", t.getPrioridad() != null ? t.getPrioridad() : 3);
                request.put("historial", historialSucesos);

                // 4. Invocar asíncronamente el servicio IA de evaluación
                @SuppressWarnings("unchecked")
                Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
                Map<String, Object> iaResponse = restTemplate.postForObject(
                        IA_URL + "/evaluar-anomalia-sla",
                        request,
                        responseType
                );

                if (iaResponse != null) {
                    Boolean esAnomalo = (Boolean) iaResponse.get("es_anomalo");
                    Integer prioridadDinamica = (Integer) iaResponse.get("prioridad_dinamica");
                    String motivo = (String) iaResponse.get("motivo");

                    // 5. Actualizar entidad en MongoDB
                    t.setEsAnomalo(esAnomalo != null ? esAnomalo : false);
                    t.setDynamicPriority(prioridadDinamica != null ? prioridadDinamica : t.getPrioridad());
                    t.setAnomaliaDetalle(motivo != null ? motivo : "Sin detalle");

                    tramiteRepository.save(t);

                    log.info("✅ Trámite {} auditado: Es Anómalo = {}, Prioridad Dinámica = {}", 
                            t.getCodigoTramite(), t.getEsAnomalo(), t.getDynamicPriority());

                    // 6. Notificar en tiempo real vía WebSocket a todo el departamento si hay anomalía
                    if (t.getEsAnomalo() && t.getDepartamentoActualId() != null) {
                        String tituloAlerta = "⚠️ ALERTA: Trámite Estancado (" + t.getCodigoTramite() + ")";
                        String msgAlerta = "El trámite requiere atención inmediata. IA advierte: " + t.getAnomaliaDetalle();
                        notificationService.notificarDepartamento(t.getDepartamentoActualId(), tituloAlerta, msgAlerta);
                        log.info("🔔 Notificación de anomalía SLA enviada por WebSocket a departamento: {}", t.getDepartamentoActualId());
                    }
                }
            } catch (Exception e) {
                log.error("❌ Error al evaluar SLA/Prioridad para trámite {}: {}", t.getCodigoTramite(), e.getMessage());
            }
        }
    }
}
