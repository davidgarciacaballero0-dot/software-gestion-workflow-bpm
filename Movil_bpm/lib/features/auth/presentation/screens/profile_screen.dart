// ─────────────────────────────────────────────────────────────
// lib/features/auth/presentation/screens/profile_screen.dart
// Pantalla de Perfil — "Mis datos" (Tarea 1.4)
// Solo lectura. Muestra los datos del Cliente autenticado.
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import 'package:workflow_app/features/auth/domain/models/user_model.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);

    return session.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(body: Center(child: Text(e.toString()))),
      data: (user) {
        if (user == null) return const SizedBox.shrink();
        return _ProfileView(user: user, ref: ref);
      },
    );
  }
}

class _ProfileView extends StatelessWidget {
  final UserModel user;
  final WidgetRef ref;

  const _ProfileView({required this.user, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Mi perfil'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Cerrar sesión',
            onPressed: () async {
              await ref.read(sessionProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // ── Avatar ────────────────────────────────────────
            const SizedBox(height: 16),
            CircleAvatar(
              radius: 40,
              backgroundColor: AppTheme.primary,
              child: Text(
                user.nombre.isNotEmpty ? user.nombre[0].toUpperCase() : 'C',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              user.nombreCompleto,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F0FE),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                user.nombreRol,
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ),

            const SizedBox(height: 32),

            // ── Datos ─────────────────────────────────────────
            _DataCard(children: [
              _DataRow(icon: Icons.email_outlined,  label: 'Correo', value: user.email),
              _DataRow(icon: Icons.badge_outlined,   label: 'C.I.',   value: user.ci.isNotEmpty ? user.ci : 'No registrado'),
              _DataRow(icon: Icons.phone_outlined,   label: 'Celular', value: user.celular.isNotEmpty ? user.celular : 'No registrado'),
            ]),

            const SizedBox(height: 16),

            _DataCard(children: [
              _DataRow(
                icon: Icons.calendar_today_outlined,
                label: 'Miembro desde',
                value: _formatDate(user.createdAt),
              ),
              _DataRow(
                icon: Icons.business_outlined,
                label: 'Organización',
                value: user.idOrganizacion ?? 'Cliente externo',
              ),
            ]),
          ],
        ),
      ),
    );
  }

  String _formatDate(String raw) {
    if (raw.isEmpty) return 'N/A';
    try {
      final dt = DateTime.parse(raw);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return raw;
    }
  }
}

class _DataCard extends StatelessWidget {
  final List<Widget> children;
  const _DataCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(children: children),
      ),
    );
  }
}

class _DataRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DataRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.primary, size: 22),
      title: Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.subtle)),
      subtitle: Text(
        value,
        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15),
      ),
    );
  }
}
