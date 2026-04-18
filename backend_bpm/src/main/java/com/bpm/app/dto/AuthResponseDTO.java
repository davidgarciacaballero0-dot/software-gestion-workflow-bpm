package com.bpm.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponseDTO {
    private String token;
    private String nombre;
    private String idRol;
    private String idOrganizacion;
    private boolean esJefe; // CU-17
    private String nombreRol;
    private String idDepartamento;
}
