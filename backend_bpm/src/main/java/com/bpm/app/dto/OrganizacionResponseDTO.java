package com.bpm.app.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class OrganizacionResponseDTO {
    private String id;
    private String nombre;
    private Map<String, Object> esquemaColores;
    
    // Devolvemos la fecha formateada en el DTO sin exponer metadatos
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
