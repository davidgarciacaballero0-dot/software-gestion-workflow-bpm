// ─────────────────────────────────────────────────────────────
// lib/features/catalog/domain/repositories/catalog_repository.dart
// ─────────────────────────────────────────────────────────────

import '../models/policy_model.dart';

abstract class CatalogRepository {
  /// Obtiene la lista de políticas disponibles para ser iniciadas por el usuario.
  Future<List<PolicyModel>> getCatalogPolicies();
}
