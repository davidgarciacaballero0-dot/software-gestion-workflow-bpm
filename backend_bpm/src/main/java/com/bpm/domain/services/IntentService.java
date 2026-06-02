package com.bpm.domain.services;

import com.bpm.data.entities.PoliticaWorkflow;
import com.bpm.data.entities.enums.PolicyStatus;
import com.bpm.data.repositories.PoliticaWorkflowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntentService {

    private final PoliticaWorkflowRepository politicaRepository;

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
     * CU-26: Asignar Política de Negocio mediante Análisis de Intención (Embeddings)
     */
    public Map<String, Object> asignarPoliticaPorIntencion(String requerimiento) {
        log.info("🔍 Analizando intención de política para: {}", requerimiento);

        // 1. Obtener todas las políticas publicadas
        List<PoliticaWorkflow> politicasActivas = politicaRepository.findAll().stream()
                .filter(p -> p.getStatus() == PolicyStatus.PUBLISHED)
                .toList();

        if (politicasActivas.isEmpty()) {
            throw new RuntimeException("No hay políticas publicadas disponibles para asignar.");
        }

        // 2. Construir payload para FastAPI
        Map<String, Object> request = new HashMap<>();
        request.put("requerimiento", requerimiento);
        request.put("politicas", politicasActivas);

        @SuppressWarnings("unchecked")
        Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
        Map<String, Object> iaResponse;

        try {
            iaResponse = restTemplate.postForObject(IA_URL + "/analisis-intencion-politica", request, responseType);
        } catch (Exception e) {
            log.error("Error contactando a FastAPI para análisis de intención: ", e);
            throw new RuntimeException("No se pudo interpretar la intención mediante IA.");
        }

        if (iaResponse == null) {
            throw new RuntimeException("Respuesta vacía del motor de IA (embeddings).");
        }

        return iaResponse; // Retorna { "politica_asignada": {...}, "score": 0.85, "metodo": "embeddings..." }
    }
}
