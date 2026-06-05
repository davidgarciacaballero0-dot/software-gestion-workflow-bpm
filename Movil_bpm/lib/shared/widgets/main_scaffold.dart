// ─────────────────────────────────────────────────────────────
// lib/shared/widgets/main_scaffold.dart
// Scaffold principal que contiene el BottomNavigationBar
// preservando el estado de cada tab mediante GoRouter.
// Incluye badge de notificaciones no leídas (Fase 5).
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:workflow_app/features/notifications/presentation/providers/notification_providers.dart';
import 'package:workflow_app/features/ia/presentation/widgets/chatbot_widget.dart';
import 'package:workflow_app/shared/widgets/offline_banner.dart';


class MainScaffold extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const MainScaffold({
    super.key,
    required this.navigationShell,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Escuchar las notificaciones no leídas para el badge
    final noLeidasAsync = ref.watch(notificacionesNoLeidasProvider);
    final unreadCount = noLeidasAsync.valueOrNull?.length ?? 0;

    // Activar la conexión STOMP al entrar al scaffold principal
    ref.watch(stompClientProvider);

    return Scaffold(
      body: OfflineBanner(
        child: Stack(
          children: [
            navigationShell,
            const ChatbotWidget(),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          const NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            selectedIcon: Icon(Icons.list_alt),
            label: 'Catálogo',
          ),
          NavigationDestination(
            icon: SyncBadge(
              child: const Icon(Icons.history_outlined),
            ),
            selectedIcon: SyncBadge(
              child: const Icon(Icons.history),
            ),
            label: 'Trámites',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unreadCount > 0,
              label: Text('$unreadCount'),
              child: const Icon(Icons.notifications_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: unreadCount > 0,
              label: Text('$unreadCount'),
              child: const Icon(Icons.notifications),
            ),
            label: 'Alertas',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}
