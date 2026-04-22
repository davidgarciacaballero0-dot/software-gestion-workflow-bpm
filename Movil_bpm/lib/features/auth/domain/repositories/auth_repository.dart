// ─────────────────────────────────────────────────────────────
// lib/features/auth/domain/repositories/auth_repository.dart
// Contrato abstracto de la capa de dominio.
// La UI solo conoce esta interfaz, nunca Dio ni el backend.
// ─────────────────────────────────────────────────────────────
import 'package:workflow_app/features/auth/domain/models/user_model.dart';

abstract class AuthRepository {
  /// Autentica al usuario con email + password. Devuelve UserModel con JWT.
  Future<UserModel> login({required String email, required String password});

  /// Registra un nuevo Cliente Final. Devuelve UserModel con JWT (login automático).
  Future<UserModel> register({
    required String nombre,
    required String apellidos,
    required String ci,
    required String celular,
    required String email,
    required String password,
    String? fechaNacimiento,
  });

  /// Cierra la sesión local eliminando el JWT del dispositivo.
  Future<void> logout();

  /// Recupera el usuario guardado en SecureStorage (para restaurar sesión).
  Future<UserModel?> getStoredUser();
}
