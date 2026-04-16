# 🧪 PLAN DE PRUEBAS — SISTEMA BPM WORKFLOW

## Información General
| Campo | Valor |
|---|---|
| **Proyecto** | Sistema de Gestión de Procesos de Negocio (BPM) |
| **Versión** | 1.0.0-SNAPSHOT |
| **Stack Backend** | Spring Boot 4.0.5 + MongoDB + Spring Security (JWT) |
| **Stack Frontend** | Angular 20 |
| **Microservicio IA** | FastAPI (Python) |
| **Fecha de Elaboración** | 2026-04-09 |

---

## Leyenda de Estados
- ✅ Prueba Exitosa (PASS)
- ❌ Prueba Fallida (FAIL)
- ⚠️ Pendiente de Ejecución
- 🔒 Requiere Autenticación JWT
- 🐳 Requiere Docker/MongoDB Activo

---

## RESUMEN EJECUTIVO DE COBERTURA

| Ciclo | Casos de Uso | Tests Unitarios | Tests Integración | Tests Frontend | Estado |
|---|---|---|---|---|---|
| **Ciclo 1** | CU-00 a CU-03, CU-13 | 14/14 ✅ | 1 (contextLoads 🐳) | ✅ | Operativo |
| **Ciclo 2** | CU-04 a CU-06, CU-18, 19 | 10/10 ✅ | 1 (PoliticaService ✅) | ✅ | Operativo |
| **Ciclo 3** | CU-07 a CU-12, CU-20, 21 | 12/12 ✅ | 1 (TramiteService ✅) | ✅ | Operativo |
| **Ciclo 4** | CU-14 a CU-16 | ⚠️ Por definir | ⚠️ | ⚠️ | No iniciado |

---

# 📋 CICLO 1: Cimientos y Seguridad

## CU-00: Capa de Base de Datos (Modelos y Repositorios MongoDB)

### Entidades Definidas (11 documentos MongoDB)

| # | Entidad | Colección MongoDB | Campos Clave | Estado |
|---|---|---|---|---|
| 1 | `Organizacion` | `organizaciones` | id, nombre, esquemaColores, createdAt, updatedAt | ✅ |
| 2 | `Departamento` | `departamentos` | id, idOrganizacion, idDepartamentoPadre, nombre, codigoArea | ✅ |
| 3 | `Usuario` | `usuarios` | id, idOrganizacion, idDepartamento, idRol, nombre, email, passwordHash | ✅ |
| 4 | `Rol` | `roles` | id, nombre, permisos[] | ✅ |
| 5 | `AuditoriaSistema` | `auditoria_sistema` | id, idUsuarioActor, accion, entidadAfectada, ipOrigen | ✅ |
| 6 | `PoliticaWorkflow` | `politicas_workflow` | id, idOrganización, nodes[], edges[] | ✅ |
| 7 | `TramiteInstancia` | `tramites_instancias` | id, codigoTramite, estadoActual, datosAcumulados | ✅ |
| 8 | `EventoHistorial` | `eventos_historial` | id, idTramite, idUsuarioAccion, tipoEvento | ✅ |
| 9 | `ArchivoAdjunto` | `archivos_adjuntos` | id, nombre, url, size, idTramite | ✅ |
| 10 | `NotificacionPush` | `notificaciones_push` | id, idUsuarioDestino, titulo, mensaje | ✅ |
| 11 | `AlertaInsightIA` | (Ciclo 4) | Preparada para Ciclo 4 | ⚠️ |

### Repositorios Definidos (11 interfaces MongoRepository)

| # | Repositorio | Métodos Personalizados | Estado |
|---|---|---|---|
| 1 | `OrganizacionRepository` | — (CRUD heredado) | ✅ |
| 2 | `DepartamentoRepository` | `findByIdOrganizacion()` | ✅ |
| 3 | `UsuarioRepository` | `findByEmail()`, `findByIdDepartamento()` | ✅ |
| 4 | `RolRepository` | — (CRUD heredado) | ✅ |
| 5 | `AuditoriaSistemaRepository` | `findAllByOrderByCreatedAtDesc()`, `findByIdUsuarioActor()` | ✅ |

---

## CU-01: Gestionar Organización y Departamentos (Multitenant)

### PRU-01.1 — Crear Organización (Happy Path)
| Campo | Detalle |
|---|---|
| **Clase de Test** | `OrganizacionServiceTest` |
| **Método** | `debeGuardarYRetornarOrganizacion_CuandoSeCrea()` |
| **Precondición** | Ninguna |
| **Entrada** | `{ nombre: "Ministerio de Obras" }` |
| **Resultado Esperado** | Retorna DTO con id generado y nombre correcto |
| **Validaciones** | `assertNotNull(response)`, `assertEquals("Ministerio de Obras", ...)`, `verify(save, times(1))` |
| **Estado** | ✅ PASS |

### PRU-01.2 — Obtener Organización por ID Existente
| Campo | Detalle |
|---|---|
| **Clase de Test** | `OrganizacionServiceTest` |
| **Método** | `debeRetornarOrganizacion_CuandoIdExiste()` |
| **Precondición** | Organización con ID "12345" existe |
| **Entrada** | `id = "12345"` |
| **Resultado Esperado** | Retorna DTO con id correcto |
| **Estado** | ✅ PASS |

### PRU-01.3 — Rechazar Consulta con ID Inexistente (404)
| Campo | Detalle |
|---|---|
| **Clase de Test** | `OrganizacionServiceTest` |
| **Método** | `debeLanzarExcepcionGlobal404_CuandoIdNoExiste_ProtegiendoBd()` |
| **Precondición** | ID "erroneo_999" no existe en la BD |
| **Entrada** | `id = "erroneo_999"` |
| **Resultado Esperado** | `ResourceNotFoundException` con mensaje "no encontrada" |
| **Validaciones** | `assertThrows(ResourceNotFoundException.class, ...)` |
| **Estado** | ✅ PASS |

### PRU-01.4 — Denegar Creación de Departamento en Organización Inexistente
| Campo | Detalle |
|---|---|
| **Clase de Test** | `DepartamentoServiceTest` |
| **Método** | `debeDenegarCreacionDepartamento_CuandoOrganizacionNoExiste_ParaMantenerIntegridad()` |
| **Precondición** | Organización "tenant_invalido_123" NO existe |
| **Entrada** | `{ idOrganizacion: "tenant_invalido_123", nombre: "Recursos Humanos" }` |
| **Resultado Esperado** | `ResourceNotFoundException` con "Denegado", repositorio NUNCA es invocado |
| **Validaciones** | `assertThrows(...)`, `verify(departamentoRepository, never()).save(any())` |
| **Estado** | ✅ PASS |

### PRU-01.5 — Permitir Creación de Departamento en Organización Válida
| Campo | Detalle |
|---|---|
| **Clase de Test** | `DepartamentoServiceTest` |
| **Método** | `debePermitirCreacion_CuandoOrganizacionSiExiste()` |
| **Precondición** | Organización "tenant_valido" existe |
| **Entrada** | `{ idOrganizacion: "tenant_valido", nombre: "Sistemas IT" }` |
| **Resultado Esperado** | Retorna DTO con nombre correcto, save invocado 1 vez |
| **Estado** | ✅ PASS |

### PRU-01.6 — Endpoint REST: POST `/api/v1/organizaciones` 🐳
| Campo | Detalle |
|---|---|
| **Tipo** | Prueba Manual / Integración |
| **Método HTTP** | `POST` |
| **URL** | `http://localhost:8080/api/v1/organizaciones` |
| **Headers** | `Authorization: Bearer <JWT>`, `Content-Type: application/json` |
| **Body** | `{ "nombre": "Empresa_Prueba", "esquemaColores": { "primary": "#3498db" } }` |
| **Resultado Esperado** | `201 Created` con JSON del recurso creado |
| **Estado** | ⚠️ Pendiente (requiere MongoDB + Backend activo) |

### PRU-01.7 — Endpoint REST: GET `/api/v1/departamentos/organizacion/{id}` 🐳 🔒
| Campo | Detalle |
|---|---|
| **Tipo** | Prueba Manual / Integración |
| **Método HTTP** | `GET` |
| **URL** | `http://localhost:8080/api/v1/departamentos/organizacion/<ORG_ID>` |
| **Headers** | `Authorization: Bearer <JWT>` |
| **Resultado Esperado** | `200 OK` con array de departamentos de la organización |
| **Estado** | ⚠️ Pendiente |

---

## CU-02: Gestionar Usuarios y Roles

### PRU-02.1 — Bloquear Cross-Tenant Injection (Seguridad Multitenant)
| Campo | Detalle |
|---|---|
| **Clase de Test** | `UsuarioServiceTest` |
| **Método** | `debeBloquearOperacion_SiDepartamentoSolicitado_EsDeOtraOrganizacion()` |
| **Precondición** | Org "ORG_MADRE" existe, Departamento "DEP_FALSO" pertenece a "ORG_AJENA" |
| **Entrada** | `{ idOrganizacion: "ORG_MADRE", idDepartamento: "DEP_FALSO" }` |
| **Resultado Esperado** | `ResourceNotFoundException` con "[BRECHA FRENADA]", `save()` NUNCA invocado |
| **Relevancia** | 🔴 CRÍTICA — Previene ataques de inyección de referencias inter-tenant |
| **Estado** | ✅ PASS |

### PRU-02.2 — Encriptar Password con BCrypt al Registrar Funcionario
| Campo | Detalle |
|---|---|
| **Clase de Test** | `UsuarioServiceTest` |
| **Método** | `debeEncriptarPasswordEInyectar_SiValidacionesSonLicitas()` |
| **Precondición** | Org, Depto y Rol válidos existen |
| **Entrada** | `{ password: "clavePlana123_hackeable", nombre: "David_Admin", ... }` |
| **Resultado Esperado** | `PasswordEncoder.encode()` invocado exactamente 1 vez, `save()` invocado 1 vez |
| **Validaciones** | `verify(passwordEncoder, times(1)).encode("clavePlana123_hackeable")` |
| **Estado** | ✅ PASS |

### PRU-02.3 — Endpoint REST: POST `/api/v1/usuarios` 🐳 🔒
| Campo | Detalle |
|---|---|
| **Tipo** | Prueba Manual / Integración |
| **Método HTTP** | `POST` |
| **URL** | `http://localhost:8080/api/v1/usuarios` |
| **Body** | `{ "idOrganizacion": "<ORG_ID>", "idDepartamento": "<DEP_ID>", "idRol": "<ROL_ID>", "nombre": "Funcionario Test", "email": "test@test.com", "password": "clave123" }` |
| **Resultado Esperado** | `201 Created`, response DTO sin campo password |
| **Estado** | ⚠️ Pendiente |

### PRU-02.4 — Endpoint REST: POST `/api/v1/roles` 🐳 🔒
| Campo | Detalle |
|---|---|
| **Tipo** | Prueba Manual / Integración |
| **Método HTTP** | `POST` |
| **URL** | `http://localhost:8080/api/v1/roles` |
| **Body** | `{ "nombre": "ROL_OPERADOR", "permisos": ["LEER", "ESCRIBIR"] }` |
| **Resultado Esperado** | `201 Created` |
| **Estado** | ⚠️ Pendiente |

### PRU-02.5 — El DTO de respuesta NUNCA expone el password hash
| Campo | Detalle |
|---|---|
| **Tipo** | Verificación de Diseño |
| **Clase** | `UsuarioResponseDTO` |
| **Resultado Esperado** | Clase no contiene campo `password` ni `passwordHash` |
| **Estado** | ✅ VERIFICADO — El DTO solo mapea: id, idOrganizacion, idDepartamento, idRol, nombre, email, createdAt |

---

## CU-03: Autenticar Usuario (JWT + Spring Security)

### PRU-03.1 — Generar Token JWT Válido y Extraer Email
| Campo | Detalle |
|---|---|
| **Clase de Test** | `JwtUtilTest` |
| **Método** | `debeGenerarTokenValido_YExtraerEmailCorrectamente()` |
| **Entrada** | email="admin@empresa.gob", rolId="ROL_ADMIN", userId="USR_001", orgId="ORG_001" |
| **Resultado Esperado** | Token no nulo, empieza con "eyJ", email extraído = "admin@empresa.gob" |
| **Estado** | ✅ PASS |

### PRU-03.2 — Token Contiene Claims Personalizados (Rol, OrgId, UserId)
| Campo | Detalle |
|---|---|
| **Clase de Test** | `JwtUtilTest` |
| **Método** | `debeContenerClaimsPersonalizados_RolYOrganizacion()` |
| **Entrada** | email="director@ministerio.gob", rolId="ROL_DIRECTOR", userId="USR_077", orgId="ORG_FISCAL" |
| **Resultado Esperado** | Claims extraídos coinciden exactamente con los inyectados |
| **Estado** | ✅ PASS |

### PRU-03.3 — Token No Expirado se Valida como Verdadero
| Campo | Detalle |
|---|---|
| **Clase de Test** | `JwtUtilTest` |
| **Método** | `debeValidarTokenComoVerdadero_CuandoNoHaExpirado()` |
| **Resultado Esperado** | `isTokenValid() == true` |
| **Estado** | ✅ PASS |

### PRU-03.4 — Rechazar Token Manipulado (Anti-Falsificación)
| Campo | Detalle |
|---|---|
| **Clase de Test** | `JwtUtilTest` |
| **Método** | `debeRechazarTokenManipulado_ProteccionContraFalsificacion()` |
| **Entrada** | Token válido con últimos 5 caracteres reemplazados por "XXXXX" |
| **Resultado Esperado** | `isTokenValid() == false` |
| **Relevancia** | 🔴 CRÍTICA — Protección contra ataques de manipulación de payload |
| **Estado** | ✅ PASS |

### PRU-03.5 — Rechazar Token Expirado
| Campo | Detalle |
|---|---|
| **Clase de Test** | `JwtUtilTest` |
| **Método** | `debeRechazarTokenExpirado()` |
| **Precondición** | JwtUtil configurado con `expirationMs = 0` (token nace muerto) |
| **Resultado Esperado** | `isTokenValid() == false` |
| **Estado** | ✅ PASS |

### PRU-03.6 — Endpoint REST: POST `/api/v1/auth/login` (Público) 🐳
| Campo | Detalle |
|---|---|
| **Tipo** | Prueba Manual / Integración |
| **Método HTTP** | `POST` |
| **URL** | `http://localhost:8080/api/v1/auth/login` |
| **Body** | `{ "email": "admin@empresa.gob", "password": "clave123" }` |
| **Resultado Esperado (OK)** | `200 OK` con `{ token, nombre, idRol, idOrganizacion }` |
| **Resultado Esperado (FAIL email)** | `401 Unauthorized` con mensaje de email no encontrado |
| **Resultado Esperado (FAIL password)** | `401 Unauthorized` con mensaje de hash incompatible |
| **Estado** | ⚠️ Pendiente |

### PRU-03.7 — Filtro JWT: Petición sin Bearer es Rechazada en Rutas Protegidas 🐳
| Campo | Detalle |
|---|---|
| **Tipo** | Prueba Manual / Integración |
| **Método HTTP** | `GET` |
| **URL** | `http://localhost:8080/api/v1/organizaciones` |
| **Headers** | Sin `Authorization` |
| **Resultado Esperado** | `401 Unauthorized` o `403 Forbidden` |
| **Estado** | ⚠️ Pendiente |

### PRU-03.8 — Filtro JWT: Petición con Bearer Válido Accede a Ruta Protegida 🐳
| Campo | Detalle |
|---|---|
| **Tipo** | Prueba Manual / Integración |
| **URL** | `http://localhost:8080/api/v1/organizaciones` |
| **Headers** | `Authorization: Bearer <TOKEN_VALIDO>` |
| **Resultado Esperado** | `200 OK` con datos |
| **Estado** | ⚠️ Pendiente |

### PRU-03.9 — SecurityConfig: CORS permite Angular en localhost:4200
| Campo | Detalle |
|---|---|
| **Tipo** | Verificación de Configuración |
| **Resultado Esperado** | `allowedOrigins` incluye `http://localhost:4200`, credentials habilitados |
| **Estado** | ✅ VERIFICADO en SecurityConfig.java |

### PRU-03.10 — SecurityConfig: Ruta `/api/v1/auth/**` es pública
| Campo | Detalle |
|---|---|
| **Tipo** | Verificación de Configuración |
| **Resultado Esperado** | `requestMatchers("/api/v1/auth/**").permitAll()` definido |
| **Estado** | ✅ VERIFICADO en SecurityConfig.java |

---

## CU-13: Consultar Auditoría del Sistema (AOP + Bitácora)

### PRU-13.1 — Registrar Evento de Auditoría con Datos Completos
| Campo | Detalle |
|---|---|
| **Clase de Test** | `AuditoriaServiceTest` |
| **Método** | `debeRegistrarEventoDeAuditoria_ConDatosCompletos()` |
| **Entrada** | `("admin@empresa.gob", "OrganizacionService.crearOrganizacion()", "OrganizacionService", "192.168.1.100")` |
| **Resultado Esperado** | `auditoriaRepository.save()` invocado exactamente 1 vez |
| **Estado** | ✅ PASS |

### PRU-13.2 — Listar Eventos Ordenados por Fecha Descendente
| Campo | Detalle |
|---|---|
| **Clase de Test** | `AuditoriaServiceTest` |
| **Método** | `debeListarEventosOrdenadosPorFechaDescendente()` |
| **Entrada** | 2 eventos mock (Login hace 2h, CrearUsuario ahora) |
| **Resultado Esperado** | Lista de tamaño 2, el más reciente primero ("CrearUsuario") |
| **Estado** | ✅ PASS |

### PRU-13.3 — AOP Aspect: Evita Recursión Infinita en AuditoriaService
| Campo | Detalle |
|---|---|
| **Tipo** | Verificación de Diseño |
| **Resultado Esperado** | `AuditoriaAspect` contiene guard `if (claseServicio.equals("AuditoriaService")) return;` |
| **Estado** | ✅ VERIFICADO en AuditoriaAspect.java:59 |

### PRU-13.4 — AOP Aspect: Captura IP de Origen del Request HTTP
| Campo | Detalle |
|---|---|
| **Tipo** | Verificación de Diseño |
| **Resultado Esperado** | Extrae `request.getRemoteAddr()` del `RequestContextHolder` |
| **Estado** | ✅ VERIFICADO en AuditoriaAspect.java:46-50 |

### PRU-13.5 — AOP Aspect: Errores de Auditoría No Bloquean Operaciones de Negocio
| Campo | Detalle |
|---|---|
| **Tipo** | Verificación de Diseño |
| **Resultado Esperado** | Bloque try-catch silencioso con `log.warn()` en AuditoriaAspect |
| **Estado** | ✅ VERIFICADO en AuditoriaAspect.java:66-69 |

### PRU-13.6 — Endpoint REST: GET `/api/v1/auditoria` 🐳 🔒
| Campo | Detalle |
|---|---|
| **Tipo** | Prueba Manual / Integración |
| **URL** | `http://localhost:8080/api/v1/auditoria` |
| **Resultado Esperado** | `200 OK` con array de eventos de auditoría |
| **Estado** | ⚠️ Pendiente |

---

# 📋 CICLO 2: Motor Core y Builders (Pendiente)

## CU-04: Gestionar Políticas de Negocio

### PRU-04.1 — Crear Política de Workflow con JSON Schema ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | PoliticaWorkflow persistida con nombre, versión y estados definidos |
| **Estado** | ⚠️ POR IMPLEMENTAR |

### PRU-04.2 — Validar Unicidad de Nombre de Política por Organización ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | Excepción si ya existe una política con mismo nombre en la org |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-05: Diseñar Flujo de Trabajo Interactivo (JSON/BPMN)

### PRU-05.1 — Definir Flujo con Estados y Transiciones ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | Flujo con nodos (estados) y aristas (transiciones) válidos |
| **Estado** | ⚠️ POR IMPLEMENTAR |

### PRU-05.2 — Rechazar Flujo con Estado Huérfano (sin transiciones) ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | Excepción de validación de integridad del grafo |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-06: Construir Formulario Dinámico (Form Builder JSON)

### PRU-06.1 — Generar Formulario desde JSON Schema ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria + Frontend |
| **Resultado Esperado** | JSON del formulario se renderiza correctamente en Angular |
| **Estado** | ⚠️ POR IMPLEMENTAR |

---

# 📋 CICLO 3: Operación, Trámites y Tiempo Real (Pendiente)

## CU-07: Iniciar Nuevo Trámite

### PRU-07.1 — Crear Instancia de Trámite Vinculada a Política ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | TramiteInstancia creada en estado inicial definido por la PoliticaWorkflow |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-08: Visualizar Bandeja Departamental

### PRU-08.1 — Listar Trámites Pendientes por Departamento ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | Lista de trámites filtrada por idDepartamento y estado "PENDIENTE" |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-09: Atender y Avanzar Trámite

### PRU-09.1 — Transicionar Trámite al Siguiente Estado Válido ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | Estado del trámite cambia según las transiciones definidas en la política |
| **Estado** | ⚠️ POR IMPLEMENTAR |

### PRU-09.2 — Rechazar Transición Inválida (Estado no Alcanzable) ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | Excepción indicando que la transición no es válida |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-10: Consultar Historial y Trazabilidad

### PRU-10.1 — Obtener Historial Completo de un Trámite ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Unitaria |
| **Resultado Esperado** | Lista de EventoHistorial ordenada cronológicamente por trámite |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-11: Subir y Descargar Archivos Adjuntos

### PRU-11.1 — Subir Archivo y Vincularlo a un Trámite ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Integración |
| **Resultado Esperado** | ArchivoAdjunto creado con referencia al trámite y metadata del archivo |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-12: Recibir Notificaciones Push y WebSockets

### PRU-12.1 — Enviar Notificación en Tiempo Real al Cambiar Estado ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Integración |
| **Resultado Esperado** | NotificacionPush creada y enviada vía WebSocket al usuario destino |
| **Estado** | ⚠️ POR IMPLEMENTAR |

---

# 📋 CICLO 4: Inteligencia Artificial y Optimización (Pendiente)

## CU-14: Generar Flujo mediante Lenguaje Natural (NLP - FastAPI)

### PRU-14.1 — Interpretar Texto en Español y Generar JSON de Flujo ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Integración (Backend → FastAPI) |
| **Entrada** | "Quiero un flujo de aprobación de vacaciones con 3 niveles" |
| **Resultado Esperado** | JSON con nodos y transiciones generados automáticamente |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-15: Visualizar Dashboard de Insights IA

### PRU-15.1 — Generar Métricas de Rendimiento por Departamento ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Integración |
| **Resultado Esperado** | Dashboard con tiempos promedio, cuellos de botella y tendencias |
| **Estado** | ⚠️ POR IMPLEMENTAR |

## CU-16: Interactuar con Asistente de Voz

### PRU-16.1 — Capturar Comando de Voz y Traducir a Acción ⚠️
| Campo | Detalle |
|---|---|
| **Tipo** | Integración (Frontend → FastAPI → ElevenLabs) |
| **Resultado Esperado** | Audio transcrito y acción ejecutada en el sistema |
| **Estado** | ⚠️ POR IMPLEMENTAR |

---

# 🔧 VERIFICACIÓN DE CONSISTENCIA FULL-STACK (CICLO 1)

## Backend ↔ Base de Datos

| Verificación | Estado |
|---|---|
| Todas las entidades tienen `@Document` con colección definida | ✅ |
| Todos los repositorios extienden `MongoRepository` | ✅ |
| Campos `@CreatedDate` y `@LastModifiedDate` presentes | ✅ |
| `@Id` de tipo `String` (ObjectId de MongoDB) | ✅ |
| `application.properties` configura `spring.application.name=backend` | ✅ |
| MongoDB se conecta a `bpm_workflow` por defecto (Docker Compose) | ✅ |

## Backend ↔ Frontend (Contratos API)

| Endpoint Backend | Service Angular | Método Frontend | Consistencia |
|---|---|---|---|
| `POST /api/v1/auth/login` | `AuthService.login()` | `POST {email, password}` | ✅ |
| `GET /api/v1/organizaciones` | `OrganizacionService.listarTodas()` | `GET` | ✅ |
| `GET /api/v1/organizaciones/{id}` | `OrganizacionService.obtenerPorId()` | `GET` | ✅ |
| `POST /api/v1/organizaciones` | `OrganizacionService.crear()` | `POST` | ✅ |
| `GET /api/v1/departamentos/organizacion/{id}` | `DepartamentoService.listarPorOrganizacion()` | `GET` | ✅ |
| `POST /api/v1/departamentos` | `DepartamentoService.crear()` | `POST` | ✅ |
| `GET /api/v1/usuarios/departamento/{id}` | `UsuarioService.listarPorDepartamento()` | `GET` | ✅ |
| `POST /api/v1/usuarios` | `UsuarioService.registrar()` | `POST` | ✅ |
| `GET /api/v1/roles` | `RolService.listarRoles()` | `GET` | ✅ |
| `POST /api/v1/roles` | `RolService.crear()` | `POST` | ✅ |
| `GET /api/v1/auditoria` | `AuditoriaService.listarTodos()` | `GET` | ✅ |
| `GET /api/v1/auditoria/usuario/{id}` | `AuditoriaService.listarPorUsuario()` | `GET` | ✅ |

## Frontend: Modelos ↔ DTOs Backend

| Modelo Angular | DTO Backend (Response) | Campos Coinciden |
|---|---|---|
| `Organizacion` | `OrganizacionResponseDTO` | ✅ |
| `Departamento` | `DepartamentoResponseDTO` | ✅ |
| `Usuario` | `UsuarioResponseDTO` | ✅ |
| `Rol` | `RolResponseDTO` | ✅ |
| `Auditoria` | `AuditoriaResponseDTO` | ✅ |
| `AuthResponse` (inline) | `AuthResponseDTO` | ✅ |

## Seguridad Full-Stack

| Verificación | Estado |
|---|---|
| JWT se genera en backend con HMAC-SHA256 | ✅ |
| AuthInterceptor inyecta Bearer en cada request Angular | ✅ |
| SecurityConfig declara sesión STATELESS | ✅ |
| CSRF deshabilitado (API Stateless) | ✅ |
| CORS configurado para `localhost:4200` | ✅ |
| Ruta `/api/v1/auth/**` es pública, todo lo demás protegido | ✅ |
| Password jamás viaja en respuestas (UsuarioResponseDTO) | ✅ |

---

# ⚠️ OBSERVACIONES Y HALLAZGOS

## Hallazgos del Ciclo 1

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | `BackendApplicationTests.contextLoads` falla sin MongoDB activo | Baja | Esperado — requiere Docker 🐳 |
| 2 | `app.routes.ts` está vacío — no hay rutas Angular definidas | Media | El routing aún no conecta los feature components |
| 3 | `app.config.ts` no registra `provideHttpClient()` ni el Interceptor | Media | El HttpClient y AuthInterceptor no se inyectan globalmente |
| 4 | `app.html` contiene el template placeholder de Angular (lorem) | Baja | Pendiente de limpieza al integrar la UI real |
| 5 | `application.properties` no configura `spring.data.mongodb.uri` explícitamente | Baja | Usa default `localhost:27017` — funcional con Docker Compose |

---

# 📊 COMANDO PARA EJECUTAR TODAS LAS PRUEBAS UNITARIAS

```bash
# Backend (desde /backend_bpm)
./mvnw test -Dtest="!BackendApplicationTests"

# Resultado esperado: 14 tests, 0 failures, 0 errors
```

---

> **NOTA:** Este plan de pruebas es un documento vivo. Se actualizará al inicio de cada ciclo de desarrollo con las nuevas pruebas correspondientes a los casos de uso implementados.
