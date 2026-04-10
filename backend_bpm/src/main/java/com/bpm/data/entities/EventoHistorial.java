package com.bpm.data.entities;

import com.bpm.data.entities.enums.TipoEvento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "eventos_historial")
public class EventoHistorial {

    @Id
    private String id;

    private String idTramite; // Referencia <Ref> a TramiteInstancia
    private String nodoDestinoId; 
    private String ejecutadoPorUsuarioId; // Referencia <Ref>
    
    private Integer tiempoSLAConsumidoMinutos; 
    
    // Congela un snapshot del formulario JSON en este preciso instante de la historia
    private Map<String, Object> snapshotDatos;
    
    private TipoEvento tipoEvento;

    // Estos registros son inmutables (Bitácora), carecen de UpdatedAt
    @CreatedDate
    private LocalDateTime createdAt;
}
