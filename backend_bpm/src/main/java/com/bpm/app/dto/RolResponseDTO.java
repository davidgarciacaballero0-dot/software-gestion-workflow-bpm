package com.bpm.app.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class RolResponseDTO {
    private String id;
    private String nombre;
    private List<String> permisos;
    private LocalDateTime createdAt;
}
