# Entorno Móvil (Flutter) - Implementación Futura

Esta carpeta (`MOBILE`) se encuentra reservada estructuralmente para el futuro desarrollo de la aplicación móvil del sistema Workflow BPM.

## Detalles de Implementación (Fases Posteriores)
- **Framework:** Flutter (Lenguaje Dart).
- **Propósito:** Permitir a los funcionarios visualizar sus bandejas, aprobar trámites y recibir notificaciones push directamente desde su teléfono celular.
- **Comunicación:** Consumirá la API REST del backend principal (Spring Boot) e implementará WebSockets para la actualización en tiempo real de la bandeja de entrada.

## Inicialización
Cuando lleguemos al ciclo que requiera la aplicación móvil, este directorio se configurará eliminando este archivo temporal e inicializando el proyecto directamente mediante el CLI de Flutter:
```bash
flutter create .
```
