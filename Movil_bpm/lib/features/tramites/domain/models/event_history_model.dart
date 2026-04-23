// ─────────────────────────────────────────────────────────────
// lib/features/tramites/domain/models/event_history_model.dart
// ─────────────────────────────────────────────────────────────

class EventHistoryModel {
  final String id;
  final String idTramite;
  final String? nodoOrigenId;
  final String? nodoDestinoId;
  final String? nodoDestinoNombre;
  final String? ejecutadoPorUsuarioId;
  final String? ejecutadoPorNombre;
  final String? motivo;
  final int? tiempoSLAConsumidoMinutos;
  final String? tipoEvento;
  final DateTime? createdAt;

  EventHistoryModel({
    required this.id,
    required this.idTramite,
    this.nodoOrigenId,
    this.nodoDestinoId,
    this.nodoDestinoNombre,
    this.ejecutadoPorUsuarioId,
    this.ejecutadoPorNombre,
    this.motivo,
    this.tiempoSLAConsumidoMinutos,
    this.tipoEvento,
    this.createdAt,
  });

  factory EventHistoryModel.fromJson(Map<String, dynamic> json) {
    return EventHistoryModel(
      id: json['id'] as String,
      idTramite: json['idTramite'] as String,
      nodoOrigenId: json['nodoOrigenId'] as String?,
      nodoDestinoId: json['nodoDestinoId'] as String?,
      nodoDestinoNombre: json['nodoDestinoNombre'] as String?,
      ejecutadoPorUsuarioId: json['ejecutadoPorUsuarioId'] as String?,
      ejecutadoPorNombre: json['ejecutadoPorNombre'] as String?,
      motivo: json['motivo'] as String?,
      tiempoSLAConsumidoMinutos: json['tiempoSLAConsumidoMinutos'] as int?,
      tipoEvento: json['tipoEvento'] as String?,
      createdAt: json['createdAt'] == null ? null : DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'idTramite': idTramite,
      'nodoOrigenId': nodoOrigenId,
      'nodoDestinoId': nodoDestinoId,
      'nodoDestinoNombre': nodoDestinoNombre,
      'ejecutadoPorUsuarioId': ejecutadoPorUsuarioId,
      'ejecutadoPorNombre': ejecutadoPorNombre,
      'motivo': motivo,
      'tiempoSLAConsumidoMinutos': tiempoSLAConsumidoMinutos,
      'tipoEvento': tipoEvento,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
