import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6), // Fondo claro
      appBar: AppBar(
        backgroundColor: const Color(0xFF070235),
        title: Text('Mi Portal', style: GoogleFonts.inter(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications, color: Colors.white),
            onPressed: () {},
          )
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildDashboard(),
          const Center(child: Text('Catálogo de Trámites')),
          const Center(child: Text('Asistente IA')),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Resumen'),
          NavigationDestination(icon: Icon(Icons.list_alt_outlined), selectedIcon: Icon(Icons.list_alt), label: 'Catálogo'),
          NavigationDestination(icon: Icon(Icons.smart_toy_outlined), selectedIcon: Icon(Icons.smart_toy), label: 'IA'),
        ],
      ),
    );
  }

  Widget _buildDashboard() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Bienvenido de nuevo', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF070235),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 5))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Tienes 2 trámites activos', style: GoogleFonts.inter(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Text('Revisa el estado actual de tus procesos en curso.', style: GoogleFonts.inter(color: Colors.white70)),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Text('Trámites Recientes', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        // Aquí iría el TrackingScreen / Timeline
      ],
    );
  }
}
