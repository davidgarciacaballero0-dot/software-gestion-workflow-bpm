// ─────────────────────────────────────────────────────────────
// lib/features/tramites/presentation/screens/tracking_screen.dart
// ─────────────────────────────────────────────────────────────

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:workflow_app/features/catalog/domain/models/form_field_definition_model.dart';
import 'package:workflow_app/features/catalog/presentation/providers/catalog_providers.dart';
import 'package:workflow_app/features/catalog/presentation/widgets/dynamic_form_builder.dart';
import 'package:workflow_app/features/files/presentation/providers/file_providers.dart';
import '../providers/tramite_providers.dart';
import '../../domain/models/tramite_model.dart';
import '../widgets/timeline_widget.dart';

class ProcedureTrackingScreen extends ConsumerStatefulWidget {
  final TramiteModel tramite;

  const ProcedureTrackingScreen({super.key, required this.tramite});

  @override
  ConsumerState<ProcedureTrackingScreen> createState() => _ProcedureTrackingScreenState();
}

class _ProcedureTrackingScreenState extends ConsumerState<ProcedureTrackingScreen> {
  final _formKey = GlobalKey<FormState>();
  final GlobalKey<DynamicFormBuilderState> _dynamicFormKey = GlobalKey();
  bool _isSubmitting = false;

  void _submitSubsanacion(Map<String, dynamic> data, Map<String, File> files) async {
    setState(() {
      _isSubmitting = true;
    });

    try {
      final user = ref.read(sessionProvider).valueOrNull;
      if (user == null) throw Exception('Sesión no encontrada');

      // 1. Llamar a avanzarTramite
      final tramiteRepo = ref.read(tramiteRepositoryProvider);
      await tramiteRepo.avanzarTramite(
        idTramite: widget.tramite.id,
        idUsuarioAccion: user.id,
        datosFormulario: data,
      );

      // 2. Subir Archivos vinculados al Trámite
      final fileRepo = ref.read(fileRepositoryProvider);
      for (var entry in files.entries) {
        await fileRepo.uploadFile(
          file: entry.value,
          idTramite: widget.tramite.id,
          idUsuario: user.id,
        );
      }

      // Refrescar el historial y la lista de trámites
      ref.invalidate(historialTramiteProvider(widget.tramite.id));
      ref.invalidate(misTramitesProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Documentos enviados correctamente para subsanación.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop(); // O volver al listado
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al enviar: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final historialAsync = ref.watch(historialTramiteProvider(widget.tramite.id));
    final isObservado = widget.tramite.estadoActual.toUpperCase() == 'OBSERVADO';

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Rastreo de Trámite'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(historialTramiteProvider(widget.tramite.id));
            },
          )
        ],
      ),
      body: _isSubmitting
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Enviando correcciones...'),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // --- Encabezado ---
                  Text(
                    widget.tramite.nombrePolitica,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primary,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Código: ${widget.tramite.codigoTramite}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppTheme.subtle,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isObservado ? Colors.red.shade50 : Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isObservado ? Colors.red.shade200 : Colors.blue.shade200,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isObservado ? Icons.warning_rounded : Icons.info_outline_rounded,
                          color: isObservado ? Colors.red : Colors.blue,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Estado Actual: ${widget.tramite.estadoActual}\nUbicación: ${widget.tramite.nombreDepartamentoActual}',
                            style: TextStyle(
                              color: isObservado ? Colors.red.shade900 : Colors.blue.shade900,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // --- Timeline ---
                  Text(
                    'Línea de Tiempo',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: historialAsync.when(
                      data: (events) => TimelineWidget(events: events),
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (err, stack) => Center(child: Text('Error al cargar historial: $err')),
                    ),
                  ),

                  // --- Lógica de Subsanación (Tarea 4.4) ---
                  if (isObservado) ...[
                    const SizedBox(height: 32),
                    Text(
                      'Subsanar Observación',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.red.shade700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Tu trámite ha sido observado. Por favor adjunta los documentos o información requerida.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.subtle,
                          ),
                    ),
                    const SizedBox(height: 16),
                    _buildSubsanacionForm(context),
                  ]
                ],
              ),
            ),
    );
  }

  Widget _buildSubsanacionForm(BuildContext context) {
    final catalogAsync = ref.watch(catalogPoliciesProvider);

    return catalogAsync.when(
      data: (policies) {
        final policy = policies.firstWhere(
          (p) => p.id == widget.tramite.idPolitica,
          orElse: () => throw Exception('Política no encontrada'),
        );

        // Buscar el nodo actual para saber qué campos pedir.
        // Si no se encuentra, usamos un genérico o el primero.
        final currentNode = policy.nodes.firstWhere(
          (n) => n.id == widget.tramite.nodoActualId,
          orElse: () => policy.nodes.first,
        );

        List<FormFieldDefinitionModel> fieldsToFill = currentNode.formDefinition;
        
        // Si el nodo actual no tiene formulario, al menos permitimos subir un archivo genérico
        if (fieldsToFill.isEmpty) {
          fieldsToFill = [
             FormFieldDefinitionModel(
              fieldId: 'documento_subsanacion',
              label: 'Documento Corregido',
              type: 'FILE',
              required: true,
              options: [],
            )
          ];
        }

        return Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: DynamicFormBuilder(
                key: _dynamicFormKey,
                formKey: _formKey,
                fields: fieldsToFill,
                onSaved: _submitSubsanacion,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: () {
                  _dynamicFormKey.currentState?.saveForm();
                },
                icon: const Icon(Icons.send),
                label: const Text('Enviar Subsanación'),
              ),
            ),
          ],
        );
      },
      loading: () => const CircularProgressIndicator(),
      error: (err, stack) => Text('Error al cargar form: $err'),
    );
  }
}
