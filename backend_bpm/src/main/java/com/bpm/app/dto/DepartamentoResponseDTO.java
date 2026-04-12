package com.bpm.app.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class DepartamentoResponseDTO {
    private String id;
    private String idOrganizacion;
    private String idDepartamentoPadre;
    private String nombre;
    private String codigoArea;
    private String idJefe;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
