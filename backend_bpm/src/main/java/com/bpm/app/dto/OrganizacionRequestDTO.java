package com.bpm.app.dto;

import lombok.Data;
import java.util.Map;

@Data
public class OrganizacionRequestDTO {
    private String nombre;
    private Map<String, Object> esquemaColores;
}
