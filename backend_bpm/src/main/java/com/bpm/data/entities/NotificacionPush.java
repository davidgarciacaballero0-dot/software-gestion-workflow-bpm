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
@Document(collection = "notificaciones_push")
public class NotificacionPush {

    @Id
    private String id;

    private String idUsuarioDestino; // Referencia <Ref>
    private String titulo;
    private String mensaje;
    private Boolean leida;

    @CreatedDate
    private LocalDateTime createdAt;
}
