package com.bpm.app.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class TramiteResponseDTO {
    private String id;
    private String codigoTramite;
    private String nombrePolitica;
    private String estadoActual;
    private String nodoActualId;
    private String departamentoActualId;
    private Integer prioridad;
    private LocalDateTime createdAt;
}
