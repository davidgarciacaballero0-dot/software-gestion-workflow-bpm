package com.bpm.app.dto;

import lombok.Data;

/**
 * DTO para el auto-registro público de un nuevo Cliente.
 * Usado exclusivamente por el endpoint POST /api/v1/auth/register.
 * El rol "CLIENTE" se asigna automáticamente en el backend,
 * idOrganizacion e idDepartamento quedan null (cliente externo).
 */
@Data
public class RegisterRequestDTO {
    private String nombre;
    private String apellidos;
    private String ci;
    private String celular;
    private String email;
    private String password;  // Se recibe en plano, se hashea con BCrypt en el backend
    private String fechaNacimiento; // Formato ISO: "YYYY-MM-DDTHH:mm:ss"
}
