// ─────────────────────────────────────────────────────────────
// lib/features/tramites/presentation/screens/my_procedures_screen.dart
// ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import '../providers/tramite_providers.dart';
import '../../domain/models/tramite_model.dart';

class MyProceduresScreen extends ConsumerStatefulWidget {
  const MyProceduresScreen({super.key});

  @override
  ConsumerState<MyProceduresScreen> createState() => _MyProceduresScreenState();
}

class _MyProceduresScreenState extends ConsumerState<MyProceduresScreen> {
  String _selectedFilter = 'Todos';
  final List<String> _filters = ['Todos', 'PENDIENTE', 'EN_PROCESO', 'OBSERVADO', 'FINALIZADO'];

  @override
  Widget build(BuildContext context) {
    final tramitesAsync = ref.watch(misTramitesProvider);

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Mis Trámites'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(misTramitesProvider),
          )
        ],
      ),
      body: Column(
        children: [
          // Filtros horizontales
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: _filters.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(
                      filter,
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppTheme.subtle,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: AppTheme.primary,
                    backgroundColor: Colors.white,
                    side: BorderSide(
                      color: isSelected ? AppTheme.primary : Colors.grey.shade300,
                    ),
                    onSelected: (selected) {
                      if (selected) {
                        setState(() {
                          _selectedFilter = filter;
                        });
                      }
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          
          Expanded(
            child: tramitesAsync.when(
              data: (tramites) {
                final filteredTramites = _selectedFilter == 'Todos'
                    ? tramites
                    : tramites.where((t) => t.estadoActual.toUpperCase() == _selectedFilter).toList();

                if (filteredTramites.isEmpty) {
                  return _EmptyProceduresState();
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(misTramitesProvider);
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.all(20),
                    itemCount: filteredTramites.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final tramite = filteredTramites[index];
                      return _ProcedureCard(
                        tramite: tramite,
                        onTap: () {
                          // Navegar a la pantalla de tracking
                          context.push('/tracking', extra: tramite);
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
          ),
        ],
      ),
    );
  }
}

class _ProcedureCard extends StatelessWidget {
  final TramiteModel tramite;
  final VoidCallback onTap;

  const _ProcedureCard({required this.tramite, required this.onTap});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    switch (tramite.estadoActual.toUpperCase()) {
      case 'PENDIENTE':
        statusColor = Colors.orange;
        break;
      case 'EN_PROCESO':
        statusColor = AppTheme.primary;
        break;
      case 'OBSERVADO':
        statusColor = Colors.red;
        break;
      case 'FINALIZADO':
        statusColor = Colors.green;
        break;
      default:
        statusColor = Colors.grey;
    }

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: AppTheme.ambientShadow,
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'REF: ${tramite.codigoTramite}',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: AppTheme.subtle,
                            letterSpacing: 0.5,
                          ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        tramite.estadoActual,
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  tramite.nombrePolitica.toUpperCase(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primary,
                        fontSize: 15,
                      ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 14, color: statusColor),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        tramite.nombreDepartamentoActual?.toUpperCase() ?? 'PENDIENTE',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppTheme.subtle,
                              fontSize: 10,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyProceduresState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.5,
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 64, color: AppTheme.subtle.withOpacity(0.2)),
            const SizedBox(height: 16),
            Text(
              'No hay trámites para este filtro',
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
