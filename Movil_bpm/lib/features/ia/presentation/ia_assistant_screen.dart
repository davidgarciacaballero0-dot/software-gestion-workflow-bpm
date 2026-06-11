import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:just_audio/just_audio.dart';
import 'package:animate_do/animate_do.dart';

class IaAssistantScreen extends StatefulWidget {
  const IaAssistantScreen({super.key});

  @override
  State<IaAssistantScreen> createState() => _IaAssistantScreenState();
}

class _IaAssistantScreenState extends State<IaAssistantScreen> {
  final stt.SpeechToText _speech = stt.SpeechToText();
  final AudioPlayer _audioPlayer = AudioPlayer();
  
  bool _isListening = false;
  String _text = 'Toca el micrófono para hablar...';
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  void _initSpeech() async {
    await _speech.initialize(
      onStatus: (val) {
        if (val == 'done') {
          setState(() => _isListening = false);
          _processQuery();
        }
      },
      onError: (val) => print('STT Error: $val'),
    );
  }

  void _listen() async {
    if (!_isListening) {
      bool available = await _speech.initialize();
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          onResult: (val) => setState(() {
            _text = val.recognizedWords;
          }),
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  void _processQuery() async {
    if (_text.isEmpty || _text == 'Toca el micrófono para hablar...') return;
    
    setState(() => _isProcessing = true);
    
    // TODO: Enviar _text a FastAPI/Spring Boot IA Endpoint.
    // Simulación de espera:
    await Future.delayed(const Duration(seconds: 2));
    
    // Asumimos que el backend retorna un URL de audio de ElevenLabs
    final audioUrl = "https://ejemplo.com/audio_generado.mp3"; 
    
    try {
      // await _audioPlayer.setUrl(audioUrl); // Descomentar en prod
      // _audioPlayer.play();
    } catch (e) {
      print('Error reproduciendo audio: $e');
    }

    setState(() => _isProcessing = false);
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070235),
      appBar: AppBar(
        title: Text('Asistente Virtual', style: GoogleFonts.inter(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_isProcessing)
              Pulse(
                infinite: true,
                child: const Icon(Icons.smart_toy, color: Colors.blueAccent, size: 80),
              )
            else
              const Icon(Icons.smart_toy_outlined, color: Colors.white54, size: 80),
            
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _isProcessing ? "Pensando..." : _text,
                style: GoogleFonts.inter(color: Colors.white, fontSize: 24),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: FloatingActionButton(
        onPressed: _listen,
        backgroundColor: _isListening ? Colors.red : Colors.blueAccent,
        child: Icon(_isListening ? Icons.mic : Icons.mic_none, color: Colors.white),
      ),
    );
  }
}
