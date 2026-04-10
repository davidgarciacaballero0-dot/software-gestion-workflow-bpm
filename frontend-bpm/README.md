<p align="center">
  <img src="https://img.shields.io/badge/Angular-20-DD0031?style=for-the-badge&logo=angular" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/RxJS-Reactive-B7178C?style=for-the-badge&logo=reactivex" />
</p>

# 🌐 Frontend BPM — Angular 20 SPA

> Interfaz de usuario del sistema BPM construida como Single Page Application con Angular 20. Implementa la **Capa de Presentación** de la arquitectura de 4 capas, con comunicación al backend vía HTTP y autenticación JWT automática.

---

## 📁 Estructura del Proyecto

```
src/app/
│
├── 📂 presentation/                  ← CAPA DE PRESENTACIÓN (UI)
│   └── features/                     ← Módulos organizados por caso de uso
│       ├── auth/
│       │   └── login/                ← Componente de Login
│       ├── organizacion/
│       │   ├── organizacion-form/    ← Formulario de creación
│       │   └── organizacion-list/    ← Listado de organizaciones
│       ├── departamento/
│       │   └── departamento-view/    ← Vista de departamentos
│       ├── usuario/
│       │   ├── usuario-form/         ← Registro de funcionarios
│       │   └── usuario-list/         ← Listado por departamento
│       ├── rol/
│       │   └── rol-view/             ← Gestión de roles
│       └── auditoria/
│           └── auditoria-list/       ← Bitácora del sistema
│
├── 📂 data/                          ← CAPA DE DATOS (Acceso a API)
│   ├── services/                     ← Servicios HTTP (@Injectable)
│   │   ├── auth.service.ts           ← Login + Token Management
│   │   ├── organizacion.service.ts   ← CRUD Organizaciones
│   │   ├── departamento.service.ts   ← CRUD Departamentos
│   │   ├── usuario.service.ts        ← Registro y consulta
│   │   ├── rol.service.ts            ← CRUD Roles
│   │   └── auditoria.service.ts      ← Consulta de auditoría
│   │
│   ├── models/                       ← Interfaces TypeScript
│   │   ├── organizacion.model.ts
│   │   ├── departamento.model.ts
│   │   ├── usuario.model.ts
│   │   ├── rol.model.ts
│   │   └── auditoria.model.ts
│   │
│   └── interceptors/
│       └── auth.interceptor.ts       ← Inyección automática de JWT
│
├── app.ts                            ← Componente raíz
├── app.html                          ← Template raíz + <router-outlet>
├── app.routes.ts                     ← Definición de rutas
└── app.config.ts                     ← Providers globales
```

---

## 🔐 Flujo de Autenticación JWT

El frontend gestiona la autenticación de forma completamente **stateless**, almacenando el JWT en `localStorage` e inyectándolo automáticamente en cada petición HTTP saliente.

```
┌────────────┐      POST /auth/login        ┌──────────────┐
│            │  ──────────────────────────→  │              │
│   Angular   │  { email, password }         │  Spring Boot │
│   (SPA)    │                               │  (Backend)   │
│            │  ←──────────────────────────  │              │
└────────────┘  { token, nombre, idRol }     └──────────────┘
      │
      │  localStorage.setItem('bpm_jwt_token', token)
      │
      ▼
┌────────────────────────────────────────────────────┐
│              AuthInterceptor (Automático)           │
│                                                    │
│  Cada petición HTTP saliente:                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  GET /api/v1/organizaciones                  │  │
│  │  Authorization: Bearer eyJhbGciOiJIUzI1Ni...│  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Excepción: /auth/login NO recibe Bearer           │
└────────────────────────────────────────────────────┘
```

### AuthService — Gestión del Token

```typescript
// Almacenamiento seguro del token después del login
login(email: string, password: string): Observable<AuthResponse> {
  return this.http.post<AuthResponse>('/api/v1/auth/login', { email, password }).pipe(
    tap(response => {
      localStorage.setItem('bpm_jwt_token', response.token);
      localStorage.setItem('bpm_user_data', JSON.stringify({
        nombre: response.nombre,
        idRol: response.idRol,
        idOrganizacion: response.idOrganizacion
      }));
    })
  );
}

// Verificación de sesión activa
isAuthenticated(): boolean {
  return this.getToken() !== null && this.getToken().length > 0;
}
```

### AuthInterceptor — Inyección Automática

```typescript
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  const token = this.authService.getToken();

  // Si hay token y NO es la ruta de login → inyectar Bearer
  if (token && !req.url.includes('/auth/login')) {
    const clonedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next.handle(clonedReq);
  }

  return next.handle(req);
}
```

---

## 🗺️ Servicios HTTP — Contratos con el Backend

| Servicio Angular | Endpoint Backend | Métodos |
|---|---|---|
| `AuthService` | `/api/v1/auth` | `login()` |
| `OrganizacionService` | `/api/v1/organizaciones` | `listarTodas()`, `obtenerPorId()`, `crear()` |
| `DepartamentoService` | `/api/v1/departamentos` | `listarPorOrganizacion()`, `crear()` |
| `UsuarioService` | `/api/v1/usuarios` | `listarPorDepartamento()`, `registrar()` |
| `RolService` | `/api/v1/roles` | `listarRoles()`, `crear()` |
| `AuditoriaService` | `/api/v1/auditoria` | `listarTodos()`, `listarPorUsuario()` |

---

## 🔧 Modelos de Datos (Interfaces TypeScript)

Los modelos TypeScript reflejan los DTOs de respuesta del backend:

```typescript
// Organizacion — Tenant del sistema
export interface Organizacion {
  id?: string;
  nombre: string;
  esquemaColores?: any;
  createdAt?: string;
  updatedAt?: string;
}

// Usuario — Funcionario del sistema
export interface Usuario {
  id?: string;
  idOrganizacion: string;
  idDepartamento: string;
  idRol: string;
  nombre: string;
  email: string;
  password?: string;   // Solo en POST (registro). NUNCA regresa del backend.
  createdAt?: string;
}
```

---

## 🚀 Levantar el Frontend

### Prerrequisitos

| Herramienta | Versión |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Angular CLI | 20+ |

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Instalar Angular CLI globalmente (si no lo tienes)
npm install -g @angular/cli

# 3. Verificar versión
ng version
```

### Ejecución en Desarrollo

```bash
# Levantar el servidor de desarrollo
ng serve

# O alternativamente
npm run start
```

> La aplicación estará disponible en **http://localhost:4200**  
> Se conecta al backend en **http://localhost:8080** (configurado via CORS)

### Compilar para Producción

```bash
ng build --configuration production
```

> Los archivos compilados se generan en `dist/frontend-bpm/`

---

## 📝 Configuración del Proxy (Desarrollo)

Para evitar problemas de CORS en desarrollo, se puede configurar un proxy que redirige las peticiones `/api` al backend:

```json
// proxy.conf.json (crear en la raíz del frontend)
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

```bash
# Levantar con proxy
ng serve --proxy-config proxy.conf.json
```

---

## 🧩 Componentes por Feature (Ciclo 1)

| Feature | Componentes | Funcionalidad |
|---|---|---|
| **Auth** | `login` | Formulario de login, almacenamiento de JWT |
| **Organización** | `organizacion-form`, `organizacion-list` | CRUD de tenants del sistema |
| **Departamento** | `departamento-view` | Vista de departamentos por organización |
| **Usuario** | `usuario-form`, `usuario-list` | Registro de funcionarios, listado por depto |
| **Rol** | `rol-view` | Gestión de roles y permisos |
| **Auditoría** | `auditoria-list` | Bitácora de operaciones del sistema |

---

## 📌 Notas Importantes

- Todos los servicios usan `providedIn: 'root'` (Singleton global via Tree-Shaking)
- El `AuthInterceptor` debe registrarse en `app.config.ts` con `provideHttpClient(withInterceptorsFromDi())`
- Las URLs de la API usan rutas relativas (`/api/v1/...`) — requieren proxy o CORS configurado
- El campo `password` en el modelo `Usuario` es **write-only**: solo se envía en POST, jamás regresa del backend

---

<p align="center">
  <sub>← <a href="../README.md">Volver al README principal</a></sub>
</p>
