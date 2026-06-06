package com.bpm.domain.services;

import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.entities.SugerenciaReasignacion;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.EventoHistorialRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import com.bpm.data.repositories.SugerenciaReasignacionRepository;
import com.bpm.data.repositories.UsuarioRepository;
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
    private final SugerenciaReasignacionRepository sugerenciaRepository;
    private final UsuarioRepository usuarioRepository;

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
                String tempDeptoNombre = "Sin Asignar";
                if (t.getDepartamentoActualId() != null) {
                    tempDeptoNombre = departamentoRepository.findById(t.getDepartamentoActualId())
                            .map(d -> d.getNombre())
                            .orElse("Desconocido");
                }
                final String deptoNombre = tempDeptoNombre;

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

                // === FASE TF: Llamar primero a los modelos TensorFlow para obtener predicciones numéricas ===

                // 3a. LSTM: Predecir horas hasta estancamiento
                double horasEstimadasDL = -1;
                try {
                    Map<String, Object> lstmRequest = new HashMap<>();
                    lstmRequest.put("diasActivo", diasActivo);
                    lstmRequest.put("historial", historialSucesos.stream()
                            .map(h -> Map.of("diasEnNodo", diasActivo, "tipoEvento", "AVANCE", "departamento", deptoNombre))
                            .collect(Collectors.toList()));
                    @SuppressWarnings("unchecked")
                    Map<String, Object> lstmResponse = restTemplate.postForObject(
                            IA_URL.replace("/ia", "") + "/ia/tf/predecir-demora", lstmRequest, 
                            (Class<Map<String, Object>>) (Class<?>) Map.class);
                    if (lstmResponse != null && lstmResponse.get("horas_estimadas") != null) {
                        horasEstimadasDL = ((Number) lstmResponse.get("horas_estimadas")).doubleValue();
                        log.info("🧠 LSTM predice {} horas hasta estancamiento para {}", 
                                String.format("%.1f", horasEstimadasDL), t.getCodigoTramite());
                    }
                } catch (Exception tfErr) {
                    log.warn("⚠️ TF LSTM no disponible para {}: {}", t.getCodigoTramite(), tfErr.getMessage());
                }

                // 3b. Autoencoder: Detectar anomalía por reconstrucción
                boolean anomaliaDL = false;
                double reconstructionError = 0;
                try {
                    Map<String, Object> aeRequest = new HashMap<>();
                    aeRequest.put("diasActivo", diasActivo);
                    aeRequest.put("numEventos", historialSucesos.size());
                    aeRequest.put("numDepartamentos", 1);
                    aeRequest.put("ratioSla", horasRestantes > 0 ? 0.8 : 0.2);
                    aeRequest.put("horasPromedio", diasActivo * 24.0 / Math.max(historialSucesos.size(), 1));
                    aeRequest.put("prioridad", t.getPrioridad() != null ? t.getPrioridad() : 3);
                    aeRequest.put("numArchivos", t.getArchivosAdjuntos() != null ? t.getArchivosAdjuntos().size() : 0);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> aeResponse = restTemplate.postForObject(
                            IA_URL.replace("/ia", "") + "/ia/tf/detectar-anomalia", aeRequest, 
                            (Class<Map<String, Object>>) (Class<?>) Map.class);
                    if (aeResponse != null) {
                        anomaliaDL = Boolean.TRUE.equals(aeResponse.get("es_anomalo"));
                        reconstructionError = aeResponse.get("reconstruction_error") != null 
                                ? ((Number) aeResponse.get("reconstruction_error")).doubleValue() : 0;
                        log.info("🧠 Autoencoder: anomalía={}, error_reconstrucción={} para {}", 
                                anomaliaDL, String.format("%.4f", reconstructionError), t.getCodigoTramite());
                    }
                } catch (Exception tfErr) {
                    log.warn("⚠️ TF Autoencoder no disponible para {}: {}", t.getCodigoTramite(), tfErr.getMessage());
                }

                // 3c. Red de Prioridad: Calcular prioridad dinámica con DL
                int prioridadDL = t.getPrioridad() != null ? t.getPrioridad() : 3;
                try {
                    Map<String, Object> prioRequest = new HashMap<>();
                    prioRequest.put("diasActivo", diasActivo);
                    prioRequest.put("horasRestantesSla", horasRestantes);
                    prioRequest.put("prioridadOriginal", t.getPrioridad() != null ? t.getPrioridad() : 3);
                    prioRequest.put("numEventos", historialSucesos.size());
                    prioRequest.put("departamento", deptoNombre);
                    prioRequest.put("tipoPolitica", t.getIdPolitica() != null ? t.getIdPolitica() : "");
                    prioRequest.put("numArchivos", t.getArchivosAdjuntos() != null ? t.getArchivosAdjuntos().size() : 0);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> prioResponse = restTemplate.postForObject(
                            IA_URL.replace("/ia", "") + "/ia/tf/calcular-prioridad", prioRequest, 
                            (Class<Map<String, Object>>) (Class<?>) Map.class);
                    if (prioResponse != null && prioResponse.get("prioridad") != null) {
                        prioridadDL = ((Number) prioResponse.get("prioridad")).intValue();
                        log.info("🧠 Red Prioridad: prioridad_dinamica={} para {}", prioridadDL, t.getCodigoTramite());
                    }
                } catch (Exception tfErr) {
                    log.warn("⚠️ TF Priority Network no disponible para {}: {}", t.getCodigoTramite(), tfErr.getMessage());
                }

                // Enriquecer request para Gemini con predicciones TF
                request.put("horasEstimadasDL", horasEstimadasDL);
                request.put("anomaliaDL", anomaliaDL);
                request.put("reconstructionErrorDL", reconstructionError);
                request.put("prioridadDL", prioridadDL);

                // === FIN FASE TF ===

                // 4. Invocar Gemini para análisis narrativo (enriquecido con datos TF)
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

        // RF-3.4: Detectar sobrecarga departamental y generar sugerencias de reasignación
        detectarSobrecargaYSugerir(tramitesActivos);
    }

    // ===============================================================
    // RF-3.4: Reasignación Semi-automática de Recursos
    // ===============================================================

    private void detectarSobrecargaYSugerir(List<TramiteInstancia> tramitesActivos) {
        try {
            // 1. Agrupar trámites por departamento
            Map<String, List<TramiteInstancia>> porDepto = tramitesActivos.stream()
                    .filter(t -> t.getDepartamentoActualId() != null)
                    .collect(Collectors.groupingBy(TramiteInstancia::getDepartamentoActualId));

            // 2. Calcular capacidad vs carga
            Map<String, Integer> capacidad = new HashMap<>();   // deptoId -> num funcionarios
            Map<String, Integer> carga = new HashMap<>();       // deptoId -> num tramites activos
            Map<String, String> nombres = new HashMap<>();      // deptoId -> nombre

            departamentoRepository.findAll().forEach(d -> {
                int personal = usuarioRepository.findByIdDepartamento(d.getId()).size();
                capacidad.put(d.getId(), Math.max(personal, 1)); // mínimo 1 para evitar división por 0
                carga.put(d.getId(), porDepto.getOrDefault(d.getId(), List.of()).size());
                nombres.put(d.getId(), d.getNombre());
            });

            // 3. Detectar departamentos sobrecargados (>120% de su capacidad × ratio)
            int ratioTramitesPorPersona = 5; // Umbral: 5 trámites por persona es "carga normal"
            List<String> sobrecargados = new java.util.ArrayList<>();
            List<String> subcargados = new java.util.ArrayList<>();

            for (Map.Entry<String, Integer> entry : capacidad.entrySet()) {
                String deptoId = entry.getKey();
                int cap = entry.getValue();
                int tramiteCount = carga.getOrDefault(deptoId, 0);
                double ratio = (double) tramiteCount / (cap * ratioTramitesPorPersona);

                if (ratio > 1.2) {
                    sobrecargados.add(deptoId);
                } else if (ratio < 0.6) {
                    subcargados.add(deptoId);
                }
            }

            if (sobrecargados.isEmpty() || subcargados.isEmpty()) {
                return; // No hay desequilibrio que corregir
            }

            // 4. Generar sugerencias: mover trámites de mayor prioridad dinámica a departamentos menos cargados
            for (String deptoSobrecargado : sobrecargados) {
                List<TramiteInstancia> tramitesDepto = porDepto.getOrDefault(deptoSobrecargado, List.of());
                
                // Seleccionar los trámites de menor prioridad (candidatos a reubicar)
                List<TramiteInstancia> candidatos = tramitesDepto.stream()
                        .sorted((a, b) -> {
                            int pa = a.getDynamicPriority() != null ? a.getDynamicPriority() : a.getPrioridad() != null ? a.getPrioridad() : 3;
                            int pb = b.getDynamicPriority() != null ? b.getDynamicPriority() : b.getPrioridad() != null ? b.getPrioridad() : 3;
                            return Integer.compare(pa, pb);
                        })
                        .limit(3) // Máximo 3 sugerencias por departamento sobrecargado
                        .collect(Collectors.toList());

                String deptoDestino = subcargados.get(0); // Primero el menos cargado

                for (TramiteInstancia candidato : candidatos) {
                    // Verificar que no exista ya una sugerencia pendiente para este trámite
                    boolean yaExiste = sugerenciaRepository.findByEstado("PENDIENTE").stream()
                            .anyMatch(s -> candidato.getId().equals(s.getTramiteId()));
                    if (yaExiste) continue;

                    SugerenciaReasignacion sugerencia = SugerenciaReasignacion.builder()
                            .tramiteId(candidato.getId())
                            .codigoTramite(candidato.getCodigoTramite())
                            .departamentoOrigenId(deptoSobrecargado)
                            .departamentoOrigenNombre(nombres.getOrDefault(deptoSobrecargado, "Desconocido"))
                            .departamentoDestinoId(deptoDestino)
                            .departamentoDestinoNombre(nombres.getOrDefault(deptoDestino, "Desconocido"))
                            .motivo(String.format("Departamento '%s' sobrecargado (%d trámites, %d personal). Se sugiere redistribuir a '%s' (carga baja).",
                                    nombres.getOrDefault(deptoSobrecargado, ""),
                                    carga.getOrDefault(deptoSobrecargado, 0),
                                    capacidad.getOrDefault(deptoSobrecargado, 0),
                                    nombres.getOrDefault(deptoDestino, "")))
                            .prioridadDinamica(candidato.getDynamicPriority() != null ? candidato.getDynamicPriority() : 3)
                            .ratioSobrecarga((double) carga.getOrDefault(deptoSobrecargado, 0) / (capacidad.getOrDefault(deptoSobrecargado, 1) * ratioTramitesPorPersona))
                            .estado("PENDIENTE")
                            .creadaPor("IA_SCHEDULER")
                            .createdAt(LocalDateTime.now())
                            .build();

                    sugerenciaRepository.save(sugerencia);
                    log.info("💡 Sugerencia de reasignación creada: Trámite {} de {} → {}",
                            candidato.getCodigoTramite(),
                            nombres.getOrDefault(deptoSobrecargado, ""),
                            nombres.getOrDefault(deptoDestino, ""));

                    // Notificar al supervisor del departamento sobrecargado
                    notificationService.notificarDepartamento(deptoSobrecargado,
                            "💡 Sugerencia de Reasignación",
                            String.format("La IA sugiere redistribuir el trámite %s a %s por sobrecarga.",
                                    candidato.getCodigoTramite(), nombres.getOrDefault(deptoDestino, "")));
                }
            }
        } catch (Exception e) {
            log.error("❌ Error en detección de sobrecarga departamental: {}", e.getMessage());
        }
    }
}
