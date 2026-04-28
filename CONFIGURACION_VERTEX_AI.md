# 📘 Guía Paso a Paso: Configuración de Vertex AI

Ya tienes los créditos de $300, ahora vamos a configurar el acceso técnico para que el sistema BPM pueda usar los modelos de Google Cloud.

---

## Paso 1: Habilitar la API de Vertex AI
1. Entra a la [Consola de Google Cloud](https://console.cloud.google.com/).
2. En la barra de búsqueda superior, escribe **"Vertex AI API"**.
3. Haz clic en el resultado que dice **Vertex AI API** (Mercado/API y servicios).
4. Haz clic en el botón azul **HABILITAR**.
   * *Nota: Puede tardar un par de minutos en activarse.*

---

## Paso 2: Crear la Cuenta de Servicio (Credenciales)
Para que el código de Python pueda "hablar" con Google Cloud, necesita una identidad.
1. En el menú lateral, ve a **IAM y administración** > **Cuentas de servicio**.
2. Haz clic en **+ CREAR CUENTA DE SERVICIO** (arriba).
3. **Detalles de la cuenta:**
   * Nombre: `bpm-ai-service`
   * ID: Se generará solo.
   * Descripción: Acceso del microservicio BPM a Vertex AI.
4. Haz clic en **CREAR Y CONTINUAR**.

---

## Paso 3: Asignar Permisos (Roles)
1. En la sección "Selecciona un rol", busca y elige:
   * **Usuario de Vertex AI** (Vertex AI User).
2. Haz clic en **CONTINUAR** y luego en **LISTO**.

---

## Paso 4: Generar la Llave JSON
1. En la lista de cuentas de servicio, busca la que acabas de crear (`bpm-ai-service@...`).
2. Haz clic en el nombre de la cuenta o en los tres puntos verticales al final y selecciona **Administrar claves**.
3. Haz clic en **AGREGAR CLAVE** > **Crear clave nueva**.
4. Selecciona el formato **JSON** y haz clic en **CREAR**.
5. **MUY IMPORTANTE:** Se descargará un archivo `.json` a tu computadora.
   * Guárdalo en una carpeta segura.
   * **NO** lo subas a GitHub ni lo compartas públicamente.

---

## Paso 5: Preparación para el Código
Una vez que tengas el archivo JSON:
1. Copia el archivo dentro de la carpeta del proyecto (ej: en la raíz o dentro de `ia_microservice/`).
2. Avísame el nombre del archivo (ej: `proyecto-bpm-123456-abcde.json`).
3. Yo procederé a:
   * Actualizar el archivo `.env` con la ruta de esa llave.
   * Cambiar el código de `main.py` para usar Vertex AI oficialmente.

---

**¿Ya descargaste el archivo JSON?** Confírmame para hacer la magia en el código. 🪄
