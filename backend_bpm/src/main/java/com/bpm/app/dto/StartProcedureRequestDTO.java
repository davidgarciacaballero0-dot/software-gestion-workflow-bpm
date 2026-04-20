package com.bpm.app.dto;

import lombok.Data;
import java.util.Map;

@Data
public class StartProcedureRequestDTO {
    private String idPolitica;
    private String idUsuarioSolicitante;
    private Integer prioridad; // Opcional, 1-5
    private Map<String, Object> datosIniciales;
}
