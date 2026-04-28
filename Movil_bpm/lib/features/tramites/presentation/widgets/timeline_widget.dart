// ─────────────────────────────────────────────────────────────
// lib/features/tramites/presentation/widgets/timeline_widget.dart
// ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import '../../domain/models/event_history_model.dart';

class TimelineWidget extends StatelessWidget {
  final List<EventHistoryModel> events;

  const TimelineWidget({super.key, required this.events});

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Text('No hay historial disponible.'),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        final isLast = index == events.length - 1;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Columna de la línea de tiempo (Icono + Línea)
            Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: _getColorForEventType(event.tipoEvento ?? '').withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _getColorForEventType(event.tipoEvento ?? ''),
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    _getIconForEventType(event.tipoEvento ?? ''),
                    size: 16,
                    color: _getColorForEventType(event.tipoEvento ?? ''),
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 50, // Altura de la línea entre nodos
                    color: Colors.grey.shade300,
                  ),
              ],
            ),
            const SizedBox(width: 16),
            // Contenido del evento
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (event.nodoDestinoNombre ?? 'SISTEMA').toUpperCase(),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: AppTheme.primary,
                            letterSpacing: 0.5,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'EJECUTADO POR: ${event.ejecutadoPorNombre ?? 'SISTEMA AUTOMÁTICO'}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.subtle,
                            fontSize: 10,
                          ),
                    ),
                    if (event.createdAt != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          DateFormat('dd/MM/yyyy · HH:mm').format(event.createdAt!),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppTheme.subtle,
                                fontSize: 10,
                              ),
                        ),
                      ),
                    if (event.motivo != null && event.motivo!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.edit_note_outlined, size: 16, color: AppTheme.subtle),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                event.motivo!,
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      fontStyle: FontStyle.italic,
                                      color: AppTheme.subtle,
                                    ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ]
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Color _getColorForEventType(String type) {
    switch (type.toUpperCase()) {
      case 'INICIO':
      case 'CREACION':
        return const Color(0xFF6366F1); // Indigo
      case 'AVANCE':
        return const Color(0xFF10B981); // Emerald
      case 'RECHAZO':
        return AppTheme.error;
      case 'INTERVENCION':
        return const Color(0xFFF59E0B); // Amber
      case 'FIN':
      case 'FINALIZACION':
        return AppTheme.primary;
      default:
        return AppTheme.secondary;
    }
  }

  IconData _getIconForEventType(String type) {
    switch (type.toUpperCase()) {
      case 'INICIO':
      case 'CREACION':
        return Icons.play_circle_outline;
      case 'AVANCE':
        return Icons.arrow_forward_outlined;
      case 'RECHAZO':
        return Icons.block_outlined;
      case 'INTERVENCION':
        return Icons.build_outlined;
      case 'FIN':
      case 'FINALIZACION':
        return Icons.check_circle_outline;
      default:
        return Icons.radio_button_checked_outlined;
    }
  }
}
