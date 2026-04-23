// ─────────────────────────────────────────────────────────────
// lib/features/catalog/data/repositories/catalog_repository_impl.dart
// ─────────────────────────────────────────────────────────────

import 'package:dio/dio.dart';
import '../../domain/models/policy_model.dart';
import '../../domain/repositories/catalog_repository.dart';

class CatalogRepositoryImpl implements CatalogRepository {
  final Dio _dio;

  CatalogRepositoryImpl(this._dio);

  @override
  Future<List<PolicyModel>> getCatalogPolicies() async {
    try {
      final response = await _dio.get('/policies/catalog');
      final data = response.data as List;
      return data.map((json) => PolicyModel.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Error al obtener el catálogo de trámites: $e');
    }
  }
}
