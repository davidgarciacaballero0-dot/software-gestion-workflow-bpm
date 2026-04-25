import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ElevenLabsService {
  // En una implementación real, esto debería venir de un environment o proxy
  private readonly VOIC_ID = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice
  private readonly API_KEY = 'sk_e416995838804ecd738956dd0b79eebdb12e59f356e2a661'; // Configurada por el usuario

  constructor(private http: HttpClient) { }

  speak(text: string): void {
    const url = `/elevenlabs-api/v1/text-to-speech/${this.VOIC_ID}`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'xi-api-key': this.API_KEY
    });

    const body = {
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    };

    this.http.post(url, body, { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play();
      },
      error: (err) => console.error('ElevenLabs Error:', err)
    });
  }
}
