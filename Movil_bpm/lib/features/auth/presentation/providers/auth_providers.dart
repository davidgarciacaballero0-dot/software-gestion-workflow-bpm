// ─────────────────────────────────────────────────────────────
// lib/features/auth/presentation/providers/auth_providers.dart
// Providers Riverpod para la capa de presentación de Auth.
// Gestiona el estado: autenticado / cargando / error / no-auth.
// ─────────────────────────────────────────────────────────────
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/providers/core_providers.dart';
import 'package:workflow_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:workflow_app/features/auth/domain/models/user_model.dart';
import 'package:workflow_app/features/auth/domain/repositories/auth_repository.dart';

// ── 1. Repositorio ────────────────────────────────────────────
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    dio:     ref.watch(dioProvider),
    storage: ref.watch(secureStorageProvider),
  );
});

// ── 2. Estado de sesión ───────────────────────────────────────
/// Devuelve null mientras no hay sesión; UserModel cuando está autenticado.
final sessionProvider = StateNotifierProvider<SessionNotifier, AsyncValue<UserModel?>>(
  (ref) => SessionNotifier(ref.watch(authRepositoryProvider)),
);

class SessionNotifier extends StateNotifier<AsyncValue<UserModel?>> {
  final AuthRepository _repo;

  SessionNotifier(this._repo) : super(const AsyncValue.loading()) {
    _restore();
  }

  /// Intenta restaurar la sesión guardada al arrancar la app
  Future<void> _restore() async {
    final user = await _repo.getStoredUser();
    state = AsyncValue.data(user);
  }

  /// Login con email + password
  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final user = await _repo.login(email: email, password: password);
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Registro de nuevo cliente (rol CLIENTE automático)
  Future<void> register({
    required String nombre,
    required String apellidos,
    required String ci,
    required String celular,
    required String email,
    required String password,
  }) async {
    state = const AsyncValue.loading();
    try {
      final user = await _repo.register(
        nombre:    nombre,
        apellidos: apellidos,
        ci:        ci,
        celular:   celular,
        email:     email,
        password:  password,
      );
      state = AsyncValue.data(user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Cierra sesión y limpia el storage
  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncValue.data(null);
  }
}
