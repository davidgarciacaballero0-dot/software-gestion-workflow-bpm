package com.bpm.app.controllers;

import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {

    private final TramiteInstanciaRepository tramiteRepository;

    @Autowired
    public SyncController(TramiteInstanciaRepository tramiteRepository) {
        this.tramiteRepository = tramiteRepository;
    }

    /**
     * Recibe un lote de operaciones guardadas offline (Flutter/PWA)
     * y las aplica secuencialmente.
     */
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> syncBatch(@RequestBody List<SyncOperation> operations) {
        List<String> successIds = new ArrayList<>();
        List<String> failedIds = new ArrayList<>();

        for (SyncOperation op : operations) {
            try {
                if ("UPDATE_TRAMITE".equals(op.getType())) {
                    TramiteInstancia tramite = tramiteRepository.findById(op.getTargetId()).orElse(null);
                    if (tramite != null) {
                        // Conflict resolution rule: Last write wins (or we could use vector clocks)
                        // In this basic version we just override the state
                        tramite.setEstadoActual(op.getPayload().get("estadoActual").toString());
                        tramite.setUpdatedAt(LocalDateTime.now());
                        tramiteRepository.save(tramite);
                        successIds.add(op.getId());
                    } else {
                        failedIds.add(op.getId());
                    }
                } else if ("CREATE_TRAMITE".equals(op.getType())) {
                    // Logic to create tramite
                    // ...
                    successIds.add(op.getId());
                } else {
                    failedIds.add(op.getId());
                }
            } catch (Exception e) {
                System.err.println("Error procesando sync op " + op.getId() + ": " + e.getMessage());
                failedIds.add(op.getId());
            }
        }

        return ResponseEntity.ok(Map.of(
                "successCount", successIds.size(),
                "failedCount", failedIds.size(),
                "successIds", successIds,
                "failedIds", failedIds
        ));
    }

    @lombok.Data
    public static class SyncOperation {
        private String id;       // UUID de la operación en el cliente
        private String type;     // CREATE_TRAMITE, UPDATE_TRAMITE, UPLOAD_FILE
        private String targetId; // ID de la entidad afectada
        private Map<String, Object> payload; // Datos
        private Long timestamp;  // Client timestamp
    }
}
