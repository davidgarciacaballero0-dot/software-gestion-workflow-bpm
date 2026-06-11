import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:isar/isar.dart';
import 'package:workflow_app/features/tramites/data/models/tramite_schema.dart';
import 'package:workflow_app/core/local_db/isar_config.dart';

class FormularioScreen extends StatefulWidget {
  final String nombreTramite;
  const FormularioScreen({super.key, required this.nombreTramite});

  @override
  State<FormularioScreen> createState() => _FormularioScreenState();
}

class _FormularioScreenState extends State<FormularioScreen> {
  final _formKey = GlobalKey<FormState>();
  final _textController = TextEditingController();

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final connectivityResult = await Connectivity().checkConnectivity();
    final isOffline = !connectivityResult.contains(ConnectivityResult.mobile) && 
                      !connectivityResult.contains(ConnectivityResult.wifi);

    if (isOffline) {
      // Guardar en Isar Offline (IndexedDB en PWA)
      final offlineData = TramiteOffline()
        ..localId = DateTime.now().millisecondsSinceEpoch.toString()
        ..nombreTramite = widget.nombreTramite
        ..jsonFormularioData = '{"campo1": "${_textController.text}"}'
        ..synced = false
        ..fechaCreacion = DateTime.now();

      await IsarConfig.instance.writeTxn(() async {
        await IsarConfig.instance.tramiteOfflines.put(offlineData);
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Guardado offline. Se sincronizará cuando haya conexión.')),
        );
        Navigator.pop(context);
      }
    } else {
      // Enviar directamente al backend
      // TODO: Usar DioClient
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trámite enviado con éxito.')),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.nombreTramite, style: GoogleFonts.inter()),
        backgroundColor: const Color(0xFF070235),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Formulario Dinámico', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _textController,
                decoration: const InputDecoration(
                  labelText: 'Dato requerido',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => v!.isEmpty ? 'Campo requerido' : null,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blueAccent,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('Enviar o Guardar Offline', style: TextStyle(color: Colors.white, fontSize: 16)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
