// ─────────────────────────────────────────────────────────────
// lib/features/notifications/domain/models/notification_model.dart
// ─────────────────────────────────────────────────────────────

class NotificationModel {
  final String id;
  final String? idUsuarioDestino;
  final String titulo;
  final String mensaje;
  final bool leida;
  final DateTime? createdAt;

  NotificationModel({
    required this.id,
    this.idUsuarioDestino,
    required this.titulo,
    required this.mensaje,
    required this.leida,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? '',
      idUsuarioDestino: json['idUsuarioDestino'] as String?,
      titulo: json['titulo'] ?? '',
      mensaje: json['mensaje'] ?? '',
      leida: json['leida'] ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'idUsuarioDestino': idUsuarioDestino,
      'titulo': titulo,
      'mensaje': mensaje,
      'leida': leida,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
