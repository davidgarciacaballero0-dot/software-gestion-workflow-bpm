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
@Document(collection = "bitacora_accesos_documentos")
public class BitacoraAcceso {

    @Id
    private String id;

    private String username;
    private String role;
    private String action; // LECTURA, CREACION, MODIFICACION, ELIMINACION
    private String resource; // e.g. "Expediente", "Documento"
    private String resourceId;
    private String details;
    private String ipAddress;

    @CreatedDate
    private LocalDateTime timestamp;
}
