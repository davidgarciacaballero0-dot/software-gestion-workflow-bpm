// ─────────────────────────────────────────────────────────────
// lib/core/constants/app_constants.dart
// Centraliza la URL base del backend y otras constantes globales.
// ─────────────────────────────────────────────────────────────

class AppConstants {
  AppConstants._();

  // ── Backend ──────────────────────────────────────────────────
  // Para el emulador de Android usa 10.0.2.2 en lugar de localhost.
  // En dispositivo físico, usa la IP local del equipo (p.ej. 192.168.x.x).
  static const String baseUrl = 'http://10.0.2.2:8080/api/v1';

  // ── JWT ──────────────────────────────────────────────────────
  static const String tokenKey = 'bpm_jwt_token';
  static const String userKey  = 'bpm_user_data';

  // ── Rutas Nativas Auth ───────────────────────────────────────
  static const String authLogin    = '/auth/login';
  static const String authRegister = '/auth/register';

  // ── Rol del cliente (consistente con DataInitializer) ────────
  static const String rolCliente = 'CLIENTE';
}
