import { Component, NgZone, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../data/services/auth.service';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';

interface ChatMessage {
  text: string;
  isAi: boolean;
  timestamp: Date;
  actionButton?: {
    label: string;
    route: string;
    queryParams?: any;
  };
  // RF-2.3: Gestión inteligente de requisitos
  pendingDocs?: { nombre: string; descripcion: string; urgente: boolean }[];
  tramiteIdForUpload?: string;
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
          <button class="voice-toggle-btn" (click)="toggleMute()" [title]="isMuted() ? 'Activar voz' : 'Silenciar voz'">
            {{ isMuted() ? '🔇' : '🔊' }}
          </button>
          <button class="minimize-btn" (click)="toggleChat()">—</button>
        </div>
      </div>

      <div class="chat-messages" #scrollContainer>
        <div class="welcome-msg">
          👋 Hola {{ authService.currentUser()?.nombre }}, soy tu asistente especializado. 
          Puedes consultarme por voz o **subir un documento PDF/Imagen** para que infiera el trámite de forma automática.
        </div>
        
        <div *ngFor="let msg of messages()" 
             [class]="msg.isAi ? 'msg-ai' : 'msg-user'">
          <div class="bubble">
            <div style="white-space: pre-wrap;">{{ msg.text }}</div>
            
            <!-- Botón de acción interactivo -->
            <div *ngIf="msg.actionButton" class="action-btn-container">
              <button class="chat-action-btn" (click)="executeAction(msg.actionButton)">
                {{ msg.actionButton.label }}
              </button>
            </div>

            <!-- RF-2.3: Documentos faltantes con botón de subida inline -->
            <div *ngIf="msg.pendingDocs && msg.pendingDocs.length > 0" style="margin-top:0.6rem; display:flex; flex-direction:column; gap:0.4rem;">
              <div *ngFor="let doc of msg.pendingDocs" 
                   style="display:flex; align-items:center; gap:0.4rem; padding:0.4rem 0.6rem; background:rgba(99,102,241,0.08); border-radius:8px; font-size:0.8rem;">
                <span>📄</span>
                <span style="flex:1; font-weight:500;">{{ doc.nombre }}</span>
                <span *ngIf="doc.urgente" style="font-size:0.65rem; background:#fecaca; color:#dc2626; padding:0.1rem 0.3rem; border-radius:3px; font-weight:700;">URGENTE</span>
                <button (click)="docUploadInput.click()" 
                        style="background:#6366f1; color:white; border:none; padding:0.25rem 0.5rem; border-radius:6px; font-size:0.7rem; cursor:pointer; font-weight:600;">
                  📎 Subir
                </button>
                <input #docUploadInput type="file" style="display:none" (change)="onDocRequirementUpload($event, msg.tramiteIdForUpload, doc.nombre)">
              </div>
            </div>
            
            <span class="time">{{ msg.timestamp | date:'HH:mm' }}</span>
          </div>
        </div>

        <div class="msg-ai loading" *ngIf="isTyping()">
          <div class="bubble">Escribiendo...</div>
        </div>
      </div>

      <div class="chat-input-area">
        <button class="voice-btn" [class.listening]="isListening" (click)="toggleListening()" title="Hablar por micrófono">
          {{ isListening ? '🛑' : '🎙️' }}
        </button>
        
        <!-- Botón de adjuntar documento premium -->
        <button class="attach-btn" (click)="fileInput.click()" [disabled]="isTyping()" title="Subir documento PDF/Imagen para clasificar">
          📎
        </button>
        <input #fileInput type="file" style="display: none" (change)="onFileSelected($event)" accept=".pdf,image/*">
        
        <input type="text" 
               [(ngModel)]="userInput" 
               (keyup.enter)="sendMessage()"
               placeholder="Pregunta o sube un documento..."
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
      width: 400px;
      height: 580px;
      background: rgba(255, 255, 255, 0.85);
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
      line-height: 1.4;
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

    .action-btn-container {
      display: flex;
      justify-content: flex-start;
      margin-top: 0.75rem;
      margin-bottom: 0.25rem;
    }

    .chat-action-btn {
      background: #22c55e;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(34, 197, 94, 0.3);
      transition: all 0.3s ease;
    }
    .chat-action-btn:hover {
      background: #16a34a;
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(34, 197, 94, 0.4);
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

    .voice-btn, .send-btn, .attach-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      transition: transform 0.2s;
      color: var(--text-muted);
    }
    .voice-btn:hover, .send-btn:hover, .attach-btn:hover { transform: scale(1.15); color: var(--primary); }
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
  isMuted = signal(false);
  isListening = false;
  isTyping = signal(false);
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  recognition: any;

  constructor(
    private router: Router, 
    private zone: NgZone,
    private http: HttpClient,
    public authService: AuthService,
    private politicaService: PoliticaWorkflowService
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

  toggleMute() {
    this.isMuted.update(v => !v);
    if (this.isMuted()) {
      window.speechSynthesis.cancel();
    }
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

    this.http.post('/api/v1/optimization/asistente', payload).subscribe({
      next: (res: any) => {
        this.isTyping.set(false);
        const aiResponse = res.respuesta;
        this.messages.update(prev => [...prev, { text: aiResponse, isAi: true, timestamp: new Date() }]);
        this.speakText(aiResponse);
        // RF-2.3: Verificar documentos faltantes para trámites activos
        this.checkPendingDocuments();
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

  // =============================================
  // RF-2.3: Gestión Inteligente de Requisitos
  // =============================================

  private checkPendingDocuments() {
    const user = this.authService.currentUser();
    if (!user || user.nombreRol !== 'CLIENTE') return;

    // Buscar el trámite activo más reciente del cliente
    this.http.get<any[]>(`/api/v1/tramites/mis-tramites`).subscribe({
      next: (tramites) => {
        const activo = tramites.find(t => 
          t.estadoActual !== 'FINALIZADO' && t.estadoActual !== 'RECHAZADO'
        );
        if (!activo) return;

        // Validar documentación con IA
        this.http.post<any>('/api/v1/optimization/asistente', {
          prompt: `¿Qué documentos le faltan al trámite ${activo.codigoTramite}?`,
          rol: 'SISTEMA_VALIDACION'
        }).subscribe();

        // Usar el endpoint de validación documental del microservicio IA
        this.http.post<any>('/ia/validar-documentacion-dinamica', {
          politica: activo.nombrePolitica || activo.idPolitica,
          documentos_actuales: activo.archivosAdjuntos?.map((a: any) => a.nombreOriginal) || [],
          datos_formulario: activo.datosFormulario || {}
        }).subscribe({
          next: (res: any) => {
            const docsRequeridos = res.documentos_requeridos || [];
            if (docsRequeridos.length > 0) {
              const docsList = docsRequeridos.map((d: any) => ({
                nombre: d.nombre || d,
                descripcion: d.motivo || 'Documento requerido para este trámite',
                urgente: d.urgente || false
              }));

              this.messages.update(prev => [...prev, {
                text: `📋 He detectado que al trámite ${activo.codigoTramite} le faltan los siguientes documentos. Puedes subirlos directamente desde aquí:`,
                isAi: true,
                timestamp: new Date(),
                pendingDocs: docsList,
                tramiteIdForUpload: activo.id
              }]);
            }
          },
          error: () => { /* Silencioso: no interrumpir la conversación si falla */ }
        });
      },
      error: () => { /* Silencioso */ }
    });
  }

  onDocRequirementUpload(event: any, tramiteId: string | undefined, docName: string) {
    const file = event.target.files?.[0];
    if (!file || !tramiteId) return;

    this.messages.update(prev => [...prev, {
      text: `📤 Subiendo "${file.name}" como ${docName}...`,
      isAi: false,
      timestamp: new Date()
    }]);
    this.isTyping.set(true);

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('idTramiteInstancia', tramiteId);

    this.http.post('/api/v1/archivos/upload', formData).subscribe({
      next: () => {
        this.isTyping.set(false);
        this.messages.update(prev => [...prev, {
          text: `✅ Documento "${docName}" adjuntado correctamente al trámite. ¡Buen trabajo!`,
          isAi: true,
          timestamp: new Date()
        }]);
        this.speakText(`Documento ${docName} adjuntado correctamente.`);
      },
      error: () => {
        this.isTyping.set(false);
        this.messages.update(prev => [...prev, {
          text: `❌ Error al subir "${docName}". Intenta de nuevo.`,
          isAi: true,
          timestamp: new Date()
        }]);
      }
    });

    event.target.value = '';
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.messages.update(prev => [...prev, { 
      text: `📎 Subiendo y analizando documento: "${file.name}"...`, 
      isAi: false, 
      timestamp: new Date() 
    }]);
    this.isTyping.set(true);

    this.politicaService.listarCatalogoPublico().subscribe({
      next: (politicas) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('politicas', JSON.stringify(politicas));

        this.http.post('/ia/analisis-documento', formData).subscribe({
          next: (res: any) => {
            this.isTyping.set(false);
            
            const polId = res.politica_asignada_id;
            const polNombre = res.nombre_politica;
            const score = res.score;
            const resumen = res.resumen_documento;
            const datos = res.datos_extraidos;

            let respuestaChat = `📋 **Resumen del documento analizado:**\n${resumen}\n\n`;
            
            if (datos) {
              respuestaChat += `🔑 **Datos Clave Extraídos:**\n`;
              if (datos.nombre_cliente) respuestaChat += `- **Cliente:** ${datos.nombre_cliente}\n`;
              if (datos.ci_cliente) respuestaChat += `- **Cédula de Identidad:** ${datos.ci_cliente}\n`;
              if (datos.monto) respuestaChat += `- **Monto:** $${datos.monto}\n`;
              if (datos.fecha) respuestaChat += `- **Fecha:** ${datos.fecha}\n`;
              respuestaChat += `\n`;
            }

            if (polId && score > 0.4) {
              respuestaChat += `🎯 **Inferencia de Trámite:** He determinado con un ${(score * 100).toFixed(0)}% de confianza que este documento corresponde a la política de **"${polNombre}"**.\n\n¿Deseas iniciar este trámite de inmediato con los datos extraídos?`;
              
              this.messages.update(prev => [...prev, { 
                text: respuestaChat, 
                isAi: true, 
                timestamp: new Date(),
                actionButton: {
                  label: `Iniciar trámite de ${polNombre}`,
                  route: `/dashboard/tramites/iniciar`,
                  queryParams: { 
                    politicaId: polId,
                    nombreCliente: datos?.nombre_cliente || '',
                    ciCliente: datos?.ci_cliente || '',
                    monto: datos?.monto || ''
                  }
                }
              }]);
            } else {
              respuestaChat += `⚠️ No he podido asociar este documento a ninguna política de negocio activa de forma concluyente. ¿Podrías darme más detalles o seleccionar un trámite manualmente?`;
              this.messages.update(prev => [...prev, { 
                text: respuestaChat, 
                isAi: true, 
                timestamp: new Date() 
              }]);
            }
            
            this.speakText(respuestaChat);
          },
          error: (err) => {
            this.isTyping.set(false);
            console.error('Error analizando documento:', err);
            this.messages.update(prev => [...prev, { 
              text: 'Hubo un error al procesar el archivo. Asegúrate de que sea un PDF o imagen válido.', 
              isAi: true, 
              timestamp: new Date() 
            }]);
          }
        });
      },
      error: (err) => {
        this.isTyping.set(false);
        console.error('Error listando catálogo:', err);
        this.messages.update(prev => [...prev, { 
          text: 'No se pudo obtener el catálogo de políticas de negocio para la validación.', 
          isAi: true, 
          timestamp: new Date() 
        }]);
      }
    });

    event.target.value = '';
  }

  executeAction(action: any) {
    this.toggleChat();
    this.router.navigate([action.route], { queryParams: action.queryParams });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  private speakText(text: string): void {
    if (this.isMuted() || !('speechSynthesis' in window)) return;
    
    const cleanText = text.replace(/[*#_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  }
}
