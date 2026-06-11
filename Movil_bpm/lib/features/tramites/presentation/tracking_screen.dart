import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TrackingScreen extends StatelessWidget {
  final String idTramite;
  const TrackingScreen({super.key, required this.idTramite});

  @override
  Widget build(BuildContext context) {
    // Simulación de datos que vendrían del backend vía STOMP WebSockets / REST
    final currentStep = 1;

    return Scaffold(
      appBar: AppBar(
        title: Text('Rastreo: $idTramite', style: GoogleFonts.inter(fontSize: 18)),
        backgroundColor: const Color(0xFF070235),
        foregroundColor: Colors.white,
      ),
      body: Stepper(
        currentStep: currentStep,
        controlsBuilder: (context, details) {
          if (details.currentStep == 1) { // Supongamos que el paso 1 requiere subsanación
            return Padding(
              padding: const EdgeInsets.only(top: 16.0),
              child: ElevatedButton.icon(
                onPressed: () {
                  // Acción de subsanación
                },
                icon: const Icon(Icons.upload_file, color: Colors.white),
                label: const Text('Subsanar Documento', style: TextStyle(color: Colors.white)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
              ),
            );
          }
          return const SizedBox.shrink();
        },
        steps: [
          Step(
            title: Text('Ventanilla Virtual', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            subtitle: const Text('Completado - En tiempo (SLA OK)'),
            content: const Text('Formulario y documentos recibidos correctamente.'),
            isActive: currentStep >= 0,
            state: currentStep > 0 ? StepState.complete : StepState.indexed,
          ),
          Step(
            title: Text('Revisión Legal', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            subtitle: const Text('Demorado (SLA Vencido) - Dpto. Legal', style: TextStyle(color: Colors.red)),
            content: const Text('Falta la copia de la cédula de identidad.'),
            isActive: currentStep >= 1,
            state: currentStep == 1 ? StepState.error : StepState.indexed,
          ),
          Step(
            title: Text('Aprobación Final', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            subtitle: const Text('Pendiente - Dpto. Gerencia'),
            content: const Text('Esperando visto bueno del jefe de departamento.'),
            isActive: currentStep >= 2,
            state: StepState.indexed,
          ),
        ],
      ),
    );
  }
}
