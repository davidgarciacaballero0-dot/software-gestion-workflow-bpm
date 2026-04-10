package com.bpm.data.entities;

import com.bpm.data.entities.embedded.ActividadNodo;
import com.bpm.data.entities.embedded.Transicion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "politicas_workflow")
public class PoliticaWorkflow {

    @Id
    private String id;
    
    private String idOrganizacion; // Referencia <Ref>
    private String nombre;
    private Float version;
    
    // Lista de documentos embebidos dentro de Mongo (No hay problemas con N+1 Joins)
    private List<ActividadNodo> nodosActividad;
    private List<Transicion> aristasTransicion;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
