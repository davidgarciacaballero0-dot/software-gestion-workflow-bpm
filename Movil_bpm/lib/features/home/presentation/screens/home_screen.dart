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
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'GESTIÓN INTELIGENTE DE TRÁMITES',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppTheme.subtle,
                        ),
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
                  child: Text(
                    'ACTIVIDAD RECIENTE',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w800,
                    ),
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
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primary, AppTheme.primaryContainer],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: AppTheme.ambientShadow,
            blurRadius: 30,
            offset: Offset(0, 15),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            top: -10,
            child: Icon(Icons.blur_on, color: Colors.white.withOpacity(0.05), size: 120),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ESTADO OPERATIVO',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Colors.white.withOpacity(0.6),
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '$activos',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: Colors.white,
                      height: 1,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'TRÁMITES EN CURSO',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w400,
                    ),
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
        color: AppTheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08070235),
            blurRadius: 8,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.08),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(Icons.description_outlined, color: statusColor, size: 22),
        ),
        title: Text(
          tramite.nombrePolitica.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w800,
            color: AppTheme.primary,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            'REF: ${tramite.codigoTramite}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: AppTheme.subtle,
              letterSpacing: 0.5,
            ),
          ),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            tramite.estadoActual,
            style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.w800),
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
