import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationState {
  final String title;
  final String body;

  NotificationState(this.title, this.body);
}

class NotificationsNotifier extends StateNotifier<List<NotificationState>> {
  NotificationsNotifier() : super([]);

  void addNotification(String title, String body) {
    state = [...state, NotificationState(title, body)];
    // En la UI, un listener de este Provider lanzará un ScaffoldMessenger (Toast)
  }

  void clear() => state = [];
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, List<NotificationState>>((ref) {
  return NotificationsNotifier();
});
