<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-4.0.5-6DB33F?style=for-the-badge&logo=spring-boot" />
  <img src="https://img.shields.io/badge/MongoDB-8.0-47A248?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk" />
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens" />
</p>

# ⚙️ Backend BPM — Spring Boot REST API

> Motor central del sistema BPM. Expone una API RESTful protegida con JWT y se conecta a MongoDB para persistencia documental.

---

## 🏗️ Arquitectura de 3 Capas Internas

El backend sigue estrictamente la separación de capas del sistema. Cada paquete tiene una responsabilidad definida y las dependencias fluyen en una sola dirección: **Aplicación → Dominio → Datos**.

```
com.bpm/
├── app/                          ← CAPA DE APLICACIÓN
│   ├── BackendApplication.java   ← Punto de entrada (@SpringBootApplication)
│   ├── controllers/              ← REST Endpoints (@RestController)
│   ├── dto/                      ← Data Transfer Objects (Request/Response)
│   ├── config/                   ← Seguridad, JWT, AOP, CORS
│   └── exceptions/               ← Manejo global de errores
│
├── domain/                       ← CAPA DE DOMINIO (Lógica Pura)
│   └── services/                 ← Reglas de negocio (@Service)
│
└── data/                         ← CAPA DE DATOS (Persistencia)
    ├── entities/                 ← Documentos MongoDB (@Document)
    │   ├── embedded/             ← Subdocumentos embebidos
    │   └── enums/                ← Enumeraciones de estado
    └── repositories/             ← Interfaces MongoRepository
```

---

## 💉 Inyección de Dependencias en Spring Boot

Spring Boot utiliza el principio de **Inversión de Control (IoC)** y **Dependency Injection (DI)** para gestionar el ciclo de vida de los componentes. En este proyecto, se usa exclusivamente **inyección por constructor** con Lombok.

### Patrón Aplicado: Constructor Injection + Lombok

```java
@Service
@RequiredArgsConstructor    // Lombok genera el constructor con todos los campos 'final'
public class UsuarioService {

    // Spring Boot detecta estos campos e inyecta automáticamente
    // las implementaciones registradas en el ApplicationContext
    private final UsuarioRepository usuarioRepository;
    private final OrganizacionRepository organizacionRepository;
    private final DepartamentoRepository departamentoRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    
    // El constructor generado por @RequiredArgsConstructor equivale a:
    // public UsuarioService(UsuarioRepository ur, OrganizacionRepository or, ...) {
    //     this.usuarioRepository = ur;
    //     this.organizacionRepository = or;
    //     ...
    // }
}
```

### ¿Por qué Constructor Injection y no `@Autowired`?

| Aspecto | `@Autowired` (Field) | Constructor (Final) |
|---|---|---|
| **Inmutabilidad** | ❌ Campos mutables | ✅ Campos `final` |
| **Testabilidad** | ❌ Requiere reflexión | ✅ Se pasan dependencias en el constructor |
| **Detección de errores** | ❌ En runtime | ✅ En compile-time |
| **Documentación** | ❌ Implícita | ✅ Explícita (se ven las dependencias) |

### Flujo de Inyección en el Proyecto

```
┌──────────────────────────────────────────────────────────────────┐
│                    Spring IoC Container                          │
│                                                                  │
│  Registra automáticamente:                                       │
│  ├── @RestController  → AuthController, UsuarioController, ...  │
│  ├── @Service         → UsuarioService, OrganizacionService, ...│
│  ├── @Repository      → UsuarioRepository (auto-implementado)  │
│  ├── @Component       → JwtUtil, JwtAuthenticationFilter        │
│  └── @Bean            → PasswordEncoder, SecurityFilterChain    │
│                                                                  │
│  Al arrancar, Spring resuelve el grafo de dependencias:          │
│                                                                  │
│  PasswordEncoder ──┐                                             │
│  UsuarioRepository─┤                                             │
│  OrgRepository ────┼──→ UsuarioService ──→ UsuarioController    │
│  DeptoRepository ──┤                                             │
│  RolRepository ────┘                                             │
│                                                                  │
│  JwtUtil ──→ JwtAuthFilter ──→ SecurityFilterChain              │
│                                                                  │
│  AuditoriaService ──→ AuditoriaAspect (AOP Transversal)        │
└──────────────────────────────────────────────────────────────────┘
```

### Anotaciones Clave del Proyecto

| Anotación | Capa | Función |
|---|---|---|
| `@SpringBootApplication` | Raíz | Punto de entrada + Auto-Configuration |
| `@RestController` | Aplicación | Marca clase como endpoint REST (JSON) |
| `@RequestMapping` | Aplicación | Define la ruta base del controlador |
| `@RequiredArgsConstructor` | Todas | Lombok genera constructor con campos `final` |
| `@Service` | Dominio | Marca clase como servicio de negocio |
| `@Component` | Aplicación | Componente genérico del IoC |
| `@Configuration` | Aplicación | Clase de configuración Spring |
| `@Bean` | Aplicación | Método que registra un bean manualmente |
| `@Document` | Datos | Mapea clase Java ↔ Colección MongoDB |
| `@Aspect` | Aplicación | Clase AOP para cross-cutting concerns |

---

## 🗄️ Colecciones MongoDB

| Colección | Entidad Java | Ciclo |
|---|---|---|
| `organizaciones` | Organizacion | ✅ Ciclo 1 |
| `departamentos` | Departamento | ✅ Ciclo 1 |
| `usuarios` | Usuario | ✅ Ciclo 1 |
| `roles` | Rol | ✅ Ciclo 1 |
| `auditoria_sistema` | AuditoriaSistema | ✅ Ciclo 1 |
| `politicas_workflow` | PoliticaWorkflow | ⚠️ Ciclo 2 |
| `tramites_instancias` | TramiteInstancia | ⚠️ Ciclo 3 |
| `eventos_historial` | EventoHistorial | ⚠️ Ciclo 3 |
| `archivos_adjuntos` | ArchivoAdjunto | ⚠️ Ciclo 3 |
| `notificaciones_push` | NotificacionPush | ⚠️ Ciclo 3 |
| `alertas_insight_ia` | AlertaInsightIA | ⚠️ Ciclo 4 |

---

## 🔐 Endpoints de la API

### Públicos (Sin JWT)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Autenticación — Retorna JWT |

### Protegidos (Requieren Bearer Token)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/organizaciones` | Crear organización (tenant) |
| `GET` | `/api/v1/organizaciones` | Listar todas las organizaciones |
| `GET` | `/api/v1/organizaciones/{id}` | Obtener organización por ID |
| `POST` | `/api/v1/departamentos` | Crear departamento |
| `GET` | `/api/v1/departamentos/organizacion/{id}` | Listar departamentos por organización |
| `POST` | `/api/v1/usuarios` | Registrar usuario (password encriptado) |
| `GET` | `/api/v1/usuarios/departamento/{id}` | Listar usuarios por departamento |
| `POST` | `/api/v1/roles` | Crear rol con permisos |
| `GET` | `/api/v1/roles` | Listar todos los roles |
| `GET` | `/api/v1/roles/{id}` | Obtener rol por ID |
| `GET` | `/api/v1/auditoria` | Listar eventos de auditoría |
| `GET` | `/api/v1/auditoria/usuario/{id}` | Filtrar auditoría por usuario |

---

## 🧪 Pruebas Unitarias

```bash
# Ejecutar todas las pruebas (excluyendo integration test de contexto)
./mvnw test -Dtest="!BackendApplicationTests"
```

| Clase de Test | Cobertura | Tests |
|---|---|---|
| `OrganizacionServiceTest` | CRUD + 404 Handler | 3 |
| `DepartamentoServiceTest` | Validación integridad jerárquica | 2 |
| `UsuarioServiceTest` | Cross-Tenant + BCrypt | 2 |
| `AuditoriaServiceTest` | Registro + Listado ordenado | 2 |
| `JwtUtilTest` | Generación, claims, expiración, anti-tampering | 5 |
| **Total** | | **14** |

---

## 🚀 Levantar el Backend

```bash
# 1. Asegurarse de que MongoDB esté corriendo
docker compose up -d

# 2. Compilar y ejecutar
./mvnw spring-boot:run

# El servidor arranca en http://localhost:8080
```

### Variables de Configuración

| Propiedad | Default | Descripción |
|---|---|---|
| `spring.data.mongodb.uri` | `mongodb://localhost:27017/bpm_workflow` | URI de conexión a MongoDB |
| `jwt.secret` | `BPM_WORKFLOW_SECRET_KEY_2026_ULTRA_SECURE_256BIT` | Clave de firma HMAC-SHA256 |
| `jwt.expiration` | `86400000` (24h) | Tiempo de vida del token en ms |

---

<p align="center">
  <sub>← <a href="../README.md">Volver al README principal</a></sub>
</p>
