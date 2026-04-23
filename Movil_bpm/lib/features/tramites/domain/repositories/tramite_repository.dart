// ─────────────────────────────────────────────────────────────
// lib/features/tramites/domain/repositories/tramite_repository.dart
// Interfaz del repositorio de trámites.
// ─────────────────────────────────────────────────────────────
import 'package:workflow_app/features/tramites/domain/models/tramite_model.dart';

abstract class TramiteRepository {
  /// Obtiene la lista de trámites activos de un usuario (Cliente).
  Future<List<TramiteModel>> getMisTramites(String usuarioId);

  /// Inicia un nuevo trámite.
  Future<TramiteModel> iniciarTramite({
    required String idPolitica,
    required String idUsuarioSolicitante,
    required Map<String, dynamic> datosIniciales,
  });
}
