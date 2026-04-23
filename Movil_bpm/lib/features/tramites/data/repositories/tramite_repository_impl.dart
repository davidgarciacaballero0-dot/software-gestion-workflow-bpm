// ─────────────────────────────────────────────────────────────
// lib/features/tramites/data/repositories/tramite_repository_impl.dart
// Implementación del repositorio conectándose con Dio.
// ─────────────────────────────────────────────────────────────
import 'package:dio/dio.dart';
import 'package:workflow_app/features/tramites/domain/models/tramite_model.dart';
import 'package:workflow_app/features/tramites/domain/repositories/tramite_repository.dart';

class TramiteRepositoryImpl implements TramiteRepository {
  final Dio _dio;

  TramiteRepositoryImpl(this._dio);

  @override
  Future<List<TramiteModel>> getMisTramites(String usuarioId) async {
    try {
      final response = await _dio.get('/tramites/solicitante/$usuarioId');
      final data = response.data as List;
      return data.map((json) => TramiteModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al obtener trámites activos: $e');
    }
  }

  @override
  Future<TramiteModel> iniciarTramite({
    required String idPolitica,
    required String idUsuarioSolicitante,
    required Map<String, dynamic> datosIniciales,
  }) async {
    try {
      final response = await _dio.post(
        '/tramites/iniciar',
        data: {
          'idPolitica': idPolitica,
          'idUsuarioSolicitante': idUsuarioSolicitante,
          'prioridad': 1,
          'datosIniciales': datosIniciales,
        },
      );
      return TramiteModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al iniciar el trámite: $e');
    }
  }
}
