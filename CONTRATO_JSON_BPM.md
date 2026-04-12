# 📄 Contrato JSON: Flujo de Trabajo y Formularios Dinámicos (CU-05 y CU-06)

Este documento define la estructura de datos (Data Transfer Objects - DTOs) que el Frontend (Lienzo Drag & Drop Angular) debe enviar al Backend (Spring Boot) para persistir una Política de Negocio en MongoDB.

## Arquitectura del Documento (Jerarquía)
El JSON principal se compone de metadatos básicos de la política, una lista de **nodos** (pasos del proceso) y una lista de **conexiones** (edges/caminos).

### JSON Payload Completo (SavePolicyRequestDTO)

```json
{
  "id": "60d5ecb8b311fc2b4c123456",            // Null si es nueva política (Creación)
  "name": "Aprobación de Crédito Hipotecario", // Nombre del flujo (CU-04)
  "description": "Flujo para validar y aprobar solicitudes de crédito",
  "version": "1.0",                          // Controlado por CU-18
  "status": "DRAFT",                         // DRAFT, PUBLISHED, ARCHIVED
  "nodes": [
    {
      "id": "node_start_1",
      "type": "START",
      "name": "Inicio del Trámite",
      "uiPosition": { "x": 100, "y": 250 }     // Metadatos para el renderizado del lienzo (Angular)
    },
    {
      "id": "node_task_2",
      "type": "USER_TASK",
      "name": "Revisión Documental",
      "departmentId": "dept_riesgos_01",       // ID del departamento que atenderá este paso
      "slaHours": 48,                          // SLA en horas (CU-19)
      "uiPosition": { "x": 300, "y": 250 },
      "formDefinition": [                      // Formulario dinámico asociado a este paso (CU-06)
        {
          "fieldId": "f_cedula",
          "label": "Cédula de Identidad",
          "type": "TEXT",                      // TEXT, NUMBER, DATE, FILE, DROPDOWN, BOOLEAN
          "required": true,
          "options": []                        // Solo si es DROPDOWN
        },
        {
          "fieldId": "f_respaldo_ingresos",
          "label": "Certificado de Ingresos",
          "type": "FILE",
          "required": true,
          "options": []
        }
      ]
    },
    {
      "id": "node_gateway_3",
      "type": "EXCLUSIVE_GATEWAY",
      "name": "Decisión de Aprobación",
      "uiPosition": { "x": 550, "y": 250 }
    },
    {
      "id": "node_task_4",
      "type": "USER_TASK",
      "name": "Desembolso Fiduciario",
      "departmentId": "dept_finanzas_02",
      "slaHours": 24,
      "uiPosition": { "x": 800, "y": 150 },
      "formDefinition": []
    },
    {
      "id": "node_end_5",
      "type": "END",
      "name": "Fin - Rechazado",
      "uiPosition": { "x": 800, "y": 350 }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "sourceNodeId": "node_start_1",
      "targetNodeId": "node_task_2"
    },
    {
      "id": "edge_2",
      "sourceNodeId": "node_task_2",
      "targetNodeId": "node_gateway_3"
    },
    {
      "id": "edge_3",
      "sourceNodeId": "node_gateway_3",
      "targetNodeId": "node_task_4",
      "condition": {                           // Condición explícita si sale de un Gateway Condicional
        "variable": "decision_riesgo",       // Basado en algún campo del formulario previo o variable de entorno
        "operator": "EQUALS",                  // EQUALS, GREATER_THAN, LESS_THAN
        "value": "APROBADO"
      }
    },
    {
      "id": "edge_4",
      "sourceNodeId": "node_gateway_3",
      "targetNodeId": "node_end_5",
      "condition": {
        "variable": "decision_riesgo",
        "operator": "EQUALS",
        "value": "RECHAZADO"
      }
    }
  ]
}
```

---

## 🚀 Inicio de Trámite (CU-07)

Cuando un usuario desea iniciar un proceso basado en una política publicada, el Frontend debe enviar una petición simplificada. El motor se encarga de clonar la estructura y posicionar el trámite en el primer paso operativo.

### Petición de Inicio (StartProcedureRequestDTO)
```json
{
  "idPolitica": "60d5ecb8b311fc2b4c123456",
  "idUsuarioSolicitante": "user_001",
  "datosIniciales": {                    // Datos opcionales capturados en el trigger de inicio
    "motivo": "Solicitud de crédito personal"
  }
}
```

### Respuesta de Instancia (TramiteResponseDTO)
```json
{
  "id": "inst_789456123",
  "codigoTramite": "TRM-2026-0001",
  "nombrePolitica": "Aprobación de Crédito Hipotecario",
  "estadoActual": "EN_PROGRESO",
  "nodoActualId": "node_task_2",        // ID del primer nodo operativo (USER_TASK)
  "departamentoActualId": "dept_riesgos_01",
  "createdAt": "2026-04-12T17:35:00Z"
}
```

---

---

## Detalle de Entidades (Java Spring Boot DTOs Equivalentes)

### 1. NodeType (Enum)
- `START`: Inicio del flujo. Solo puede haber uno activo por política.
- `USER_TASK`: Tarea humana o formulario que debe llenar un funcionario de un departamento.
- `SYSTEM_TASK`: Ejecuta alguna acción automática (ej. llamar a un API, enviar correo).
- `EXCLUSIVE_GATEWAY`: Condicional genérico (IF/ELSE). Solo un camino subsiguiente es elegido.
- `PARALLEL_GATEWAY`: Divide el flujo para que dos o más departamentos trabajen a la vez.
- `END`: Nodo de finalización del trámite.

### 2. FormFieldType (Enum)
- `TEXT`: Input de texto libre.
- `NUMBER`: Valor numérico (útil para condicionales matemáticos).
- `DATE`: Selector de fecha.
- `BOOLEAN`: Checkbox / Switch (Sí/No).
- `DROPDOWN`: Lista desplegable (requiere mapear la propiedad `options`).
- `FILE`: Solicitud para subir un adjunto (Se conecta con CU-11).

## Notas Técnicas para el Frontend
- **Posicionamiento Visual (`uiPosition`):** Es de vital importancia enviar las coordenadas `x` e `y`. Aunque el backend no las use para validar la lógica del motor de ejecución, son obligatorias para poder reconstruir visualmente el diagrama cuando se abra la política en modo "Edición" en el futuro.
- **Formularios Dinámicos (`formDefinition`):** Observe que los formularios van anidados dentro de los nodos tipo `USER_TASK`. Cada paso que interactúa con un humano tiene su propio micro-formulario de captura.
- **Validación Cíclica:** El front debe (o el motor de backend lo hará) validar que todas las conexiones (`edges`) enlacen hacia un `END` de forma íntegra sin dejar caminos "muertos" infinitos.
