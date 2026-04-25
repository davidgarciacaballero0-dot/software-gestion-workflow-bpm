import 'package:dio/dio.dart';

abstract class IARepository {
  Future<String> sendMessage(String text, String role);
}

class IARepositoryImpl implements IARepository {
  final Dio dio;

  IARepositoryImpl(this.dio);

  @override
  Future<String> sendMessage(String text, String role) async {
    try {
      final response = await dio.post(
        '/optimization/asistente', // Ajustado al endpoint real del backend
        data: {
          'prompt': text,
          'rol': role,
        },
      );

      if (response.statusCode == 200) {
        return response.data['respuesta'] ?? 'No recibí respuesta de la IA.';
      }
      
      if (response.statusCode == 429) {
        return 'El asistente virtual está muy solicitado. Intenta de nuevo en unos segundos.';
      }

      return 'Error en el asistente: ${response.statusMessage}';
    } catch (e) {
      return 'Lo siento, tuve un problema de conexión con la IA.';
    }
  }
}
