// ─────────────────────────────────────────────────────────────
// lib/features/notifications/data/repositories/notification_repository_impl.dart
// ─────────────────────────────────────────────────────────────

import 'package:dio/dio.dart';
import '../../domain/models/notification_model.dart';
import '../../domain/repositories/notification_repository.dart';

class NotificationRepositoryImpl implements NotificationRepository {
  final Dio _dio;

  NotificationRepositoryImpl(this._dio);

  @override
  Future<List<NotificationModel>> getNotificaciones(String usuarioId) async {
    try {
      final response = await _dio.get('/notificaciones/usuario/$usuarioId');
      final data = response.data as List;
      return data.map((json) => NotificationModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al obtener notificaciones: $e');
    }
  }

  @override
  Future<List<NotificationModel>> getNoLeidas(String usuarioId) async {
    try {
      final response = await _dio.get('/notificaciones/usuario/$usuarioId/no-leidas');
      final data = response.data as List;
      return data.map((json) => NotificationModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al obtener notificaciones no leídas: $e');
    }
  }

  @override
  Future<void> marcarComoLeida(String notificacionId) async {
    try {
      await _dio.patch('/notificaciones/$notificacionId/leer');
    } catch (e) {
      throw Exception('Error al marcar notificación como leída: $e');
    }
  }
}
