# Plan de Despliegue BPM - Google Cloud Platform (GCP)

Este documento detalla la estrategia de despliegue para el sistema de Gestión de Trámites BPM, optimizando el uso de los $300 de créditos de prueba de GCP y asegurando una arquitectura escalable, segura y formal.

## 1. Arquitectura de Despliegue Propuesta

| Componente | Servicio GCP Recomendado | Razón |
| :--- | :--- | :--- |
| **Frontend (Angular)** | **Firebase Hosting** | Rápido, seguro (SSL automático) y optimizado para SPAs. |
| **Backend (Spring Boot)** | **Cloud Run** | Serverless, escalado automático a cero (ahorra créditos) y fácil despliegue con Docker. |
| **IA Microservice (Python)** | **Cloud Run** | Ideal para microservicios ligeros. Comparte la misma red que el backend. |
| **Base de Datos** | **MongoDB Atlas (on GCP)** | El nivel gratuito (M0) es suficiente para inicio. Se despliega en la misma región que GCP para baja latencia. |
| **Almacenamiento (Docs/Fotos)** | **Google Cloud Storage (GCS)** | Estándar de la industria, altamente disponible y económico. |
| **IA / LLM** | **Vertex AI (Gemini API)** | Integración nativa con la infraestructura de GCP. |

---

## 2. Configuración de Infraestructura (Paso a Paso)

### Fase A: Preparación de Google Cloud
1.  **Crear Proyecto:** Crear un nuevo proyecto en la consola de GCP (ej. `bpm-platform-prod`).
2.  **Habilitar APIs:**
    *   Cloud Run API
    *   Artifact Registry API
    *   Vertex AI API
    *   Cloud Storage API
3.  **Configurar Artifact Registry:** Crear un repositorio de Docker (ej. `bpm-repo`) para subir las imágenes del backend y microservicio IA.

### Fase B: Base de Datos (MongoDB Atlas)
1.  Crear una cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Desplegar un Cluster "Shared" gratuito seleccionando **Google Cloud** como proveedor y la misma región elegida para GCP (ej. `us-central1`).
3.  Configurar "Network Access" para permitir la conexión desde las IPs de Cloud Run (o usar un conector VPC si se requiere máxima seguridad).
4.  Obtener la `CONNECTION_STRING`.

### Fase C: Almacenamiento (Cloud Storage)
1.  Crear un bucket: `gs://bpm-documentos-storage`.
2.  Configurar el acceso: Crear una **Cuenta de Servicio** con el rol `Storage Object Admin`.
3.  Generar una llave JSON para que el backend pueda autenticarse.

### Fase D: Despliegue de Microservicios (Cloud Run)

#### IA Microservice
1.  Construir imagen: `docker build -t gcr.io/[PROJECT_ID]/ia-service ./ia_microservice`
2.  Subir imagen: `docker push gcr.io/[PROJECT_ID]/ia-service`
3.  Desplegar en Cloud Run:
    *   Memoria: 512MB - 1GB
    *   Variables de entorno: `GOOGLE_CLOUD_PROJECT`, `LOCATION`.

#### Backend (Spring Boot)
1.  Actualizar `application-prod.properties` con las credenciales de MongoDB Atlas y GCS.
2.  Construir imagen: `docker build -t gcr.io/[PROJECT_ID]/backend-bpm ./backend_bpm`
3.  Subir imagen: `docker push gcr.io/[PROJECT_ID]/backend-bpm`
4.  Desplegar en Cloud Run:
    *   Memoria: 1GB - 2GB (Spring Boot requiere más RAM inicial).
    *   Variables de entorno: `SPRING_PROFILES_ACTIVE=prod`, `MONGO_URI`, `IA_SERVICE_URL`.

### Fase E: Frontend (Firebase Hosting)
1.  Instalar Firebase CLI: `npm install -g firebase-tools`.
2.  Ejecutar `firebase init` en la carpeta `frontend-bpm`.
3.  Construir la app: `npm run build --prod`.
4.  Desplegar: `firebase deploy`.

---

## 3. Seguridad y Certificados
*   **SSL/TLS:** Firebase Hosting y Cloud Run proporcionan HTTPS automáticamente con certificados gestionados por Google.
*   **IAM:** Aplicar el principio de menor privilegio a las Cuentas de Servicio.
*   **Secret Manager:** Usar GCP Secret Manager para almacenar la URI de MongoDB y las llaves de API en lugar de variables de entorno en texto plano.

---

## 4. Gestión de los $300 Créditos
El uso de servicios **Serverless (Cloud Run + Firebase)** es la forma más eficiente de estirar los créditos:
*   **Costo Estimado Reposo:** $0.00 (Cloud Run escala a 0 si no hay tráfico).
*   **Costo Estimado Bajo Tráfico:** ~$5-10 USD/mes.
*   **Vertex AI:** El consumo de tokens de Gemini es muy económico, permitiendo miles de consultas dentro del presupuesto de prueba.

---

## 5. Próximos Pasos tras el Despliegue
1.  Configurar un **Dominio Personalizado** en Firebase y Cloud Run (ej. `app.tuempresa.com`).
2.  Configurar **Cloud Logging** para monitorear errores en tiempo real.
3.  Habilitar **CORS** en el backend para permitir peticiones solo desde el dominio del frontend.
