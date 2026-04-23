package com.bpm.app.dto;

import lombok.Data;

@Data
public class UsuarioRequestDTO {
    private String idOrganizacion;
    private String idDepartamento;
    private String idRol;
    
    private String nombre;
    private String ci;
    private String celular;
    private String email;
    private String password; // Ingresa en plano desde el Front, muere en el Service encriptado.
}
