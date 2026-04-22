// ─────────────────────────────────────────────────────────────
// lib/features/auth/presentation/screens/register_screen.dart
// Pantalla de Registro — Nuevo Cliente Final.
// Crea un usuario con rol "CLIENTE" (sin org/depto) como define
// el DataInitializer y UsuarioService del backend.
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import 'package:workflow_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:workflow_app/shared/widgets/bpm_button.dart';
import 'package:workflow_app/shared/widgets/bpm_text_field.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey      = GlobalKey<FormState>();
  final _nombreCtrl   = TextEditingController();
  final _apellCtrl    = TextEditingController();
  final _ciCtrl       = TextEditingController();
  final _celularCtrl  = TextEditingController();
  final _emailCtrl    = TextEditingController();
  final _passCtrl     = TextEditingController();
  final _confirmCtrl  = TextEditingController();

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _apellCtrl.dispose();
    _ciCtrl.dispose();
    _celularCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(sessionProvider.notifier).register(
      nombre:    _nombreCtrl.text.trim(),
      apellidos: _apellCtrl.text.trim(),
      ci:        _ciCtrl.text.trim(),
      celular:   _celularCtrl.text.trim(),
      email:     _emailCtrl.text.trim(),
      password:  _passCtrl.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);

    ref.listen<AsyncValue<dynamic>>(sessionProvider, (_, next) {
      next.whenOrNull(
        error: (e, _) => ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        ),
      );
    });

    final isLoading = session.isLoading;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Encabezado ────────────────────────────────
                Text(
                  'Crear cuenta',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.onSurface,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Complete sus datos para acceder al portal de trámites.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.subtle,
                    height: 1.5,
                  ),
                ),

                const SizedBox(height: 32),

                // ── Fila: Nombre / Apellidos ──────────────────
                Row(
                  children: [
                    Expanded(
                      child: BpmTextField(
                        label: 'Nombre',
                        controller: _nombreCtrl,
                        prefixIcon: const Icon(Icons.person_outline),
                        validator: (v) =>
                            (v == null || v.isEmpty) ? 'Requerido' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: BpmTextField(
                        label: 'Apellidos',
                        controller: _apellCtrl,
                        validator: (v) =>
                            (v == null || v.isEmpty) ? 'Requerido' : null,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // ── Carnet de Identidad ───────────────────────
                BpmTextField(
                  label: 'Carnet de Identidad (C.I.)',
                  controller: _ciCtrl,
                  keyboardType: TextInputType.number,
                  prefixIcon: const Icon(Icons.badge_outlined),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Ingrese su C.I.' : null,
                ),

                const SizedBox(height: 16),

                // ── Celular ───────────────────────────────────
                BpmTextField(
                  label: 'Celular',
                  controller: _celularCtrl,
                  keyboardType: TextInputType.phone,
                  prefixIcon: const Icon(Icons.phone_outlined),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? 'Ingrese su celular' : null,
                ),

                const SizedBox(height: 16),

                // ── Email ─────────────────────────────────────
                BpmTextField(
                  label: 'Correo electrónico',
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: const Icon(Icons.email_outlined),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Ingrese su correo';
                    if (!v.contains('@')) return 'Correo no válido';
                    return null;
                  },
                ),

                const SizedBox(height: 16),

                // ── Password ──────────────────────────────────
                BpmTextField(
                  label: 'Contraseña',
                  controller: _passCtrl,
                  isPassword: true,
                  prefixIcon: const Icon(Icons.lock_outlined),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Ingrese su contraseña';
                    if (v.length < 6) return 'Mínimo 6 caracteres';
                    return null;
                  },
                ),

                const SizedBox(height: 16),

                // ── Confirmar Password ────────────────────────
                BpmTextField(
                  label: 'Confirmar contraseña',
                  controller: _confirmCtrl,
                  isPassword: true,
                  prefixIcon: const Icon(Icons.lock_reset_outlined),
                  validator: (v) {
                    if (v != _passCtrl.text) return 'Las contraseñas no coinciden';
                    return null;
                  },
                ),

                const SizedBox(height: 12),

                // ── Nota informativa ──────────────────────────
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F0FE),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: AppTheme.primary, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Su cuenta tendrá acceso exclusivo al portal de trámites como cliente.',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.primary,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 28),

                // ── Botón Crear Cuenta ────────────────────────
                BpmButton(
                  label: 'Crear cuenta',
                  onPressed: _submit,
                  isLoading: isLoading,
                ),

                const SizedBox(height: 20),

                // ── Ya tiene cuenta ───────────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '¿Ya tiene una cuenta? ',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.subtle),
                    ),
                    GestureDetector(
                      onTap: () => context.pop(),
                      child: Text(
                        'Ingresar',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
