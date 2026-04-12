package com.bpm.data.entities.embedded;

import com.bpm.data.entities.enums.FormFieldType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Define la estructura de un campo en un formulario de tarea de usuario.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormFieldDefinition {
    private String fieldId;
    private String label;
    private FormFieldType type;
    private Boolean required;
    private List<String> options; // Solo relevante si el tipo es DROPDOWN
}
