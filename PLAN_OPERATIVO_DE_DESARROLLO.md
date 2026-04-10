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

---

## 🚧 TAREAS PREVIAS: CONFIGURACIÓN Y SCAFFOLDING (Fase 0)
- ✅ **0.1 Setup Docker:** Crear `docker-compose.yml` para instanciar MongoDB de forma local.
- ✅ **0.2 Scaffolding Backend (Spring Boot):** Inicializar proyecto con Spring Web, Spring Data MongoDB, Spring Security, Lombok.
- ✅ **0.3 Scaffolding Microservicio IA (FastAPI):** Inicializar entorno virtual Python y paquetes completado.
- ✅ **0.4 Scaffolding Frontend (Angular):** Inicializar proyecto con Angular CLI, enrutamiento y estructura por features.

> **NOTA:** Hasta este punto (Fase 0) se generará la base de los ecosistemas (Backend, Frontend, IA, DB). Quedamos en pausa para recibir la instrucción del usuario sobre si procedemos a construir u observamos algo en particular antes.

---

## CICLOS DE DESARROLLO (A la espera de confirmación para iniciar)

### 🚧 CICLO 1: Cimientos y Seguridad (Fase de Inicio/Elaboración)
- ✅ CU-00: Definir Capa de Base de Datos (Models & Repositories MongoDB).
- ✅ CU-01: Gestionar Organización y Departamentos (Multitenant) `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`
- ✅ CU-02: Gestionar Usuarios y Roles `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`
- ✅ CU-03: Autenticar Usuario (JWT + Spring Security) `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`
- ✅ CU-13: Consultar Auditoría del Sistema (AOP + Bitácora) `[Backend: ✅ | Frontend: ✅ | Pruebas: ✅] FINALIZADO.`
- ⏳ TAREA PENDIENTE: Configurar Servidor MCP de Google Stitch para volcado oficial de Prototipos de UI/UX.

### ⚠️ CICLO 2: Construcción del Motor Core y Builders (Fase de Elaboración/Construcción)
- ⚠️ CU-04: Gestionar Políticas de Negocio (Modelado en MongoDB).
- ⚠️ CU-05: Diseñar Flujo de Trabajo Interactivo (JSON/BPMN).
- ⚠️ CU-06: Construir Formulario Dinámico (Form Builder JSON).

### ⚠️ CICLO 3: Operación, Trámites y Tiempo Real (Fase de Construcción)
- ⚠️ CU-07: Iniciar Nuevo Trámite.
- ⚠️ CU-08: Visualizar Bandeja Departamental.
- ⚠️ CU-09: Atender y Avanzar Trámite (Lógica de transición).
- ⚠️ CU-10: Consultar Historial y Trazabilidad.
- ⚠️ CU-11: Subir y Descargar Archivos Adjuntos.
- ⚠️ CU-12: Recibir Notificaciones Push y WebSockets.

### ⚠️ CICLO 4: Inteligencia Artificial y Optimización (Fase de Transición)
- ⚠️ CU-14: Generar Flujo mediante Lenguaje Natural (NLP - FastAPI).
- ⚠️ CU-15: Visualizar Dashboard de Insights IA (Analítica).
- ⚠️ CU-16: Interactuar con Asistente de Voz (ElevenLabs, Frontend & FastAPI).
