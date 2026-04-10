package com.bpm.data.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "auditoria_sistema")
public class AuditoriaSistema {

    @Id
    private String id;

    private String idUsuarioActor; // Referencia <Ref>
    private String accion;
    private String entidadAfectada;
    private String ipOrigen;

    @CreatedDate
    private LocalDateTime createdAt;
}
