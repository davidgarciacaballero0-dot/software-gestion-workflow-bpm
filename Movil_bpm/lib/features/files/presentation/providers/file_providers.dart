// ─────────────────────────────────────────────────────────────
// lib/features/files/presentation/providers/file_providers.dart
// ─────────────────────────────────────────────────────────────

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/providers/core_providers.dart';
import '../../domain/repositories/file_repository.dart';
import '../../data/repositories/file_repository_impl.dart';

final fileRepositoryProvider = Provider<FileRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return FileRepositoryImpl(dio);
});
