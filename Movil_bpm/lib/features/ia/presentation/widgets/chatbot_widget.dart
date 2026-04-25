import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import 'package:workflow_app/core/providers/core_providers.dart';
import 'package:workflow_app/features/ia/presentation/providers/ia_provider.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import 'package:intl/intl.dart';

class ChatbotWidget extends ConsumerStatefulWidget {
  const ChatbotWidget({super.key});

  @override
  ConsumerState<ChatbotWidget> createState() => _ChatbotWidgetState();
}

class _ChatbotWidgetState extends ConsumerState<ChatbotWidget> {
  bool _isOpen = false;
  bool _isListening = false;
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  void _toggleChat() {
    setState(() => _isOpen = !_isOpen);
    if (_isOpen) {
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    _controller.clear();
    ref.read(isTypingProvider.notifier).state = true;

    await ref.read(chatProvider.notifier).sendMessage(text, 'CLIENTE');
    
    ref.read(isTypingProvider.notifier).state = false;
    _scrollToBottom();

    // Reproducir respuesta por voz si la última es de la IA
    final messages = ref.read(chatProvider);
    if (messages.isNotEmpty && messages.last.isAi) {
      await ref.read(voiceServiceProvider).speak(messages.last.text);
    }
  }

  Future<void> _toggleListening() async {
    final voiceService = ref.read(voiceServiceProvider);
    if (_isListening) {
      await voiceService.stopListening();
      setState(() => _isListening = false);
    } else {
      setState(() => _isListening = true);
      await voiceService.startListening((text) {
        setState(() {
          _controller.text = text;
          _isListening = false;
        });
        _sendMessage();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(chatProvider);
    final isTyping = ref.watch(isTypingProvider);

    return Stack(
      children: [
        // Botón FAB
        Positioned(
          bottom: 20,
          right: 20,
          child: FloatingActionButton(
            onPressed: _toggleChat,
            backgroundColor: _isOpen ? AppTheme.subtle : AppTheme.primary,
            child: Icon(_isOpen ? Icons.close : Icons.smart_toy_rounded, color: Colors.white),
          ),
        ),

        // Ventana de Chat (Glassmorphism)
        if (_isOpen)
          Positioned(
            bottom: 90,
            right: 20,
            child: FadeInUp(
              duration: const Duration(milliseconds: 400),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                  child: Container(
                    width: MediaQuery.of(context).size.width * 0.85,
                    height: 500,
                    decoration: BoxDecoration(
                      color: AppTheme.glassBackground,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.white.withOpacity(0.3)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        )
                      ],
                    ),
                    child: Column(
                      children: [
                        // Header
                        _buildHeader(),
                        // Messages
                        Expanded(
                          child: ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(16),
                            itemCount: messages.length,
                            itemBuilder: (context, index) {
                              return _buildChatBubble(messages[index]);
                            },
                          ),
                        ),
                        if (isTyping)
                          const Padding(
                            padding: EdgeInsets.only(left: 16, bottom: 8),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: Text('IA escribiendo...', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
                            ),
                          ),
                        // Input Area
                        _buildInputArea(),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.05),
        border: Border(bottom: BorderSide(color: Colors.black.withOpacity(0.05))),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Asistente BPM', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary)),
              Text('Atención al Cliente', style: TextStyle(fontSize: 10, color: AppTheme.subtle)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChatBubble(ChatMessage msg) {
    return Align(
      alignment: msg.isAi ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: msg.isAi ? Colors.white : AppTheme.primary,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: msg.isAi ? const Radius.circular(0) : const Radius.circular(16),
            bottomRight: msg.isAi ? const Radius.circular(16) : const Radius.circular(0),
          ),
          boxShadow: [
            if (msg.isAi)
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5, offset: const Offset(0, 2))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              msg.text,
              style: TextStyle(color: msg.isAi ? AppTheme.onSurface : Colors.white, fontSize: 14),
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('HH:mm').format(msg.timestamp),
              style: TextStyle(color: msg.isAi ? AppTheme.subtle : Colors.white70, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(12),
      color: Colors.white,
      child: Row(
        children: [
          IconButton(
            onPressed: _toggleListening,
            icon: Icon(
              _isListening ? Icons.stop_circle : Icons.mic,
              color: _isListening ? Colors.red : AppTheme.primary,
            ),
          ),
          Expanded(
            child: TextField(
              controller: _controller,
              decoration: InputDecoration(
                hintText: 'Escribe tu consulta...',
                hintStyle: const TextStyle(fontSize: 14),
                fillColor: const Color(0xFFF4F4F5),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: _sendMessage,
            icon: const Icon(Icons.send_rounded, color: AppTheme.primary),
          ),
        ],
      ),
    );
  }
}
