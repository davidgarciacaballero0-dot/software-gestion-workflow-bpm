package com.bpm.app.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class TramiteResponseDTO {
    private String id;
    private String codigoTramite;
    private String idPolitica;
    private String idUsuarioSolicitante;
    private String ciSolicitante;
    private String nombreSolicitante;
    private String funcionarioAsignadoId;
    private String nombrePolitica;
    private String estadoActual;
    private String nodoActualId;
    private String nombreNodoActual;
    private String departamentoActualId;
    private String nombreDepartamentoActual;
    private Integer prioridad;
    private Map<String, Object> datosAcumuladosFormulario;
    private LocalDateTime createdAt;
}
