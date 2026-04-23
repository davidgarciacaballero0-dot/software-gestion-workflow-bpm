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
                padding: const EdgeInsets.only(bottom: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.nodoDestinoNombre ?? 'Paso del trámite',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Por: ${event.ejecutadoPorNombre ?? 'Sistema'}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.subtle,
                          ),
                    ),
                    if (event.createdAt != null)
                      Text(
                        DateFormat('dd MMM yyyy, HH:mm').format(event.createdAt!),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.subtle,
                            ),
                      ),
                    if (event.motivo != null && event.motivo!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Text(
                          'Nota: ${event.motivo}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                fontStyle: FontStyle.italic,
                              ),
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
        return Colors.blue;
      case 'AVANCE':
        return Colors.green;
      case 'RECHAZO':
        return Colors.red;
      case 'INTERVENCION':
        return Colors.orange;
      case 'FIN':
        return Colors.purple;
      default:
        return AppTheme.primary;
    }
  }

  IconData _getIconForEventType(String type) {
    switch (type.toUpperCase()) {
      case 'INICIO':
        return Icons.play_arrow_rounded;
      case 'AVANCE':
        return Icons.check_rounded;
      case 'RECHAZO':
        return Icons.close_rounded;
      case 'INTERVENCION':
        return Icons.warning_rounded;
      case 'FIN':
        return Icons.flag_rounded;
      default:
        return Icons.circle;
    }
  }
}
