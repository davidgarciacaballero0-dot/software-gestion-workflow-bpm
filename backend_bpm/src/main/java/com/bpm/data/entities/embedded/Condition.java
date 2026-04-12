package com.bpm.data.entities.embedded;

import com.bpm.data.entities.enums.ConditionOperator;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Condition {
    private String variable;
    private ConditionOperator operator;
    private String value;
}
