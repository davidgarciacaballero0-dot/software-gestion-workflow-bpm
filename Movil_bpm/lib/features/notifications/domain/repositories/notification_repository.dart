// ─────────────────────────────────────────────────────────────
// lib/features/notifications/domain/repositories/notification_repository.dart
// ─────────────────────────────────────────────────────────────

import '../models/notification_model.dart';

abstract class NotificationRepository {
  /// Obtiene todas las notificaciones del usuario (ordenadas por fecha).
  Future<List<NotificationModel>> getNotificaciones(String usuarioId);

  /// Obtiene solo las no leídas.
  Future<List<NotificationModel>> getNoLeidas(String usuarioId);

  /// Marca una notificación como leída.
  Future<void> marcarComoLeida(String notificacionId);
}
