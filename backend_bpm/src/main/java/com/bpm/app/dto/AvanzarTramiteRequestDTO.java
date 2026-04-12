package com.bpm.app.dto;

import lombok.Data;
import java.util.Map;

@Data
public class AvanzarTramiteRequestDTO {
    private String idTramite;
    private String idUsuarioAccion;
    private Map<String, Object> datosFormulario;
}
