// ─────────────────────────────────────────────────────────────
// lib/features/tramites/presentation/providers/tramite_providers.dart
// Providers para exponer el repositorio y el estado de trámites.
// ─────────────────────────────────────────────────────────────
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/providers/core_providers.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:workflow_app/features/tramites/data/repositories/tramite_repository_impl.dart';
import 'package:workflow_app/features/tramites/domain/models/tramite_model.dart';
import 'package:workflow_app/features/tramites/domain/repositories/tramite_repository.dart';

// Provider del Repositorio
final tramiteRepositoryProvider = Provider<TramiteRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return TramiteRepositoryImpl(dio);
});

// Provider para la lista de "Mis Trámites Activos"
final misTramitesProvider = FutureProvider<List<TramiteModel>>((ref) async {
  final repository = ref.watch(tramiteRepositoryProvider);
  final session = ref.watch(sessionProvider).valueOrNull;

  if (session == null) {
    return [];
  }

  // Se usa el id del usuario de la sesión actual
  return repository.getMisTramites(session.id);
});
