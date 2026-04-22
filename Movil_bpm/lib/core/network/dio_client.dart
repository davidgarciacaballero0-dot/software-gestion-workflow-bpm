// ─────────────────────────────────────────────────────────────
// lib/core/network/dio_client.dart
// Cliente HTTP centralizado con interceptor JWT automático.
// Adjunta el Bearer token a cada request autenticado.
// ─────────────────────────────────────────────────────────────
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import 'package:workflow_app/core/constants/app_constants.dart';

class DioClient {
  DioClient._();

  static Dio build(FlutterSecureStorage storage) {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // ── Interceptor JWT: inyecta el token en cada request ──────
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.read(key: AppConstants.tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) {
          // 401 → el token expiró, la app redirigirá al login vía GoRouter
          return handler.next(error);
        },
      ),
    );

    // ── Logger de requests (solo en modo debug) ─────────────────
    dio.interceptors.add(
      PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        error: true,
        compact: true,
      ),
    );

    return dio;
  }
}
