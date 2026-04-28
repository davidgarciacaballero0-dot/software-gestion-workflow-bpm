package com.bpm.app.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UsuarioResponseDTO {
    private String id;
    private String idOrganizacion;
    private String idDepartamento;
    private String idRol;

    private String nombre;
    private String ci;
    private String celular;
    private String email;
    // IMPORTANTE: Por normativa de seguridad NO SE DEVUELVE JAMÁS EL PASSWORD HASH

    private LocalDateTime createdAt;
}
