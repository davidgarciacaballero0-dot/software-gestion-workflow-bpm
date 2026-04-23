// ─────────────────────────────────────────────────────────────
// lib/features/home/presentation/screens/home_screen.dart
// Dashboard principal: Resumen visual y lista de "Mis Trámites Activos".
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Inicio'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar',
            onPressed: () => ref.invalidate(misTramitesProvider),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(misTramitesProvider);
          // Opcional: await ref.read(misTramitesProvider.future) para demorar el refresh indicator
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Saludo ────────────────────────────────────────
              Text(
                'Hola, ${user?.nombre ?? 'Cliente'}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Bienvenido a su portal de trámites.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.subtle,
                ),
              ),
              const SizedBox(height: 24),

              // ── Resumen / Dashboard (Tarea 2.2) ───────────────
              tramitesAsync.when(
                data: (tramites) {
                  final activos = tramites.where((t) => t.estadoActual != 'FINALIZADO' && t.estadoActual != 'RECHAZADO').length;
                  return _ResumenCard(activos: activos);
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, stack) => _ErrorCard(error: err.toString()),
              ),

              const SizedBox(height: 32),
              
              // ── Título Sección ────────────────────────────────
              Text(
                'Mis Trámites Recientes',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),

              // ── Lista (Tarea 2.3) ─────────────────────────────
              tramitesAsync.when(
                data: (tramites) {
                  if (tramites.isEmpty) {
                    return const _EmptyState();
                  }
                  return ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: tramites.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      return _TramiteItem(tramite: tramites[index]);
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
    );
  }
}

class _ResumenCard extends StatelessWidget {
  final int activos;
  const _ResumenCard({required this.activos});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.primary,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.file_copy_rounded, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Trámites en Proceso',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
                Text(
                  '$activos',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
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
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Ocurrió un error al cargar sus trámites. $error',
              style: TextStyle(color: Colors.red.shade800),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: [
            Icon(Icons.inbox_rounded, size: 64, color: AppTheme.subtle.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text(
              'Aún no tiene trámites iniciados',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppTheme.subtle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TramiteItem extends StatelessWidget {
  final TramiteModel tramite;
  const _TramiteItem({required this.tramite});

  @override
  Widget build(BuildContext context) {
    Color statusColor = Colors.grey;
    if (tramite.estadoActual == 'PENDIENTE') statusColor = Colors.orange;
    if (tramite.estadoActual == 'EN_PROCESO' || tramite.estadoActual == 'APROBADO') statusColor = Colors.blue;
    if (tramite.estadoActual == 'FINALIZADO') statusColor = Colors.green;
    if (tramite.estadoActual == 'RECHAZADO') statusColor = Colors.red;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.description_outlined, color: statusColor),
        ),
        title: Text(
          tramite.nombrePolitica,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Código: ${tramite.codigoTramite}'),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  tramite.estadoActual,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: () {
          // Navegación futura (Fase 4: Seguimiento)
        },
      ),
    );
  }
}
