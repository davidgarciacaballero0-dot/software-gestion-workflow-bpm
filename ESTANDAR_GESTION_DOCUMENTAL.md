# Estándar Oficial de Gestión Documental (DMS) - BPM

Este documento define la arquitectura y el flujo de datos oficial para el manejo de archivos adjuntos dentro del motor BPM.

## 1. Principio Arquitectónico Fundamental

**Separación de Responsabilidades:** Los archivos físicos (documentos, imágenes, PDFs) **NO** son datos de formulario.
*   El atributo `formDefinition` de un `WorkflowNode` se utilizará **estrictamente** para la captura de "datos duros" (texto, números, fechas, booleanos) que el motor de reglas pueda evaluar.
*   Los requisitos de documentación se gestionarán de forma independiente a través del atributo `requiredDocuments`.

## 2. Estructura de Datos (Backend - Java)

La entidad `WorkflowNode` refleja esta separación mediante el uso de una lista de `String` para las etiquetas visuales de los documentos:

```java
public class WorkflowNode {
    // ...
    // Datos dinámicos para lógica de negocio
    private List<FormFieldDefinition> formDefinition; 
    
    // Lista de etiquetas (labels) de documentos exigidos en este paso
    private List<String> requiredDocuments; 
}
```

La tabla `archivos_adjuntos` (Entidad `ArchivoAdjunto`) mantiene su naturaleza agnóstica. Un archivo pertenece a una `TramiteInstancia` y no requiere un mapeo uno a uno con un campo de formulario específico.

## 3. Comportamiento en el Diseñador (Frontend Web)

1.  **Checkboxes Visuales:** La lista de "Requisitos Documentales" (ej. Carnet de Identidad, Boleta de Pago) actúa como una herramienta visual de configuración.
2.  **Inyección Directa:** Al marcar un check, el sistema inyecta el `label` correspondiente (ej. `"Boleta de Pago"`) directamente en el array `node.requiredDocuments`.
3.  **Campo Personalizado:** El campo "Otro documento..." permite agregar etiquetas personalizadas a la misma lista.
4.  **Generación IA:** El System Prompt del microservicio de IA está instruido para popular el campo `requiredDocuments` en lugar de generar campos `FILE` dentro del formulario.

## 4. Renderizado en Tiempo de Ejecución (Atención del Trámite)

Tanto en la **App Móvil (Flutter)** como en la **Vista Web (Angular)**, la lógica de presentación debe seguir este patrón:

> [!IMPORTANT]
> **Diseño de la Interfaz de Usuario (UI)**
> 
> 1. **Lectura:** El cliente de UI lee el array `requiredDocuments` del nodo actual.
> 2. **Renderizado Visual:** Se renderiza una lista estática (bullet points o badges) en la parte superior del formulario indicando: *"Documentos obligatorios para este paso: [Carnet de Identidad, Boleta de Pago]"*.
> 3. **Bandeja de Subida:** Debajo de la lista, se ubica una **única área de subida genérica** (Drag & Drop o Botón "Adjuntar Documento").
> 4. **Persistencia:** Todos los archivos subidos mediante este componente genérico se envían al endpoint `/api/v1/archivos/upload` asociados al `idTramite`.

## 5. Ventajas del Estándar

*   **Flexibilidad:** Permite añadir o remover requisitos documentales sin alterar el esquema de validación de los formularios dinámicos.
*   **UX Consolidada:** Evita la sobrecarga cognitiva de tener múltiples botones de "Examinar" dispersos por todo el formulario.
*   **Auditoría Simplificada:** Un funcionario puede revisar la pestaña "Documentos" del trámite y ver todos los respaldos centralizados, sin importar en qué paso exacto se solicitaron.

## Anexo: Estándares de Generación IA (Regla de Convergencia)

Para garantizar que los diagramas generados por el Asistente IA mantengan un modelo BPMN válido y evitar la proliferación de nodos finales desconectados (el problema del "doble END"), el motor de IA debe adherirse estrictamente a la siguiente directiva:

> [!WARNING]
> **REGLA DE CONVERGENCIA LÓGICA**
> 
> Si un flujo de trabajo contiene bifurcaciones (ej. un `EXCLUSIVE_GATEWAY` de Aprobación o Rechazo), **todos los caminos** que terminen el proceso deben converger de vuelta hacia un ÚNICO nodo de tipo `END`.
> 
> *Excepción:* Solo se permite crear múltiples nodos `END` si representan estados de finalización **lógicamente y operacionalmente distintos** (ej: "Fin: Aprobado" vs "Fin: Rechazado"). Si ambos caminos conducen al simple cierre del trámite, las aristas (`edges`) de ambas ramas deben apuntar al ID del mismo nodo final.
