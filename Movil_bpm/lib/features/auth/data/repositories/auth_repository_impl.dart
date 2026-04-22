// ─────────────────────────────────────────────────────────────
// lib/features/auth/data/repositories/auth_repository_impl.dart
// Implementación concreta del AuthRepository.
// Usa Dio para llamar al backend Spring Boot y SecureStorage
// para persistir el JWT en el dispositivo de forma cifrada.
// ─────────────────────────────────────────────────────────────
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:workflow_app/core/constants/app_constants.dart';
import 'package:workflow_app/features/auth/domain/models/user_model.dart';
import 'package:workflow_app/features/auth/domain/repositories/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthRepositoryImpl({required Dio dio, required FlutterSecureStorage storage})
      : _dio = dio,
        _storage = storage;

  // ── Login ─────────────────────────────────────────────────────
  @override
  Future<UserModel> login({required String email, required String password}) async {
    try {
      final response = await _dio.post(
        AppConstants.authLogin,
        data: {'email': email, 'password': password},
      );
      final user = UserModel.fromJson(response.data as Map<String, dynamic>);
      await _persistSession(user);
      return user;
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }

  // ── Register ──────────────────────────────────────────────────
  @override
  Future<UserModel> register({
    required String nombre,
    required String apellidos,
    required String ci,
    required String celular,
    required String email,
    required String password,
    String? fechaNacimiento,
  }) async {
    try {
      final response = await _dio.post(
        AppConstants.authRegister,
        data: {
          'nombre':          nombre,
          'apellidos':       apellidos,
          'ci':              ci,
          'celular':         celular,
          'email':           email,
          'password':        password,
          'fechaNacimiento': fechaNacimiento,
        },
      );
      final user = UserModel.fromJson(response.data as Map<String, dynamic>);
      await _persistSession(user);
      return user;
    } on DioException catch (e) {
      throw _parseError(e);
    }
  }

  // ── Logout ────────────────────────────────────────────────────
  @override
  Future<void> logout() async {
    await _storage.delete(key: AppConstants.tokenKey);
    await _storage.delete(key: AppConstants.userKey);
  }

  // ── Restore session ───────────────────────────────────────────
  @override
  Future<UserModel?> getStoredUser() async {
    try {
      final raw = await _storage.read(key: AppConstants.userKey);
      if (raw == null) return null;
      return UserModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  Future<void> _persistSession(UserModel user) async {
    await _storage.write(key: AppConstants.tokenKey, value: user.token);
    await _storage.write(key: AppConstants.userKey, value: jsonEncode(user.toJson()));
  }

  Exception _parseError(DioException e) {
    final data = e.response?.data;
    String message = 'Error de conexión. Verifique su red.';
    if (data is Map && data['error'] != null) {
      message = data['error'] as String;
    } else if (e.response?.statusCode == 409) {
      message = 'El correo electrónico ya está registrado.';
    } else if (e.response?.statusCode == 401) {
      message = 'Credenciales incorrectas. Verifique su correo o contraseña.';
    }
    return Exception(message);
  }
}
