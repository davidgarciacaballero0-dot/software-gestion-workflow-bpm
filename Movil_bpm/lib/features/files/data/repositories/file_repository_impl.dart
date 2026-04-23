// ─────────────────────────────────────────────────────────────
// lib/features/files/data/repositories/file_repository_impl.dart
// ─────────────────────────────────────────────────────────────

import 'dart:io';
import 'package:dio/dio.dart';
import '../../domain/repositories/file_repository.dart';

class FileRepositoryImpl implements FileRepository {
  final Dio _dio;

  FileRepositoryImpl(this._dio);

  @override
  Future<void> uploadFile({
    required File file,
    required String idTramite,
    required String idUsuario,
  }) async {
    try {
      String fileName = file.path.split('/').last;
      FormData formData = FormData.fromMap({
        "file": await MultipartFile.fromFile(file.path, filename: fileName),
        "idTramite": idTramite,
        "idUsuario": idUsuario,
      });

      await _dio.post(
        '/archivos/upload',
        data: formData,
      );
    } catch (e) {
      throw Exception('Error al subir el archivo: $e');
    }
  }
}
