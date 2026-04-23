Actúa como un Senior Mobile Engineer experto en Flutter y Dart. Tu objetivo es desarrollar una aplicación móvil B2C (Business-to-Consumer) exclusiva para el "Cliente Final" de nuestro sistema de Gestión de Trámites (BPM). 

El único propósito de esta app es que el cliente pueda iniciar sus propios trámites y rastrear su estado en tiempo real. NO debe contener lógica administrativa ni de aprobación.

### 🏛️ ARQUITECTURA Y ESTÁNDARES:
- Patrón de Diseño: Clean Architecture por Features (Auth, Tramites, Notificaciones).
- Gestor de Estado: Riverpod.
- Cliente HTTP: Dio (con interceptor para JWT).
- UI/UX: "Client-Friendly & Minimalist". Material 3. Uso de mucho espacio en blanco, tipografía grande y legible, y colores que transmitan confianza (ej. azul corporativo y verde para éxito). Prohibido el uso de emojis.

### 📦 PLAN DE DESARROLLO POR FASES (SCALABLE ROADMAP):

Para asegurar un desarrollo ordenado y escalable, el proyecto se dividirá en las siguientes fases, desde lo más fundamental hasta lo más complejo:

#### FASE 0: Preparación del Entorno (Antes de escribir código) ✅
- **Tarea 0.1:** Instalar y configurar el SDK de Flutter y Dart en la máquina local. ✅
- **Tarea 0.2:** Configurar el entorno de desarrollo (Android Studio / VS Code con sus respectivas extensiones) y el emulador. ✅
- **Tarea 0.3:** Crear el proyecto base ejecutando el comando `flutter create WorkFlow_App`. ✅
- **Tarea 0.4:** Limpiar el código por defecto (`main.dart`) e instalar dependencias iniciales en el `pubspec.yaml` (ej. flutter_riverpod, dio, flutter_secure_storage). ✅
- **Tarea 0.5:** Crear la estructura de carpetas inicial basada en Clean Architecture (core, features, shared). ✅

#### FASE 1: Fundación y Autenticación (Lo más simple) ✅
- **Tarea 1.1:** Setup del proyecto (Riverpod, Dio, Clean Architecture, Theme Material 3). ✅
- **Tarea 1.2:** Pantalla de Login simple y almacenamiento de sesión con `flutter_secure_storage`. ✅
- **Tarea 1.3:** Registro de nuevo cliente. *(Nota Backend: Actualmente falta el endpoint de Registro público en `AuthController`, se debe crear).* ✅
- **Tarea 1.4:** Pantalla de Perfil básica (Mis datos). ✅

#### FASE 2: Navegación y Home (Core Básico) ✅
- **Tarea 2.1:** Implementación del Bottom Navigation Bar o Menú Principal. ✅
- **Tarea 2.2:** Home / Dashboard con resumen visual rápido (ej. "Tienes 2 trámites en proceso"). ✅
- **Tarea 2.3:** Integración de la vista rápida de "Mis Trámites Activos" en el Dashboard. ✅

#### FASE 3: Catálogo e Inicio de Trámites (Intermedio) ✅
- **Tarea 3.1:** Pantalla del "Catálogo de Trámites" disponibles para el público. ✅
- **Tarea 3.2:** Renderizado del formulario dinámico inicial al seleccionar un trámite para llenado de datos. ✅
- **Tarea 3.3:** Módulo para subir fotos de requisitos desde la cámara o galería (File Uploader conectado a GridFS). ✅
- **Tarea 3.4:** Conexión con el endpoint de inicio de trámite (`Submission`). ✅

#### FASE 4: Seguimiento y Timeline (Complejo - Núcleo de Valor) 🚧
- **Tarea 4.1:** Pantalla de lista detallada "Mis Trámites" (Pendientes, En Proceso, Finalizados). 🚧
- **Tarea 4.2:** **(CRÍTICO)** Pantalla de "Rastreo" (Tracking) de solo lectura.
- **Tarea 4.3:** Componente visual tipo "Stepper" vertical o "Línea de Tiempo" (Timeline). Debe mostrar:
   - Departamento en el que se encuentra actualmente el trámite.
   - Pasos ya completados (con fecha y hora).
   - Estado de SLA (si está en tiempo o demorado).
- **Tarea 4.4:** Lógica UI para "Subsanar un documento" (el único caso donde se permite edición en esta vista).

#### FASE 5: Tiempo Real y Retención (Avanzado)
- **Tarea 5.1:** Conexión WebSocket para recibir alertas push.
- **Tarea 5.2:** Mostrar notificaciones in-app (Toast o Banner superior) al cambiar de estado (ej. "Su solicitud ha sido Aprobada").
- **Tarea 5.3:** Pestaña / Centro de Notificaciones con el historial de alertas leídas. *(Nota Backend: Se requiere crear un `NotificationController` con un endpoint GET para recuperar el historial de notificaciones).*

### 🛠️ INSTRUCCIONES DE EJECUCIÓN:
Genera el código base en Flutter siguiendo estrictamente el orden de las fases descritas arriba. Comienza ejecutando la **FASE 1**. Para cada tarea, asegúrate de implementar la capa de Dominio (Entities/Models), la capa de Datos (Repository/API) y la capa de Presentación (UI/Providers) antes de pasar a la siguiente tarea.

> **NOTA IMPORTANTE DE SINCRONIZACIÓN:** El endpoint de **Registro de Nuevos Clientes** que se creará en el Backend para dar soporte a la app móvil (Fase 1), también deberá ser integrado en el **Frontend Web (Angular)**. El equipo web debe diseñar una pantalla de registro público para que los clientes puedan crear sus cuentas desde el navegador de escritorio.
