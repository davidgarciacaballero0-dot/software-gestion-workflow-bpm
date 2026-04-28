# Guía de Despliegue: Sistema BPM Inteligente

Esta guía detalla el proceso de despliegue del ecosistema BPM utilizando la suite de **Google Cloud Platform (GCP)** y **MongoDB Atlas**. Esta arquitectura es 100% Serverless, garantizando escalabilidad y costos optimizados.

---

## 1. Persistencia: MongoDB Atlas (GCP Region)

La base de datos reside en un cluster gestionado fuera del servidor de aplicaciones para garantizar la integridad de los datos.

*   **Proveedor:** MongoDB Atlas.
*   **Región:** Seleccionar la misma región de GCP que los servicios de cómputo (ej: `us-central1`).
*   **Configuración Clave:**
    1.  Crear base de datos `bpm_db`.
    2.  Configurar **Network Access**: Agregar las IPs de salida de Google Cloud Run o permitir `0.0.0.0/0` (con usuario/password fuerte).
    3.  Obtener la **Connection String**: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/bpm_db`.

---

## 2. Backend: Google Cloud Run

El núcleo del sistema (Spring Boot) se despliega como un servicio de contenedor gestionado.

*   **Servicio:** Cloud Run.
*   **Método de Despliegue:**
    ```bash
    gcloud run deploy bpm-backend --source . --region us-central1 --allow-unauthenticated
    ```
*   **Variables de Entorno necesarias:**
    *   `SPRING_DATA_MONGODB_URI`: El link de MongoDB Atlas.
    *   `GOOGLE_CLOUD_PROJECT`: ID de tu proyecto en GCP.
    *   `JWT_SECRET`: Llave para la firma de tokens de seguridad.

---

## 3. Frontend Web: Firebase Hosting

La interfaz de usuario Angular se sirve desde el CDN global de Google para una velocidad de carga óptima.

*   **Servicio:** Firebase Hosting.
*   **Pasos:**
    1.  `ng build --configuration production` (Genera carpeta `dist/`).
    2.  `firebase init hosting` (Seleccionar carpeta `dist/`).
    3.  `firebase deploy --only hosting`.
*   **URL Resultante:** `https://tu-proyecto.web.app`.

---

## 4. Gestión Documental: Google Cloud Storage

En lugar de GridFS, los archivos pesados (PDFs de trámites) se almacenan en Buckets de Google.

*   **Servicio:** Cloud Storage (GCS).
*   **Configuración:**
    1.  Crear un Bucket privado: `gs://bpm-documentos-bucket`.
    2.  Otorgar permisos `Storage Object Admin` a la cuenta de servicio de Cloud Run.
    3.  Los archivos se referencian en la colección `archivos_adjuntos` de MongoDB mediante su nombre en el Bucket.

---

## 5. Inteligencia Artificial: Vertex AI

El procesamiento de NLP y analítica predictiva se realiza mediante la integración nativa con Gemini.

*   **Servicio:** Vertex AI API.
*   **Integración:**
    1.  Habilitar la API de Vertex AI en la consola de Google.
    2.  El Backend utiliza la librería `google-cloud-vertexai` para comunicarse con el modelo `gemini-1.5-pro`.

---

## 6. App Móvil: Firebase App Distribution

La aplicación Flutter se distribuye a los usuarios finales de forma controlada.

*   **Servicio:** Firebase App Distribution.
*   **Proceso:**
    1.  Generar APK/IPA: `flutter build apk`.
    2.  Subir el binario a Firebase Console para que los usuarios (Clientes/Funcionarios) lo descarguen.

---

## Resumen de Conectividad

| Componente | Se comunica con | Vía |
| :--- | :--- | :--- |
| **Angular Web** | Cloud Run | HTTPS / JSON |
| **Cloud Run** | MongoDB Atlas | Protocolo Mongo (27017) |
| **Cloud Run** | Cloud Storage | Google SDK (gRPC) |
| **Cloud Run** | Vertex AI | Google SDK (gRPC) |

---
**Nota:** Asegúrese de que todas las APIs de Google Cloud mencionadas estén en estado "Enabled" antes de iniciar el despliegue.
