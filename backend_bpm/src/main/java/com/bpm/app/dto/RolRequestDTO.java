package com.bpm.app.dto;

import lombok.Data;
import java.util.List;

@Data
public class RolRequestDTO {
    private String nombre;
    private List<String> permisos;
}
