// ─────────────────────────────────────────────────────────────
// lib/features/tramites/domain/repositories/tramite_repository.dart
// Interfaz del repositorio de trámites.
// ─────────────────────────────────────────────────────────────
import 'package:workflow_app/features/tramites/domain/models/tramite_model.dart';
import 'package:workflow_app/features/tramites/domain/models/event_history_model.dart';

abstract class TramiteRepository {
  /// Obtiene la lista de trámites activos de un usuario (Cliente).
  Future<List<TramiteModel>> getMisTramites(String usuarioId);

  /// Inicia un nuevo trámite.
  Future<TramiteModel> iniciarTramite({
    required String idPolitica,
    required String idUsuarioSolicitante,
    required Map<String, dynamic> datosIniciales,
  });

  /// Obtiene el historial de eventos de un trámite.
  Future<List<EventHistoryModel>> getHistorialTramite(String tramiteId);

  /// Avanza o subsana un trámite.
  Future<TramiteModel> avanzarTramite({
    required String idTramite,
    required String idUsuarioAccion,
    required Map<String, dynamic> datosFormulario,
  });
}
