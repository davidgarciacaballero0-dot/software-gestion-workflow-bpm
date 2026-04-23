// ─────────────────────────────────────────────────────────────
// lib/features/files/domain/repositories/file_repository.dart
// ─────────────────────────────────────────────────────────────

import 'dart:io';

abstract class FileRepository {
  /// Sube un archivo a GridFS y lo asocia al trámite y usuario.
  Future<void> uploadFile({
    required File file,
    required String idTramite,
    required String idUsuario,
  });
}
