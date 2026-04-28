# 🗺️ PLAN OPERATIVO DE DESARROLLO

## Rol del Agente y Restricciones Tecnológicas
- **Rol:** Senior Software Engineer ("Ejecutor de Código").
- **Backend Principal:** Spring Boot (Java).
- **Microservicio IA:** FastAPI (Python).
- **Base de Datos:** MongoDB.
- **Frontend Web:** Angular.
- **Frontend Móvil (Futuro):** Flutter.
- **Virtualización:** Docker & Docker Compose.

## Arquitectura de 4 Capas (Regla Estricta)
- **Capa de Presentación (Angular):** `src/app/presentation/` (Componentes UI), `src/app/core/state/` (Gestión de estado).
- **Capa de Aplicación (Backend):** `com.bpm.app.controllers` (REST Endpoints), `com.bpm.app.security` (Filtros, JWT), `com.bpm.app.dto`.
- **Capa de Negocio/Dominio (Backend):** `com.bpm.domain.services` (Lógica), `com.bpm.domain.models` (Clases).
- **Capa de Datos/Persistencia (Backend):** `com.bpm.data.repositories` (MongoRepositories), `com.bpm.data.entities` (Documentos MongoDB).

---

## Leyenda de Estados
- ✅ Completado
- 🚧 En Progreso
- ⚠️ Revisión Pendiente / Por Iniciar
- ⏳ Pausado / Bloqueado

---

## 📝 TAREAS PREVIAS: CONFIGURACIÓN Y SCAFFOLDING (Fase 0)
- ✅ **0.1 Setup Docker:** Crear `docker-compose.yml` para instanciar MongoDB de forma local.
- ✅ **0.2 Scaffolding Backend (Spring Boot):** Inicializar proyecto con Spring Web, Spring Data MongoDB, Spring Security, Lombok.
- ✅ **0.3 Scaffolding Microservicio IA (FastAPI):** Inicializar entorno virtual Python y paquetes completado.
- ✅ **0.4 Scaffolding Frontend (Angular):** Inicializar proyecto con Angular CLI, enrutamiento y estructura por features.

---

## CICLOS DE DESARROLLO

### ✅ CICLO 1: Cimientos y Seguridad (Fase de Inicio/Elaboración)
- ✅ CU-00: Definir Capa de Base de Datos (Models & Repositories MongoDB).
- ✅ CU-01: Gestionar Organización y Departamentos (Multitenant) `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`
- ✅ CU-02: Gestionar Usuarios, Roles y Transferencias de Área `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`
- ✅ CU-03: Autenticar Usuario (JWT + Spring Security) `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`
- ✅ CU-13: Consultar Auditoría del Sistema (AOP + Bitácora) `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`
- ✅ **CU-17 [NUEVO]:** Gestionar Jerarquía de Privilegios y Jefaturas (Asignación de Jefes por Área) `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`

---

### ✅ REVISIÓN PRE-CICLO 2: Securización de Credenciales (Deuda Técnica)
- ✅ **0.5.1** Refactorizar `application.properties` (Inyección de variables).
- ✅ **0.5.2** Crear archivo `.env` local.
- ✅ **0.5.3** Crear archivo `.env.example`.
- ✅ **0.5.4** Actualizar `.gitignore`.
- ✅ **0.5.5** Orquestar `docker-compose.yml`.
- ✅ **0.5.6 - 0.5.9** Validaciones de infraestructura y seguridad. *(ÉXITO: Sistema orquestado y funcional).*

---

### ✅ CICLO 2: Construcción del Motor Core y Builders (Fase de Elaboración/Construcción)
- ✅ **CU-04:** Gestionar Políticas de Negocio Básicas (Modelado en MongoDB) `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-05:** Diseñar Flujo de Trabajo Interactivo (JSON/BPMN - Lienzo Drag & Drop) `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-06:** Construir Formulario Dinámico y Requisitos Documentales (Form Builder) `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-18 [NUEVO]:** Gestionar Ciclo de Vida y Versionado de Políticas `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-19 [NUEVO]:** Configurar SLAs y Tiempos de Alerta por Nodo `[Backend: ✅ | Frontend: ✅]`.
- ✅ TAREA FINALIZADA: Definir Contrato JSON (DTOs) para persistencia de flujos.

---

### ✅ CICLO 3: Operación, Trámites y Tiempo Real (Fase de Construcción)

**Fase 3.1: Disparo e Infraestructura Base**
- ✅ **CU-07:** Iniciar Nuevo Trámite `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-08:** Visualizar Bandeja Personal y Departamental `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-12:** Recibir Notificaciones Push y WebSockets `[Backend: ✅ | Frontend: ✅]`.

**Fase 3.2: Ejecución y Evidencias**
- ✅ **CU-09:** Atender y Avanzar Trámite `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-11:** Subir y Descargar Archivos Adjuntos `[Backend: ✅ | Frontend: ✅]`.

**Fase 3.3: Auditoría y Excepciones**
- ✅ **CU-10:** Consultar Historial y Trazabilidad `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-20:** Supervisión de Bandeja por Jefatura `[Backend: ✅ | Frontend: ✅]`.
- ✅ **CU-21:** Intervención y Reasignación Administrativa `[Backend: ✅ | Frontend: ✅]`.

---

### 🛡️ FASE DE ESTABILIZACIÓN Y QA (Pre-Ciclo 4)
**Objetivo:** Garantizar la robustez total de la lógica de negocio y la consistencia de los datos antes de integrar IA.

- ✅ **Pruebas Automatizadas (Ciclos 2 y 3):** Implementar JUnit tests para el Diseñador y el Motor de Ejecución.
- ✅ **Manual de Pruebas de Usuario:** Crear guía detallada de "End-to-End" para validación manual.
- ✅ **Validación de UI/UX:** Revisión final de consistencia en el diseño Glassmorphism en todas las vistas.
- ✅ **Hito de Aceptación:** Estabilización de Microservicio IA y Backend finalizada.

---

### ✅ CICLO 4: Inteligencia Artificial (IA) y Optimización (Fase de Valor)
- ✅ CU-14: Generar Flujo mediante Lenguaje Natural (NLP - FastAPI) [Gemini 1.5 Flash].
- ✅ CU-15: Visualizar Dashboard de Insights IA y Cuellos de Botella [Gemini 1.5 Pro].
- ✅ CU-16: Interactuar con Asistente de Voz (Angular Voice Engine).
- ✅ **CU-22 [NUEVO]:** Exportación de Reportes y Sábanas de Datos (PDF/Excel) (iText7 / Apache POI).

---

### 🚧 CICLO 5 [FINAL]: Entrega, Dockerización y Cierre
- 🚧 **Orquestación Final:** Ajuste de `docker-compose.yml` para entorno de producción.
- 🚧 **Documentación de Entrega:** Finalización de README y Manual Técnico.
- 🚧 **Cierre de Proyecto:** Sincronización final y limpieza de entornos locales.

---

