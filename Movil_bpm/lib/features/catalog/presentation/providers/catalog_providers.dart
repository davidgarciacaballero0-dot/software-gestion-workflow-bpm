// ─────────────────────────────────────────────────────────────
// lib/features/catalog/presentation/providers/catalog_providers.dart
// ─────────────────────────────────────────────────────────────

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/providers/core_providers.dart';
import '../../domain/models/policy_model.dart';
import '../../domain/repositories/catalog_repository.dart';
import '../../data/repositories/catalog_repository_impl.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return CatalogRepositoryImpl(dio);
});

final catalogPoliciesProvider = FutureProvider<List<PolicyModel>>((ref) async {
  final repository = ref.watch(catalogRepositoryProvider);
  return repository.getCatalogPolicies();
});
