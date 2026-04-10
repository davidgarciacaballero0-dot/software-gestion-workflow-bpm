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
@Document(collection = "archivos_adjuntos")
public class ArchivoAdjunto {

    @Id
    private String id;

    private String idTramiteInstancia; // Referencia <Ref>
    private String idUsuarioSubida; // Referencia <Ref>
    
    private String nombreOriginal;
    private String urlAlmacenamientoS3; // Bucket Storage

    @CreatedDate
    private LocalDateTime createdAt;
}
