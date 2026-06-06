package com.bpm.app.dto;

import lombok.Data;
import java.util.Map;

@Data
public class AvanzarTramiteRequestDTO {
    private String idTramite;
    private String idUsuarioAccion;
    private String nodoActualId; // Opcional: Especifica cuál de los nodos activos se está completando en ejecución paralela
    private Map<String, Object> datosFormulario;
    private Long version; // CU-23: Versión del trámite para mitigar o forzar resolución de conflictos
}

