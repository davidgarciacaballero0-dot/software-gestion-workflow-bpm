package com.bpm.app.dto;

import com.bpm.data.entities.embedded.WorkflowEdge;
import com.bpm.data.entities.embedded.WorkflowNode;
import com.bpm.data.entities.enums.PolicyStatus;
import lombok.Data;

import java.util.List;

@Data
public class WorkflowRequestDTO {
    private String idOrganizacion;
    private String nombre;
    private String description;
    private String version;
    private PolicyStatus status;
    private List<WorkflowNode> nodes;
    private List<WorkflowEdge> edges;
}
