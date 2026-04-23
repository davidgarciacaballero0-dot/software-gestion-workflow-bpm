// ─────────────────────────────────────────────────────────────
// lib/core/router/app_router.dart
// Enrutador GoRouter con redirección automática basada en sesión.
// Si el usuario está autenticado → /home. Si no → /login.
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:workflow_app/features/auth/presentation/screens/login_screen.dart';
import 'package:workflow_app/features/auth/presentation/screens/profile_screen.dart';
import 'package:workflow_app/features/auth/presentation/screens/register_screen.dart';
import 'package:workflow_app/features/home/presentation/screens/home_screen.dart';
import 'package:workflow_app/shared/widgets/main_scaffold.dart';
import 'package:workflow_app/features/catalog/presentation/screens/catalog_screen.dart';
import 'package:workflow_app/features/catalog/presentation/screens/start_procedure_screen.dart';
import 'package:workflow_app/features/catalog/domain/models/policy_model.dart';
import 'package:workflow_app/features/tramites/presentation/screens/my_procedures_screen.dart';
import 'package:workflow_app/features/tramites/presentation/screens/tracking_screen.dart';
import 'package:workflow_app/features/tramites/domain/models/tramite_model.dart';

final _shellNavigatorHomeKey = GlobalKey<NavigatorState>(debugLabel: 'shellHome');
final _shellNavigatorCatalogKey = GlobalKey<NavigatorState>(debugLabel: 'shellCatalog');
final _shellNavigatorProceduresKey = GlobalKey<NavigatorState>(debugLabel: 'shellProcedures');
final _shellNavigatorProfileKey = GlobalKey<NavigatorState>(debugLabel: 'shellProfile');

final appRouterProvider = Provider<GoRouter>((ref) {
  // Listenable que notifica a GoRouter cuando la sesión cambia
  final routerNotifier = _RouterNotifier(ref);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: routerNotifier,
    redirect: (context, state) {
      final session = ref.read(sessionProvider);

      // Mientras carga, no redirigir
      if (session.isLoading) return null;

      final isAuthenticated = session.valueOrNull != null;
      final isOnAuth = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      if (!isAuthenticated && !isOnAuth) return '/login';
      if (isAuthenticated && isOnAuth) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainScaffold(navigationShell: navigationShell);
        },
        branches: [
          // Branch 0: Home
          StatefulShellBranch(
            navigatorKey: _shellNavigatorHomeKey,
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          // Branch 1: Catálogo (Placeholder Fase 3)
          StatefulShellBranch(
            navigatorKey: _shellNavigatorCatalogKey,
            routes: [
              GoRoute(
                path: '/catalog',
                builder: (context, state) => const CatalogScreen(),
              ),
            ],
          ),
          // Branch Mis Trámites (Fase 4)
          StatefulShellBranch(
            navigatorKey: _shellNavigatorProceduresKey,
            routes: [
              GoRoute(
                path: '/my-procedures',
                builder: (context, state) => const MyProceduresScreen(),
              ),
            ],
          ),
          // Branch Perfil
          StatefulShellBranch(
            navigatorKey: _shellNavigatorProfileKey,
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      // Ruta global para Iniciar Trámite (Full Screen)
      GoRoute(
        path: '/start-procedure',
        builder: (context, state) {
          final policy = state.extra as PolicyModel;
          return StartProcedureScreen(policy: policy);
        },
      ),
      // Ruta global para Rastreo y Timeline (Full Screen)
      GoRoute(
        path: '/tracking',
        builder: (context, state) {
          final tramite = state.extra as TramiteModel;
          return ProcedureTrackingScreen(tramite: tramite);
        },
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Ruta no encontrada: ${state.uri}')),
    ),
  );
});

/// Conecta Riverpod con GoRouter para disparar redirecciones automáticas
class _RouterNotifier extends ChangeNotifier {
  _RouterNotifier(Ref ref) {
    ref.listen(sessionProvider, (_, __) => notifyListeners());
  }
}
