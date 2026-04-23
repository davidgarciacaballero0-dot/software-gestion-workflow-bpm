// ─────────────────────────────────────────────────────────────
// lib/features/tramites/presentation/providers/tramite_providers.dart
// Providers para exponer el repositorio y el estado de trámites.
// ─────────────────────────────────────────────────────────────
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/providers/core_providers.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:workflow_app/features/tramites/data/repositories/tramite_repository_impl.dart';
import 'package:workflow_app/features/tramites/domain/models/tramite_model.dart';
import 'package:workflow_app/features/tramites/domain/models/event_history_model.dart';
import 'package:workflow_app/features/tramites/domain/repositories/tramite_repository.dart';

// Provider del Repositorio
final tramiteRepositoryProvider = Provider<TramiteRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return TramiteRepositoryImpl(dio);
});

// Provider para la lista de "Mis Trámites Activos"
final misTramitesProvider = FutureProvider<List<TramiteModel>>((ref) async {
  final session = ref.watch(sessionProvider);
  final user = session.valueOrNull;

  if (user == null) {
    return [];
  }

  final repository = ref.watch(tramiteRepositoryProvider);
  return repository.getMisTramites(user.id);
});

final historialTramiteProvider = FutureProvider.family<List<EventHistoryModel>, String>((ref, tramiteId) async {
  final repository = ref.watch(tramiteRepositoryProvider);
  return repository.getHistorialTramite(tramiteId);
});
