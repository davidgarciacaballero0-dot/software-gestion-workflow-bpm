package com.bpm.data.entities.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowEdge {
    private String id;
    private String sourceNodeId;
    private String targetNodeId;
    private Condition condition; // Opcional, solo si el source es un EXCLUSIVE_GATEWAY
}
