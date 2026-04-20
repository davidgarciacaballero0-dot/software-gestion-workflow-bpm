package com.bpm.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DesignerEventDTO {
    private String idPolitica;
    private String eventType; // "NODE_MOVED", "NODE_ADDED", "EDGE_ADDED", etc.
    private String senderId;
    private Object payload; // The node or edge data
}
