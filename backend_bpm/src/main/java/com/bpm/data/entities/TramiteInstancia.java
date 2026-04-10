package com.bpm.data.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
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
    
    private String codigoTramite; // Ej: TRM-2026-0001
    private String idPolitica; // Referencia <Ref> al molde del Workflow
    private String idUsuarioSolicitante; // Referencia <Ref>
    
    private String estadoActual;
    private String nodoActualId; // Ubicacion exacta dentro del BPMN
    private String departamentoActualId; // Util para mostrarlo rapidísimo en las Bandejas de Entrada (WebSockets)
    
    // Todos los campos dinámicos acumulados en el formulario en tiempo real
    private Map<String, Object> datosAcumuladosFormulario;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
