# 📘 Manual de Pruebas de Usuario (End-to-End) - Sistema BPM

Este documento guía al usuario en la validación completa del sistema, desde la seguridad hasta la auditoría administrativa. Siga los pasos secuencialmente para garantizar la integridad de la lógica de negocio.

---

## 🛠️ Requisitos Previos
- Backend corriendo en `localhost:8080`.
- Frontend corriendo en `localhost:4200`.
- Base de Datos MongoDB activa.

---

## 🔐 Ciclo 1: Seguridad y Estructura Organizacional

### Caso de Prueba 1.1: Autenticación JWT
1.  Navegue a `/login`.
2.  Ingrese credenciales válidas (creadas previamente en el script de carga).
3.  **Resultado Esperado:** Redirección al Catálogo de Políticas y almacenamiento del token en `LocalStorage`.

### Caso de Prueba 1.2: Registro de Organización (Admin)
1.  Como usuario administrador, acceda al módulo de Organización.
2.  Cree una nueva Organización (Ej: "Corporación Global").
3.  Agregue al menos dos Departamentos (Ej: "Riesgos" y "Operaciones").
4.  **Resultado Esperado:** Los departamentos deben aparecer vinculados a la organización en la base de datos.

---

## 🎨 Ciclo 2: Diseño de Procesos (BPM Designer)

### Caso de Prueba 2.1: Creación de un Flujo "Hola Mundo"
1.  Navegue al **Diseñador de Workflows**.
2.  Arrastre un nodo **START**, un nodo **USER_TASK** y un nodo **END**.
3.  Conecte `START -> USER_TASK -> END`.
4.  Seleccione el nodo `USER_TASK` y configure:
    - Nombre: "Aprobación Inicial".
    - Departamento: "Riesgos".
    - SLA: 24 horas.
5.  Guarde la política (Borrador).
6.  **Resultado Esperado:** La política debe aparecer en la lista del Catálogo con estado `DRAFT`.

### Caso de Prueba 2.2: Publicación y Versionamiento
1.  En el catálogo, haga clic en el icono de **Publicar** (🚀) de la política recién creada.
2.  Cree una **Nueva Versión** (1.1).
3.  **Resultado Esperado:** La versión original queda como `ARCHIVED` (o permanece si no era la misma rama) y la nueva versión nace como `DRAFT`.

---

## ⚙️ Ciclo 3: Operación y Ejecución

### Caso de Prueba 3.1: Inicio de Instancia
1.  Desde el catálogo, haga clic en **Iniciar Trámite** sobre la política publicada.
2.  **Resultado Esperado:** El sistema debe asignar un código único (Ej: `TRM-2026-0001`) y el trámite debe aparecer en la **Bandeja de Entrada** del departamento asignado.

### Caso de Prueba 3.2: Ejecución con Evidencias (CU-11)
1.  Vaya a la pestaña **Bandeja Global/Depto** y busque el trámite creado.
2.  Haga clic en **Atender**.
3.  Suba un archivo PDF en la sección de evidencias.
4.  Complete cualquier campo requerido del formulario dinámico.
5.  Haga clic en **Avanzar**.
6.  **Resultado Esperado:** El archivo debe persistirse en GridFS y el trámite debe pasar al siguiente nodo o finalizar.

### Caso de Prueba 3.3: Auditoría y Bitácora (CU-10)
1.  Regrese a la bandeja y busque el trámite (incluso si está en "Finalizados").
2.  Haga clic en el icono del **Ojo (👁️)** de Trazabilidad.
3.  **Resultado Esperado:** Se debe desplegar una Línea de Tiempo visual con los eventos de `CREACION` y `AVANCE`, detallando fecha, usuario y ubicación.

### Caso de Prueba 3.4: Supervisión e Intervención (CU-20/21)
1.  Acceda a la ruta `/supervision`.
2.  Observe el dashboard con los indicadores de carga departamental.
3.  En un trámite activo, haga clic en el icono de la **Herramienta (🛠️)**.
4.  En el modal, ingrese un motivo y fuerce la reasignación a otro departamento/nodo.
5.  **Resultado Esperado:** El trámite desaparece de la bandeja anterior y aparece en la nueva. El historial registra un evento de `INTERVENCION`.

---

## 🏁 Cierre de Pruebas
Si todos los puntos anteriores son exitosos, el sistema está **ESTABLE** y listo para la integración con **Inteligencia Artificial (Ciclo 4)**.
