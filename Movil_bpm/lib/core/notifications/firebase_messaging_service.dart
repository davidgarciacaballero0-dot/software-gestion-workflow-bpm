import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Manejador en background (debe ser una función top-level)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print("🔔 Notificación recibida en background: ${message.messageId}");
}

class FirebaseMessagingService {
  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  Future<void> init() async {
    // Solicitar permisos en iOS/Android 13+
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('Permiso concedido para Push Nativas');
      
      // Obtener el Token FCM para enviarlo al backend Spring Boot
      final token = await _firebaseMessaging.getToken();
      print('FCM Token: $token');
      // TODO: Enviar token al backend tras login

      // Manejar mensajes en Foreground
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print('Recibido en Foreground: ${message.notification?.title}');
        // Si hay data, se puede actualizar el Riverpod Provider
      });

      // Manejar el tap de la notificación
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        print('Notificación tocada: ${message.data}');
      });

      // Registrar manejador de Background
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    }
  }
}

final firebaseMessagingProvider = Provider<FirebaseMessagingService>((ref) {
  return FirebaseMessagingService();
});
