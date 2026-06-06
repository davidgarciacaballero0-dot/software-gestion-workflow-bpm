package com.bpm.data.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

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
    private String gridFsId; // ID de referencia en MongoDB GridFS
    private String contentType;
    private Long tamano;

    @CreatedDate
    private LocalDateTime createdAt;

    @org.springframework.data.annotation.LastModifiedDate
    private LocalDateTime updatedAt;

    // --- NUEVOS CAMPOS FASE 2: GESTIÓN DOCUMENTAL ---
    private String idPolitica;        // Referencia para queries por política
    private String idCliente;         // Referencia para queries por cliente (idUsuarioSolicitante)
    private String tipoDocumento;     // GENERAL, CONTRATO, REQUISITO, INFORME
    private String departamentoOrigenId; // Departamento que subió el archivo
    private List<DocumentPermission> permisos; // ACL granular

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DocumentPermission {
        private String sujetoId;    // userId o rolName o departamentoId
        private String tipoSujeto;  // USER, ROLE, DEPARTMENT
        private String nivel;       // READ, WRITE, ADMIN
    }
}
