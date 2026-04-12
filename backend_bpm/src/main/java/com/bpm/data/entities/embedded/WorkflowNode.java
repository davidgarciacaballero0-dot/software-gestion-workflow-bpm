package com.bpm.data.entities.embedded;

import com.bpm.data.entities.enums.NodeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowNode {
    private String id;
    private NodeType type;
    private String name;
    private String departmentId; // Solo para USER_TASK
    private Integer slaHours; // CU-19
    private UIPosition uiPosition;
    private List<FormFieldDefinition> formDefinition; // CU-06
}
