// ─────────────────────────────────────────────────────────────
// lib/features/tramites/data/repositories/tramite_repository_impl.dart
// Implementación del repositorio conectándose con Dio.
// ─────────────────────────────────────────────────────────────
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:workflow_app/features/tramites/domain/models/tramite_model.dart';
import 'package:workflow_app/features/tramites/domain/models/event_history_model.dart';
import 'package:workflow_app/features/tramites/domain/repositories/tramite_repository.dart';

class TramiteRepositoryImpl implements TramiteRepository {
  final Dio _dio;
  final Box<String> _cacheBox = Hive.box<String>('tramites_cache');

  TramiteRepositoryImpl(this._dio);

  @override
  Future<List<TramiteModel>> getMisTramites(String usuarioId) async {
    final cacheKey = 'mis_tramites_$usuarioId';
    try {
      final response = await _dio.get('/tramites/solicitante/$usuarioId');
      final data = response.data as List;
      
      // Save to cache
      _cacheBox.put(cacheKey, jsonEncode(data));
      
      return data.map((json) => TramiteModel.fromJson(json)).toList();
    } catch (e) {
      // Fallback to cache if offline or error
      final cachedData = _cacheBox.get(cacheKey);
      if (cachedData != null) {
        final List decodedData = jsonDecode(cachedData);
        return decodedData.map((json) => TramiteModel.fromJson(json)).toList();
      }
      throw Exception('Sin conexión y sin datos cacheados para trámites activos.');
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

  @override
  Future<List<EventHistoryModel>> getHistorialTramite(String tramiteId) async {
    final cacheKey = 'historial_$tramiteId';
    try {
      final response = await _dio.get('/tramites/$tramiteId/historial');
      final data = response.data as List;
      
      // Save to cache
      _cacheBox.put(cacheKey, jsonEncode(data));
      
      return data.map((json) => EventHistoryModel.fromJson(json)).toList();
    } catch (e) {
      // Fallback to cache if offline or error
      final cachedData = _cacheBox.get(cacheKey);
      if (cachedData != null) {
        final List decodedData = jsonDecode(cachedData);
        return decodedData.map((json) => EventHistoryModel.fromJson(json)).toList();
      }
      throw Exception('Sin conexión y sin historial en caché.');
    }
  }

  @override
  Future<TramiteModel> avanzarTramite({
    required String idTramite,
    required String idUsuarioAccion,
    required Map<String, dynamic> datosFormulario,
  }) async {
    try {
      final response = await _dio.post(
        '/tramites/avanzar',
        data: {
          'idTramite': idTramite,
          'idUsuarioAccion': idUsuarioAccion,
          'datosFormulario': datosFormulario,
        },
      );
      return TramiteModel.fromJson(response.data);
    } catch (e) {
      throw Exception('Error al avanzar el trámite: $e');
    }
  }
}
