import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:animate_do/animate_do.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import 'package:workflow_app/features/auth/domain/models/user_model.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);

    return session.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(body: Center(child: Text(e.toString()))),
      data: (user) {
        if (user == null) return const SizedBox.shrink();
        return _ProfileGlassView(user: user, ref: ref);
      },
    );
  }
}

class _ProfileGlassView extends StatelessWidget {
  final UserModel user;
  final WidgetRef ref;

  const _ProfileGlassView({required this.user, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppTheme.primary),
            onPressed: () async {
              await ref.read(sessionProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topRight,
            radius: 1.5,
            colors: [Color(0x26070235), Colors.white],
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 100),
          child: Column(
            children: [
              FadeInDown(
                child: _buildHeader(context),
              ),
              const SizedBox(height: 40),
              FadeInUp(
                delay: const Duration(milliseconds: 200),
                child: _buildGlassCard(context),
              ),
              const SizedBox(height: 24),
              Text(
                'Miembro desde: ${_formatDate(user.createdAt)}',
                style: const TextStyle(fontSize: 12, color: AppTheme.subtle, fontStyle: FontStyle.italic),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppTheme.primary,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primary.withOpacity(0.3),
                blurRadius: 15,
                offset: const Offset(0, 8),
              )
            ],
          ),
          child: Center(
            child: Text(
              user.nombre.isNotEmpty ? user.nombre[0].toUpperCase() : 'C',
              style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          user.nombreCompleto,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.primary),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: AppTheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            user.nombreRol,
            style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 11),
          ),
        ),
      ],
    );
  }

  Widget _buildGlassCard(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(32),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.7),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(color: Colors.white.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Información Personal', style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primary, letterSpacing: 1.2,
              )),
              const SizedBox(height: 20),
              _buildInfoGrid(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoGrid() {
    return Column(
      children: [
        _buildInfoItem('Carnet de Identidad (CI)', user.ci.isNotEmpty ? user.ci : 'Sin registrar'),
        const Divider(height: 24, color: Color(0x1A000000)),
        _buildInfoItem('Teléfono / Celular', user.celular.isNotEmpty ? user.celular : 'Sin registrar'),
        const Divider(height: 24, color: Color(0x1A000000)),
        _buildInfoItem('Correo Electrónico', user.email),
        const Divider(height: 24, color: Color(0x1A000000)),
        _buildInfoItem('Fecha de Nacimiento', user.fechaNacimiento ?? 'No disponible'),
      ],
    );
  }

  Widget _buildInfoItem(String label, String value) {
    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.subtle)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        ],
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
