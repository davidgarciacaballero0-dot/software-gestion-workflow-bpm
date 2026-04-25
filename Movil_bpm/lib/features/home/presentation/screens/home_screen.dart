import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:workflow_app/features/tramites/domain/models/tramite_model.dart';
import 'package:workflow_app/features/tramites/presentation/providers/tramite_providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).valueOrNull;
    final tramitesAsync = ref.watch(misTramitesProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Inicio'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.primary),
            onPressed: () => ref.invalidate(misTramitesProvider),
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
            colors: [Color(0x1A070235), Colors.white],
          ),
        ),
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(misTramitesProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(left: 24, right: 24, bottom: 24, top: 100),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Saludo ────────────────────────────────────────
                FadeInDown(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hola, ${user?.nombre ?? 'Cliente'}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppTheme.primary),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Bienvenido a su portal de gestión inteligente.',
                        style: TextStyle(color: AppTheme.subtle, fontSize: 14),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // ── Resumen / Dashboard ───────────────────────────
                tramitesAsync.when(
                  data: (tramites) {
                    final activos = tramites.where((t) => t.estadoActual != 'FINALIZADO' && t.estadoActual != 'RECHAZADO').length;
                    return FadeIn(
                      delay: const Duration(milliseconds: 200),
                      child: _ResumenPremiumCard(activos: activos),
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, stack) => _ErrorCard(error: err.toString()),
                ),

                const SizedBox(height: 40),
                
                // ── Título Sección ────────────────────────────────
                FadeInLeft(
                  delay: const Duration(milliseconds: 300),
                  child: const Text(
                    'Actividad Reciente',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primary),
                  ),
                ),
                const SizedBox(height: 16),

                // ── Lista ─────────────────────────────────────────
                tramitesAsync.when(
                  data: (tramites) {
                    if (tramites.isEmpty) return const _EmptyState();
                    return ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: tramites.length > 5 ? 5 : tramites.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        return FadeInUp(
                          delay: Duration(milliseconds: 400 + (index * 100)),
                          child: _TramitePremiumItem(tramite: tramites[index]),
                        );
                      },
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (err, stack) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ResumenPremiumCard extends StatelessWidget {
  final int activos;
  const _ResumenPremiumCard({required this.activos});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.primary,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withOpacity(0.2),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Icon(Icons.auto_awesome, color: Colors.white.withOpacity(0.1), size: 100),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Estado Actual',
                style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    '$activos',
                    style: const TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Trámites en\nproceso',
                    style: TextStyle(color: Colors.white, fontSize: 14, height: 1.2),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TramitePremiumItem extends StatelessWidget {
  final TramiteModel tramite;
  const _TramitePremiumItem({required this.tramite});

  @override
  Widget build(BuildContext context) {
    Color statusColor = Colors.grey;
    if (tramite.estadoActual == 'PENDIENTE') statusColor = Colors.orange;
    if (tramite.estadoActual == 'EN_PROCESO' || tramite.estadoActual == 'APROBADO') statusColor = AppTheme.primary;
    if (tramite.estadoActual == 'FINALIZADO') statusColor = Colors.green;
    if (tramite.estadoActual == 'RECHAZADO') statusColor = Colors.red;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.ghostBorder),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.article_outlined, color: statusColor, size: 24),
        ),
        title: Text(
          tramite.nombrePolitica,
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 15),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          'Código: ${tramite.codigoTramite}',
          style: const TextStyle(fontSize: 12, color: AppTheme.subtle),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            tramite.estadoActual,
            style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ),
        onTap: () {
          // Futura navegación a detalle
        },
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String error;
  const _ErrorCard({required this.error});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.error.withOpacity(0.2)),
      ),
      child: Text(
        'Error: $error',
        style: const TextStyle(color: AppTheme.error, fontSize: 13),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        children: [
          Icon(Icons.inbox_outlined, size: 48, color: AppTheme.subtle.withOpacity(0.3)),
          const SizedBox(height: 16),
          const Text(
            'Sin trámites activos',
            style: TextStyle(color: AppTheme.subtle, fontSize: 14),
          ),
        ],
      ),
    );
  }
}
