// ─────────────────────────────────────────────────────────────
// lib/features/tramites/domain/models/tramite_model.dart
// Entidad que representa un Trámite mapeado desde el Backend.
// ─────────────────────────────────────────────────────────────

class TramiteModel {
  final String id;
  final String codigoTramite;
  final String idPolitica;
  final String nombrePolitica;
  final String estadoActual;
  final String? nodoActualId;
  final String nombreNodoActual;
  final String? nombreDepartamentoActual;
  final int prioridad;
  final DateTime createdAt;

  TramiteModel({
    required this.id,
    required this.codigoTramite,
    required this.idPolitica,
    required this.nombrePolitica,
    required this.estadoActual,
    this.nodoActualId,
    required this.nombreNodoActual,
    this.nombreDepartamentoActual,
    required this.prioridad,
    required this.createdAt,
  });

  factory TramiteModel.fromJson(Map<String, dynamic> json) {
    return TramiteModel(
      id: json['id'] ?? '',
      codigoTramite: json['codigoTramite'] ?? '',
      idPolitica: json['idPolitica'] ?? '',
      nombrePolitica: json['nombrePolitica'] ?? 'Sin Nombre',
      estadoActual: json['estadoActual'] ?? 'PENDIENTE',
      nodoActualId: json['nodoActualId'],
      nombreNodoActual: json['nombreNodoActual'] ?? '',
      nombreDepartamentoActual: json['nombreDepartamentoActual'],
      prioridad: json['prioridad'] ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
}
