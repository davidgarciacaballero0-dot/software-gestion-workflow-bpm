import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:workflow_app/core/network/dio_client.dart'; // Aunque asumo que se usaría el provider global en vez de esto directo, adaptemos:
import 'package:workflow_app/core/constants/app_constants.dart';

class AuthRepository {
  final Dio dio;
  final FlutterSecureStorage storage;

  AuthRepository(this.dio, this.storage);

  Future<bool> login(String username, String password) async {
    try {
      final response = await dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });

      if (response.statusCode == 200 && response.data != null) {
        final token = response.data['token']; // Asumiendo estructura estándar del backend
        await storage.write(key: AppConstants.tokenKey, value: token);
        return true;
      }
      return false;
    } catch (e) {
      print('Error en login: $e');
      return false;
    }
  }

  Future<bool> registrarCliente(Map<String, dynamic> data) async {
    try {
      final response = await dio.post('/auth/register', data: data);
      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      print('Error en registro: $e');
      return false;
    }
  }
}

// Para evitar problemas de importación cruzada con el dio_client preexistente, creamos el provider de Auth:
// Si existía dioProvider, lo inyectaríamos. 
// Por ahora instanciamos localmente o usamos el default
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  // Reutilizamos la lógica del DioClient original si está disponible
  final dio = DioClient.build(const FlutterSecureStorage());
  return AuthRepository(dio, const FlutterSecureStorage());
});
