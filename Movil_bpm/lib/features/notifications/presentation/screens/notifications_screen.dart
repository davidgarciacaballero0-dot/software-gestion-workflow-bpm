// ─────────────────────────────────────────────────────────────
// lib/features/notifications/presentation/screens/notifications_screen.dart
// ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import '../providers/notification_providers.dart';
import '../../domain/models/notification_model.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificacionesAsync = ref.watch(notificacionesProvider);

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Notificaciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(notificacionesProvider);
              ref.invalidate(notificacionesNoLeidasProvider);
            },
          )
        ],
      ),
      body: notificacionesAsync.when(
        data: (notificaciones) {
          if (notificaciones.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off_outlined,
                      size: 64, color: AppTheme.subtle.withValues(alpha: 0.4)),
                  const SizedBox(height: 16),
                  Text(
                    'No tienes notificaciones',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppTheme.subtle,
                        ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(notificacionesProvider);
              ref.invalidate(notificacionesNoLeidasProvider);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: notificaciones.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final notif = notificaciones[index];
                return _NotificationCard(
                  notification: notif,
                  onTap: () async {
                    if (!notif.leida) {
                      final repo = ref.read(notificationRepositoryProvider);
                      await repo.marcarComoLeida(notif.id);
                      ref.invalidate(notificacionesProvider);
                      ref.invalidate(notificacionesNoLeidasProvider);
                    }
                  },
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Text('Error: $err', style: TextStyle(color: Colors.red.shade800)),
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback onTap;

  const _NotificationCard({required this.notification, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isUnread = !notification.leida;

    return Container(
      decoration: BoxDecoration(
        color: isUnread ? Colors.blue.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isUnread ? AppTheme.primary.withValues(alpha: 0.3) : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isUnread
                        ? AppTheme.primary.withValues(alpha: 0.1)
                        : Colors.grey.shade100,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isUnread ? Icons.notifications_active : Icons.notifications_outlined,
                    color: isUnread ? AppTheme.primary : AppTheme.subtle,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        notification.titulo,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: isUnread ? FontWeight.bold : FontWeight.w500,
                              color: isUnread ? Colors.black87 : AppTheme.subtle,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.mensaje,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.subtle,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (notification.createdAt != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          DateFormat('dd MMM yyyy, HH:mm').format(notification.createdAt!),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppTheme.subtle.withValues(alpha: 0.6),
                                fontSize: 11,
                              ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (isUnread)
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
