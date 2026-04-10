package com.bpm.app.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AuditoriaResponseDTO {
    private String id;
    private String idUsuarioActor;
    private String accion;
    private String entidadAfectada;
    private String ipOrigen;
    private LocalDateTime createdAt;
}
