// ─────────────────────────────────────────────────────────────
// lib/features/catalog/presentation/screens/start_procedure_screen.dart
// ─────────────────────────────────────────────────────────────

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:workflow_app/features/tramites/presentation/providers/tramite_providers.dart';
import 'package:workflow_app/features/files/presentation/providers/file_providers.dart';
import '../../domain/models/policy_model.dart';
import '../widgets/dynamic_form_builder.dart';

class StartProcedureScreen extends ConsumerStatefulWidget {
  final PolicyModel policy;

  const StartProcedureScreen({super.key, required this.policy});

  @override
  ConsumerState<StartProcedureScreen> createState() => _StartProcedureScreenState();
}

class _StartProcedureScreenState extends ConsumerState<StartProcedureScreen> {
  final _formKey = GlobalKey<FormState>();
  final GlobalKey<DynamicFormBuilderState> _dynamicFormKey = GlobalKey();
  bool _isSubmitting = false;

  void _submit(Map<String, dynamic> data, Map<String, File> files) async {
    setState(() {
      _isSubmitting = true;
    });

    try {
      final user = ref.read(sessionProvider).valueOrNull;
      if (user == null) throw Exception('No session found');

      // 1. Iniciar Trámite
      final tramiteRepo = ref.read(tramiteRepositoryProvider);
      final newTramite = await tramiteRepo.iniciarTramite(
        idPolitica: widget.policy.id,
        idUsuarioSolicitante: user.id,
        datosIniciales: data,
      );

      // 2. Subir Archivos (si hay) vinculados al nuevo ID del Trámite
      final fileRepo = ref.read(fileRepositoryProvider);
      for (var entry in files.entries) {
        await fileRepo.uploadFile(
          file: entry.value,
          idTramite: newTramite.id,
          idUsuario: user.id,
        );
      }

      // Invalidar mis tramites para que el dashboard se refresque
      ref.invalidate(misTramitesProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Trámite iniciado exitosamente: ${newTramite.codigoTramite}'),
            backgroundColor: Colors.green,
          ),
        );
        context.pop(); // Volver al catálogo / home
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
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
    // Obtenemos los campos del START_EVENT o del primer USER_TASK
    final startNode = widget.policy.nodes.firstWhere(
      (n) => n.type == 'START_EVENT' || n.type == 'USER_TASK',
      orElse: () => widget.policy.nodes.first,
    );

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Iniciar Trámite'),
      ),
      body: _isSubmitting
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Iniciando trámite y subiendo archivos...'),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.policy.nombre.toUpperCase(),
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primary,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.policy.description,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.subtle,
                        ),
                  ),
                  const SizedBox(height: 32),
                  DynamicFormBuilder(
                    key: _dynamicFormKey,
                    formKey: _formKey,
                    fields: startNode.formDefinition,
                    onSaved: _submit,
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () {
                        // El DynamicFormBuilder valida internamente y llama a onSaved
                        _dynamicFormKey.currentState?.saveForm();
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('COMENZAR Y ENVIAR', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white)),
                          const SizedBox(width: 12),
                          const Icon(Icons.send_rounded, size: 20),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}


