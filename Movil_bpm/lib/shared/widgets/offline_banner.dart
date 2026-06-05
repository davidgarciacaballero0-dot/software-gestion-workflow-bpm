// ─────────────────────────────────────────────────────────────
// lib/shared/widgets/offline_banner.dart
// Banner y badge de estado offline con cola de sincronización.
// Se muestra sobre el contenido cuando la app pierde conexión.
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:workflow_app/core/services/sync_queue_service.dart';

// ── Providers ──────────────────────────────────────────────────

final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

final isOnlineProvider = Provider<bool>((ref) {
  final connectivity = ref.watch(connectivityProvider);
  return connectivity.when(
    data: (results) =>
        results.isNotEmpty && results.first != ConnectivityResult.none,
    loading: () => true,
    error: (_, __) => true,
  );
});

final syncQueueCountProvider = Provider<int>((ref) {
  try {
    final box = Hive.box<String>(SyncQueueService.boxName);
    return box.length;
  } catch (_) {
    return 0;
  }
});

// ── Widget: Banner Offline ──────────────────────────────────

class OfflineBanner extends ConsumerWidget {
  final Widget child;

  const OfflineBanner({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);
    final pendingOps = ref.watch(syncQueueCountProvider);

    return Column(
      children: [
        // Banner de conexión
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          height: isOnline ? 0 : 36,
          color: isOnline ? Colors.green.shade700 : Colors.orange.shade800,
          child: isOnline
              ? const SizedBox.shrink()
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.cloud_off, color: Colors.white, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      pendingOps > 0
                          ? '📡 Sin conexión — $pendingOps operación(es) pendiente(s)'
                          : '📡 Sin conexión — Los cambios se sincronizarán al reconectar',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
        ),
        // Barra de sincronización al reconectar
        if (isOnline && pendingOps > 0)
          Container(
            height: 28,
            color: Colors.blue.shade700,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Sincronizando $pendingOps operación(es)...',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        // Contenido principal
        Expanded(child: child),
      ],
    );
  }
}

// ── Widget: Badge de Operaciones Pendientes ─────────────────

class SyncBadge extends ConsumerWidget {
  final Widget child;

  const SyncBadge({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingOps = ref.watch(syncQueueCountProvider);
    final isOnline = ref.watch(isOnlineProvider);

    return Badge(
      isLabelVisible: pendingOps > 0 && !isOnline,
      label: Text('$pendingOps'),
      backgroundColor: Colors.orange,
      child: child,
    );
  }
}
