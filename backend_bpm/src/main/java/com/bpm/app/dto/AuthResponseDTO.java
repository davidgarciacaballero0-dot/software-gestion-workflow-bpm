package com.bpm.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponseDTO {
    private String id; // ID único de MongoDB
    private String token;
    private String nombre;
    private String apellidos;
    private String email;
    private String ci;
    private String celular;
    private String fechaNacimiento;
    private String createdAt;
    private String idRol;
    private String idOrganizacion;
    private boolean esJefe; // CU-17
    private String nombreRol;
    private String idDepartamento;
}
