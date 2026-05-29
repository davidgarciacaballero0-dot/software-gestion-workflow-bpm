// ─────────────────────────────────────────────────────────────
// lib/core/constants/app_constants.dart
// Centraliza la URL base del backend y otras constantes globales.
// ─────────────────────────────────────────────────────────────

class AppConstants {
  AppConstants._();

  // ── Backend ──────────────────────────────────────────────────
  // Para el emulador de Android usa 10.0.2.2 en lugar de localhost.
  // En dispositivo físico, usa la IP local del equipo (p.ej. 192.168.x.x) o el servidor en la nube.
  static const String baseUrl = 'https://backend-spring-241130514391.us-central1.run.app/api/v1';

  // ── WebSocket (STOMP) ────────────────────────────────────────
  static const String wsUrl = 'https://backend-spring-241130514391.us-central1.run.app/ws-bpm/websocket';

  // ── JWT ──────────────────────────────────────────────────────
  static const String tokenKey = 'bpm_jwt_token';
  static const String userKey  = 'bpm_user_data';

  // ── Rutas Nativas Auth ───────────────────────────────────────
  static const String authLogin    = '/auth/login';
  static const String authRegister = '/auth/register';

  // ── Rol del cliente (consistente con DataInitializer) ────────
  static const String rolCliente = 'CLIENTE';
  // ── IA & Voz (ElevenLabs) ───────────────────────────────────
  static const String elevenLabsVoiceId = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice
  static const String elevenLabsApiKey  = 'sk_e416995838804ecd738956dd0b79eebdb12e59f356e2a661';
}
