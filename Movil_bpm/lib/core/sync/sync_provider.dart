import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SyncNotifier extends StateNotifier<bool> {
  SyncNotifier() : super(false) {
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.contains(ConnectivityResult.mobile) || results.contains(ConnectivityResult.wifi)) {
        // Red recuperada, intentar sincronización
        _syncPendingData();
      }
    });
  }

  Future<void> _syncPendingData() async {
    state = true; // Sincronizando
    try {
      // TODO: Recuperar trámites pendientes de Isar y enviarlos al backend con Dio
      await Future.delayed(const Duration(seconds: 2)); // Simular carga
    } catch (e) {
      // Manejar error de sincronización
    } finally {
      state = false; // Fin sincronización
    }
  }

  // Permite forzar sincronización manual
  Future<void> forceSync() async => _syncPendingData();
}

final syncProvider = StateNotifierProvider<SyncNotifier, bool>((ref) {
  return SyncNotifier();
});
