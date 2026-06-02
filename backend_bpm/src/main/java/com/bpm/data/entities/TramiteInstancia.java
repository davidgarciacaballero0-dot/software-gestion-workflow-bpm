package com.bpm.data.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tramites_instancias")
public class TramiteInstancia {

    @Id
    private String id;
    
    @Version
    private Long version; // CU-23: Optimistic Locking para resolver conflictos offline

    private String codigoTramite; // Ej: TRM-2026-0001
    private String idPolitica; // Referencia <Ref> al molde del Workflow
    private String idUsuarioSolicitante; // Referencia <Ref>
    
    private String estadoActual;
    private String nodoActualId; 
    private String departamentoActualId;
    
    private java.util.List<String> nodosActualesIds;
    private java.util.List<String> departamentosActualesIds;
    
    private String ciSolicitante; // Denormalizado para busqueda rapida
    private String nombreSolicitante; // Denormalizado para visualizacion inmediata
    private String funcionarioAsignadoId; // ID del funcionario que lo atiende actualmente
    
    private Integer prioridad; // REQ-06: 1 (Baja) a 5 (Critica)
    
    private Integer dynamicPriority; // CU-29: Prioridad dinámica calculada asíncronamente
    private Boolean esAnomalo; // CU-30: Indica si el trámite tiene riesgo de estancamiento
    private String anomaliaDetalle; // CU-30: Detalle predictivo de la anomalía
    
    // Todos los campos dinámicos acumulados en el formulario en tiempo real
    private Map<String, Object> datosAcumuladosFormulario;
    private Map<String, String> archivosAdjuntos; // NUEVO: Gestión Documental (Requirement -> FileReference)
    private java.util.List<Map<String, Object>> documentosDinamicosRequeridos; // CU-27: Documentos exigidos dinámicamente por la IA

    private LocalDateTime fechaInicioNodoActual;
    private LocalDateTime fechaVencimientoSla;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;

}
