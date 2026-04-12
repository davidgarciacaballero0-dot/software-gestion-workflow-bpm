package com.bpm.app.dto;

import lombok.Data;

@Data
public class DepartamentoRequestDTO {
    private String idOrganizacion;
    private String idDepartamentoPadre; // Opcional, puede venir nulo si es el dep. Raíz
    private String nombre;
    private String codigoArea;
    private String idJefe; // Asociar puesto de Jefatura (CU-17)
}
