// ─────────────────────────────────────────────────────────────
// lib/features/notifications/presentation/providers/notification_providers.dart
// ─────────────────────────────────────────────────────────────

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import 'package:workflow_app/core/constants/app_constants.dart';
import 'package:workflow_app/core/providers/core_providers.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/notification_repository_impl.dart';
import '../../domain/models/notification_model.dart';
import '../../domain/repositories/notification_repository.dart';

// ── Repository Provider ───────────────────────────────────────
final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return NotificationRepositoryImpl(dio);
});

// ── Lista de todas las notificaciones del usuario ─────────────
final notificacionesProvider = FutureProvider<List<NotificationModel>>((ref) async {
  final session = ref.watch(sessionProvider);
  final user = session.valueOrNull;
  if (user == null) return [];

  final repository = ref.watch(notificationRepositoryProvider);
  return repository.getNotificaciones(user.id);
});

// ── Contador de no leídas (para el badge) ─────────────────────
final notificacionesNoLeidasProvider = FutureProvider<List<NotificationModel>>((ref) async {
  final session = ref.watch(sessionProvider);
  final user = session.valueOrNull;
  if (user == null) return [];

  final repository = ref.watch(notificationRepositoryProvider);
  return repository.getNoLeidas(user.id);
});

// ── Notificaciones en tiempo real via STOMP ────────────────────
final stompClientProvider = Provider<StompClient?>((ref) {
  final session = ref.watch(sessionProvider);
  final user = session.valueOrNull;
  if (user == null) return null;

  late StompClient client;

  client = StompClient(
    config: StompConfig.sockJS(
      url: AppConstants.wsUrl.replaceAll('/websocket', ''),
      onConnect: (frame) {
        client.subscribe(
          destination: '/topic/user/${user.id}',
          callback: (frame) {
            if (frame.body != null) {
              ref.invalidate(notificacionesProvider);
              ref.invalidate(notificacionesNoLeidasProvider);
            }
          },
        );
      },
      onWebSocketError: (error) {
        // Silenciar errores de conexión en dev
      },
    ),
  );

  client.activate();
  ref.onDispose(() {
    client.deactivate();
  });

  return client;
});
