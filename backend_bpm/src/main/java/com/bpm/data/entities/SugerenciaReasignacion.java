package com.bpm.data.entities;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * RF-3.4: Sugerencia de reasignación generada por la IA cuando detecta
 * que un departamento está sobrecargado.
 */
@Document(collection = "sugerencia_reasignacion")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SugerenciaReasignacion {

    @Id
    private String id;

    private String tramiteId;
    private String codigoTramite;

    private String departamentoOrigenId;
    private String departamentoOrigenNombre;

    private String departamentoDestinoId;
    private String departamentoDestinoNombre;

    private String motivo;
    private int prioridadDinamica;
    private double ratioSobrecarga;  // e.g. 1.35 = 135% de capacidad

    /** PENDIENTE, APROBADA, RECHAZADA */
    private String estado;

    private String creadaPor;     // "IA_SCHEDULER"
    private String resueltaPor;   // nombre del supervisor que aprobó/rechazó

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
