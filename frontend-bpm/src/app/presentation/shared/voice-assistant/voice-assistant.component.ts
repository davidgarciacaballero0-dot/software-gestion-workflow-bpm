import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="voice-fab" [class.active]="isListening" (click)="toggleListening()">
      <span class="icon">{{ isListening ? '🎙️' : '🎧' }}</span>
      <div class="pulse" *ngIf="isListening"></div>
      <div class="tooltip" *ngIf="lastCommand">"{{ lastCommand }}"</div>
    </div>
  `,
  styles: [`
    .voice-fab {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 60px;
      height: 60px;
      background: var(--primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      z-index: 1000;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .voice-fab:hover { transform: scale(1.1); }
    .voice-fab.active { background: #f5576c; transform: scale(1.2); }
    
    .pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(245, 87, 108, 0.4);
      animation: pulse-ring 1.5s infinite;
    }

    .tooltip {
      position: absolute;
      bottom: 70px;
      right: 0;
      background: rgba(0,0,0,0.8);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.8rem;
      white-space: nowrap;
      animation: fade-in 0.3s;
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 0.5; }
      100% { transform: scale(1.5); opacity: 0; }
    }
  `]
})
export class VoiceAssistantComponent {
  isListening = false;
  recognition: any;
  lastCommand = '';

  constructor(private router: Router, private zone: NgZone) {
    const { webkitSpeechRecognition }: any = window;
    if (webkitSpeechRecognition) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const command = event.results[0][0].transcript.toLowerCase();
        this.zone.run(() => {
          this.lastCommand = command;
          this.processCommand(command);
        });
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
          this.isListening = false;
        });
      };
    }
  }

  toggleListening() {
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.lastCommand = '';
      this.recognition.start();
      this.isListening = true;
    }
  }

  processCommand(cmd: string) {
    console.log('Voice Command:', cmd);
    
    if (cmd.includes('bandeja') || cmd.includes('inbox')) {
      this.router.navigate(['/app/inbox']);
    } else if (cmd.includes('catálogo') || cmd.includes('servicios')) {
      this.router.navigate(['/app/catalog']);
    } else if (cmd.includes('audit') || cmd.includes('historial')) {
      this.router.navigate(['/app/audit']);
    } else if (cmd.includes('diseño') || cmd.includes('crear política')) {
      this.router.navigate(['/app/designer']);
    } else if (cmd.includes('inteligencia') || cmd.includes('insights') || cmd.includes('reportes')) {
      this.router.navigate(['/app/insights']);
    } else if (cmd.includes('supervisión') || cmd.includes('dashboard')) {
      this.router.navigate(['/app/supervision']);
    }
  }
}
