import 'dart:convert';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/constants/app_constants.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class WebSocketService {
  StompClient? _stompClient;
  final Ref ref;

  WebSocketService(this.ref);

  Future<void> connect() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: AppConstants.tokenKey);
    if (token == null) return;

    _stompClient = StompClient(
      config: StompConfig(
        url: 'ws://localhost:8080/ws', // URL de WebSockets STOMP backend
        onConnect: onConnect,
        beforeConnect: () async {
          print('Conectando a STOMP...');
        },
        onWebSocketError: (dynamic error) => print('WS Error: $error'),
        stompConnectHeaders: {'Authorization': 'Bearer $token'},
        webSocketConnectHeaders: {'Authorization': 'Bearer $token'},
      ),
    );

    _stompClient?.activate();
  }

  void onConnect(StompFrame frame) {
    print('✅ Conectado a WebSockets STOMP');
    
    // Suscribirse a notificaciones de SLA o trámites
    _stompClient?.subscribe(
      destination: '/user/queue/notifications',
      callback: (StompFrame frame) {
        if (frame.body != null) {
          final payload = jsonDecode(frame.body!);
          print('🔔 Notificación recibida: $payload');
          // TODO: Actualizar provider de notificaciones
        }
      },
    );
  }

  void disconnect() {
    _stompClient?.deactivate();
  }
}

final webSocketProvider = Provider<WebSocketService>((ref) {
  return WebSocketService(ref);
});
