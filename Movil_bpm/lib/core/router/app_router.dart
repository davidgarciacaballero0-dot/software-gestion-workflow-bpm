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
      GoRoute(path: '/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/home',     builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/profile',  builder: (_, __) => const ProfileScreen()),
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
