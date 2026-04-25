import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workflow_app/core/providers/core_providers.dart';
import 'package:workflow_app/features/ia/data/repositories/ia_repository.dart';

class ChatMessage {
  final String text;
  final bool isAi;
  final DateTime timestamp;

  ChatMessage({required this.text, required this.isAi, required this.timestamp});
}

final iaRepositoryProvider = Provider<IARepository>((ref) {
  final dio = ref.watch(dioProvider);
  return IARepositoryImpl(dio);
});

class ChatNotifier extends StateNotifier<List<ChatMessage>> {
  final IARepository _repository;

  ChatNotifier(this._repository) : super([]);

  Future<void> sendMessage(String text, String role) async {
    final userMsg = ChatMessage(text: text, isAi: false, timestamp: DateTime.now());
    state = [...state, userMsg];

    final aiResponse = await _repository.sendMessage(text, role);
    final aiMsg = ChatMessage(text: aiResponse, isAi: true, timestamp: DateTime.now());
    state = [...state, aiMsg];
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, List<ChatMessage>>((ref) {
  final repo = ref.watch(iaRepositoryProvider);
  return ChatNotifier(repo);
});

final isTypingProvider = StateProvider<bool>((ref) => false);
