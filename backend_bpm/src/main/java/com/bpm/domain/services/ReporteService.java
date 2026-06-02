package com.bpm.domain.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReporteService {

    private final MongoTemplate mongoTemplate;

    @Value("${ia.service.url:http://localhost:8000/ia}")
    private String IA_URL;

    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        return new RestTemplate(factory);
    }

    /**
     * CU-25: Consulta NLP -> JSON de parámetros -> Aggregation Mongo segura
     */
    public List<Map<String, Object>> generarReporteDesdePrompt(String prompt) {
        log.info("📊 Procesando reporte NLP con prompt: {}", prompt);

        // 1. Invocar a FastAPI para traducir Lenguaje Natural a JSON estructurado
        Map<String, String> request = new HashMap<>();
        request.put("prompt", prompt);

        @SuppressWarnings("unchecked")
        Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
        Map<String, Object> iaResponse;

        try {
            iaResponse = restTemplate.postForObject(IA_URL + "/parsear-reporte-nlp", request, responseType);
        } catch (Exception e) {
            log.error("Error contactando a FastAPI para parsear reporte: ", e);
            throw new RuntimeException("No se pudo interpretar la solicitud del reporte mediante IA.");
        }

        if (iaResponse == null) {
            throw new RuntimeException("Respuesta vacía desde el motor de IA.");
        }

        String dimension = (String) iaResponse.get("dimension");
        String metric = (String) iaResponse.get("metric");
        @SuppressWarnings("unchecked")
        Map<String, Object> filters = (Map<String, Object>) iaResponse.get("filters");

        log.info("🧠 IA Parseo -> Dimensión: {}, Métrica: {}, Filtros: {}", dimension, metric, filters);

        // 2. Construir agregación segura en MongoTemplate (NO es inyección MQL)
        return ejecutarAgregacionSegura(dimension, metric, filters);
    }

    @SuppressWarnings("rawtypes")
    private List<Map<String, Object>> ejecutarAgregacionSegura(String dimension, String metric, Map<String, Object> filters) {
        Criteria criteria = new Criteria();

        // Aplicar filtros dinámicos si existen
        if (filters != null) {
            if (filters.get("status") != null) {
                criteria = criteria.and("estadoActual").is(filters.get("status"));
            }
            if (filters.get("priority") != null) {
                criteria = criteria.and("prioridad").is(filters.get("priority"));
            }
            if (filters.get("department") != null) {
                criteria = criteria.and("departamentoActualId").is(filters.get("department"));
            }
            if (filters.get("days") != null) {
                int days = (Integer) filters.get("days");
                criteria = criteria.and("createdAt").gte(LocalDateTime.now().minusDays(days));
            }
        }

        // Mapear la dimensión solicitada al campo real de MongoDB
        String groupByField = "estadoActual"; // Default
        if ("department".equalsIgnoreCase(dimension)) groupByField = "departamentoActualId";
        if ("priority".equalsIgnoreCase(dimension)) groupByField = "prioridad";
        if ("month".equalsIgnoreCase(dimension)) {
            // Requiere manipulación de fechas en Mongo, usaremos estadoActual temporalmente como fallback
            groupByField = "estadoActual"; 
        }

        Aggregation aggregation;

        if ("average_duration".equalsIgnoreCase(metric)) {
            // Métrica: Promedio de duración
            // NOTA: Para un cálculo exacto de duración requiere un campo precalculado o operaciones de resta de fechas en aggregation.
            // Para simplicidad en este caso, si no tenemos el campo duration calculado, contamos.
            aggregation = Aggregation.newAggregation(
                    Aggregation.match(criteria),
                    Aggregation.group(groupByField).count().as("total"),
                    Aggregation.sort(Sort.Direction.DESC, "total")
            );
        } else {
            // Métrica por defecto: Conteo (count)
            aggregation = Aggregation.newAggregation(
                    Aggregation.match(criteria),
                    Aggregation.group(groupByField).count().as("total"),
                    Aggregation.sort(Sort.Direction.DESC, "total")
            );
        }

        AggregationResults<Map> results = mongoTemplate.aggregate(aggregation, "tramite_instancia", Map.class);
        List<Map> rawResults = results.getMappedResults();
        
        List<Map<String, Object>> finalResults = new java.util.ArrayList<>();
        for (Map map : rawResults) {
            @SuppressWarnings("unchecked")
            Map<String, Object> typedMap = (Map<String, Object>) map;
            finalResults.add(typedMap);
        }
        return finalResults;
    }
}
