// ─────────────────────────────────────────────────────────────
// lib/core/providers/core_providers.dart
// Providers de infraestructura compartida (Riverpod).
// DioClient y FlutterSecureStorage son singleton de la app.
// ─────────────────────────────────────────────────────────────
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:workflow_app/core/network/dio_client.dart';

/// Instancia única de FlutterSecureStorage
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
});

/// Instancia única de Dio (con interceptor JWT)
final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return DioClient.build(storage);
});
