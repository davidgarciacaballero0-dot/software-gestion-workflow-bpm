package com.bpm.data.entities;

import com.bpm.data.entities.enums.TipoInsight;
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
@Document(collection = "alertas_insight_ia")
public class AlertaInsightIA {

    @Id
    private String id;

    private String idDepartamentoAfectado; // Referencia <Ref>
    private String mensaje;
    private TipoInsight tipoInsight;

    @CreatedDate
    private LocalDateTime createdAt;
}
