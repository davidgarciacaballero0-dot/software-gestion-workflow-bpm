package com.bpm.data.entities;

import com.bpm.data.entities.embedded.WorkflowNode;
import com.bpm.data.entities.embedded.WorkflowEdge;
import com.bpm.data.entities.enums.PolicyStatus;
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
    
    private String idOrganizacion; // Referencia
    private String nombre;
    private String description;
    private String version;
    private PolicyStatus status; // DRAFT, PUBLISHED, ARCHIVED
    
    // Nodos y Conexiones del Lienzo
    private List<WorkflowNode> nodes;
    private List<WorkflowEdge> edges;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
