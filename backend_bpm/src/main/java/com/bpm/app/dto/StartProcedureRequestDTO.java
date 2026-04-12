package com.bpm.app.dto;

import lombok.Data;
import java.util.Map;

@Data
public class StartProcedureRequestDTO {
    private String idPolitica;
    private String idUsuarioSolicitante;
    private Map<String, Object> datosIniciales;
}
