package com.bpm.app.dto;

import lombok.Data;

@Data
public class IntervencionRequestDTO {
    private String idTramite;
    private String nuevoNodoId;
    private String nuevoDepartamentoId;
    private String motivo;
    private String usuarioInterventorId;
}
