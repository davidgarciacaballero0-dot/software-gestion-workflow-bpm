// ─────────────────────────────────────────────────────────────
// lib/main.dart
// Punto de entrada — WorkFlow App B2C (Gestión de Trámites BPM)
// Arquitectura: Clean Architecture · Riverpod · GoRouter · Dio
// ─────────────────────────────────────────────────────────────
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/router/app_router.dart';
import 'package:workflow_app/core/theme/app_theme.dart';

import 'package:hive_flutter/hive_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox<String>('syncQueueBox');
  await Hive.openBox<String>('tramites_cache');
  runApp(
    const ProviderScope(child: WorkFlowApp()),
  );
}

class WorkFlowApp extends ConsumerWidget {
  const WorkFlowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'WorkFlow — Tramites BPM',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
