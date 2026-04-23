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
    private String nodoOrigenId; // Nodo desde donde se generó el evento
    private String nodoDestinoId; // Nodo al que llegó el trámite
    private String nodoDestinoNombre; // Nombre legible (departamento/etapa)
    private String ejecutadoPorUsuarioId; // Referencia <Ref>
    private String ejecutadoPorNombre; // Nombre legible del usuario
    private String motivo; // Opcional: descripción de intervención o rechazo

    private Integer tiempoSLAConsumidoMinutos;
    private Boolean excedioSLA;
    private LocalDateTime slaVencimientoEsperado;

    // Congela un snapshot del formulario JSON en este preciso instante de la
    // historia
    private Map<String, Object> snapshotDatos;

    private TipoEvento tipoEvento;

    // Estos registros son inmutables (Bitácora), carecen de UpdatedAt
    @CreatedDate
    private LocalDateTime createdAt;
}
