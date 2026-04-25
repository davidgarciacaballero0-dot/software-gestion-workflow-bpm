import { Component, NgZone, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../data/services/auth.service';

interface ChatMessage {
  text: string;
  isAi: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chatbot-fab" [class.active]="isOpen()" (click)="toggleChat()">
      <span class="icon">{{ isOpen() ? '✕' : '🤖' }}</span>
      <div class="pulse" *ngIf="isListening"></div>
    </div>

    <!-- Ventana de Chat (Glassmorphism) -->
    <div class="chat-window-glass animate-pop" *ngIf="isOpen()">
      <div class="chat-header">
        <div class="header-info">
          <span class="status-dot"></span>
          <div>
            <h4>Asistente Inteligente BPM</h4>
            <span class="role-context">{{ getRoleLabel() }}</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="minimize-btn" (click)="toggleChat()">—</button>
        </div>
      </div>

      <div class="chat-messages" #scrollContainer>
        <div class="welcome-msg">
          👋 Hola {{ authService.currentUser()?.nombre }}, soy tu asistente especializado. 
          ¿En qué puedo ayudarte hoy?
        </div>
        
        <div *ngFor="let msg of messages()" 
             [class]="msg.isAi ? 'msg-ai' : 'msg-user'">
          <div class="bubble">
            {{ msg.text }}
            <span class="time">{{ msg.timestamp | date:'HH:mm' }}</span>
          </div>
        </div>

        <div class="msg-ai loading" *ngIf="isTyping()">
          <div class="bubble">Escribiendo...</div>
        </div>
      </div>

      <div class="chat-input-area">
        <button class="voice-btn" [class.listening]="isListening" (click)="toggleListening()">
          {{ isListening ? '🛑' : '🎙️' }}
        </button>
        <input type="text" 
               [(ngModel)]="userInput" 
               (keyup.enter)="sendMessage()"
               placeholder="Escribe tu consulta..."
               [disabled]="isTyping()">
        <button class="send-btn" (click)="sendMessage()" [disabled]="!userInput.trim() || isTyping()">
          ➤
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chatbot-fab {
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
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
      z-index: 1001;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .chatbot-fab:hover { transform: scale(1.1) rotate(5deg); }
    .chatbot-fab.active { background: var(--text-muted); transform: rotate(180deg); }

    .chat-window-glass {
      position: fixed;
      bottom: 6.5rem;
      right: 2rem;
      width: 380px;
      height: 550px;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 1.5rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-header {
      padding: 1.25rem;
      background: rgba(var(--primary-rgb), 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .header-info { display: flex; align-items: center; gap: 0.75rem; }
    .status-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e; }
    .chat-header h4 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--primary); }
    .role-context { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .header-actions { display: flex; align-items: center; gap: 0.5rem; }
    .minimize-btn, .voice-toggle-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem; transition: transform 0.2s; }
    .voice-toggle-btn:hover { transform: scale(1.1); }

    .chat-messages {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .welcome-msg {
      background: rgba(0,0,0,0.03);
      padding: 1rem;
      border-radius: 1rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .bubble {
      max-width: 85%;
      padding: 0.85rem 1rem;
      border-radius: 1.25rem;
      font-size: 0.9rem;
      position: relative;
      line-height: 1.4;
    }

    .msg-user { align-self: flex-end; }
    .msg-user .bubble {
      background: var(--primary);
      color: white;
      border-bottom-right-radius: 0.25rem;
    }

    .msg-ai { align-self: flex-start; }
    .msg-ai .bubble {
      background: white;
      color: #1a1c1e;
      border-bottom-left-radius: 0.25rem;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }

    .time {
      display: block;
      font-size: 0.65rem;
      opacity: 0.6;
      margin-top: 0.25rem;
      text-align: right;
    }

    .chat-input-area {
      padding: 1.25rem;
      background: white;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-top: 1px solid rgba(0,0,0,0.05);
    }

    .chat-input-area input {
      flex: 1;
      border: none;
      background: #f4f4f5;
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      font-size: 0.9rem;
      outline: none;
    }

    .voice-btn, .send-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .voice-btn:hover, .send-btn:hover { transform: scale(1.15); }
    .voice-btn.listening { animation: pulse-red 1.5s infinite; }

    @keyframes pulse-red {
      0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0.4)); }
      100% { transform: scale(1.2); filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0)); }
    }

    .animate-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes pop { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `]
})
export class ChatbotWidgetComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isOpen = signal(false);
  isListening = false;
  isTyping = signal(false);
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  recognition: any;

  constructor(
    private router: Router, 
    private zone: NgZone,
    private http: HttpClient,
    public authService: AuthService
  ) {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const { webkitSpeechRecognition }: any = window;
    if (webkitSpeechRecognition) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false;
      this.recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        this.zone.run(() => {
          this.userInput = text;
          this.sendMessage();
        });
      };
      this.recognition.onend = () => this.zone.run(() => this.isListening = false);
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen.update(v => !v);
  }

  toggleListening() {
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.isListening = true;
      this.recognition.start();
    }
  }

  getRoleLabel(): string {
    const user = this.authService.currentUser();
    if (user?.nombreRol === 'ADMIN' || user?.esJefe) return 'Consultor Estratégico';
    if (user?.nombreRol === 'CLIENTE') return 'Atención al Cliente';
    return 'Soporte Operativo';
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isTyping()) return;

    const userText = this.userInput.trim();
    this.messages.update(prev => [...prev, { text: userText, isAi: false, timestamp: new Date() }]);
    this.userInput = '';
    this.isTyping.set(true);

    const payload = {
      prompt: userText,
      rol: this.authService.currentUser()?.nombreRol || 'CLIENTE'
    };

    // Usar el nuevo endpoint de chat interactivo
    this.http.post('/ia/chat-interactivo', payload).subscribe({
      next: (res: any) => {
        this.isTyping.set(false);
        const aiResponse = res.respuesta;
        this.messages.update(prev => [...prev, { text: aiResponse, isAi: true, timestamp: new Date() }]);
      },
      error: (err) => {
        this.isTyping.set(false);
        console.error('Chatbot Error:', err);
        this.messages.update(prev => [...prev, { 
          text: 'Lo siento, tuve un problema de conexión. Inténtalo de nuevo.', 
          isAi: true, 
          timestamp: new Date() 
        }]);
      }
    });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }
}
