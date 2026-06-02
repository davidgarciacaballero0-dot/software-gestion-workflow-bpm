package com.bpm.app.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class TramiteResponseDTO {
    private String id;
    private String codigoTramite;
    private String idPolitica;
    private String idUsuarioSolicitante;
    private String ciSolicitante;
    private String nombreSolicitante;
    private String funcionarioAsignadoId;
    private String nombrePolitica;
    private String estadoActual;
    private String nodoActualId;
    private String nombreNodoActual;
    private String departamentoActualId;
    private String nombreDepartamentoActual;
    
    private java.util.List<String> nodosActualesIds;
    private java.util.List<String> departamentosActualesIds;
    private java.util.List<String> nombresNodosActuales;
    private java.util.List<String> nombresDepartamentosActuales;
    private Integer prioridad;
    private Integer dynamicPriority;
    private Boolean esAnomalo;
    private String anomaliaDetalle;
    
    private Map<String, Object> datosAcumuladosFormulario;
    private Map<String, String> archivosAdjuntos;
    private java.util.List<Map<String, Object>> documentosDinamicosRequeridos;
    private LocalDateTime createdAt;
}
