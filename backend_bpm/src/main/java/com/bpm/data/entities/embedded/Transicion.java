package com.bpm.data.entities.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transicion {
    private String idTransicion;
    private String origenNodoId;
    private String destinoNodoId;
    private String condicionLogica;
}
