import 'dart:io';
import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:workflow_app/core/constants/app_constants.dart';

class VoiceService {
  final SpeechToText _speech = SpeechToText();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final Dio _dio = Dio();

  bool _isSpeechInitialized = false;

  Future<bool> initSpeech() async {
    if (_isSpeechInitialized) return true;
    _isSpeechInitialized = await _speech.initialize();
    return _isSpeechInitialized;
  }

  Future<void> startListening(Function(String) onResult) async {
    if (!_isSpeechInitialized) await initSpeech();
    
    if (_isSpeechInitialized) {
      await _speech.listen(
        onResult: (result) {
          if (result.finalResult) {
            onResult(result.recognizedWords);
          }
        },
        localeId: 'es_ES',
      );
    }
  }

  Future<void> stopListening() async {
    await _speech.stop();
  }

  Future<void> speak(String text) async {
    try {
      final response = await _dio.post(
        'https://api.elevenlabs.io/v1/text-to-speech/${AppConstants.elevenLabsVoiceId}',
        data: {
          'text': text,
          'model_id': 'eleven_multilingual_v2',
          'voice_settings': {
            'stability': 0.5,
            'similarity_boost': 0.5,
          }
        },
        options: Options(
          headers: {
            'xi-api-key': AppConstants.elevenLabsApiKey,
            'Content-Type': 'application/json',
          },
          responseType: ResponseType.bytes,
        ),
      );

      if (response.statusCode == 200) {
        final bytes = response.data as List<int>;
        final tempDir = await getTemporaryDirectory();
        final tempFile = File('${tempDir.path}/ai_voice.mp3');
        await tempFile.writeAsBytes(bytes);
        
        await _audioPlayer.play(DeviceFileSource(tempFile.path));
      }
    } catch (e) {
      print('ElevenLabs Error: $e');
    }
  }

  void dispose() {
    _audioPlayer.dispose();
  }
}
