package com.bpm.data.entities.embedded;

import com.bpm.data.entities.enums.TipoActividad;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActividadNodo {
    private String idNodo;
    private String idDepartamentoResponsable; // Referencia <Ref> al id del departamento
    private Integer tiempoSLA_Horas;
    
    // Esquema de JSON para Dynamic Form Builder Forms
    private Map<String, Object> formularioEsquema; 
    
    private TipoActividad tipo;
}
