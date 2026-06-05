import { Component, OnInit, OnDestroy, Input, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { AuthService } from '../../../../data/services/auth.service';

@Component({
  selector: 'app-collaborative-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './collaborative-editor.html',
  styleUrls: ['./collaborative-editor.css']
})
export class CollaborativeEditorComponent implements OnInit, OnDestroy {
  @Input() documentId: string = 'default-doc';
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  editor!: Editor;
  provider!: WebsocketProvider;
  ydoc!: Y.Doc;
  
  status: 'connecting' | 'connected' | 'disconnected' = 'connecting';
  activeUsers: any[] = [];
  currentUser: any;

  // Colors for 3 concurrent users
  private colors = ['#f59e0b', '#10b981', '#3b82f6'];

  constructor(private authService: AuthService, private cd: ChangeDetectorRef) {
    this.currentUser = this.authService.currentUser || { id: 'anon', email: 'Anónimo' };
  }

  ngOnInit(): void {
    this.ydoc = new Y.Doc();

    // Use WebSockets for real-time connection. Connect to backend websocket endpoint.
    const wsUrl = `ws://${window.location.host}/api/v1/yjs`;
    
    this.provider = new WebsocketProvider(wsUrl, this.documentId, this.ydoc);

    this.provider.on('status', (event: { status: string }) => {
      this.status = event.status as any;
      this.cd.detectChanges();
    });

    const userColor = this.colors[Math.floor(Math.random() * this.colors.length)];

    this.editor = new Editor({
      element: this.editorContainer.nativeElement,
      extensions: [
        StarterKit.configure({
          history: false, // history is handled by yjs
        } as any),
        Collaboration.configure({
          document: this.ydoc,
        }),
        CollaborationCursor.configure({
          provider: this.provider,
          user: {
            name: this.currentUser.email,
            color: userColor,
          },
        }),
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-invert prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[500px]',
        },
      },
    });

    // Listen for changes in awareness state (online users)
    this.provider.awareness.on('change', () => {
      const states = Array.from(this.provider.awareness.getStates().values());
      this.activeUsers = states.filter((state: any) => state['user']).map((state: any) => state['user']);
      this.cd.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.destroy();
    }
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
    }
    if (this.ydoc) {
      this.ydoc.destroy();
    }
  }

  guardarDocumento(): void {
    // Save Yjs document state to backend
    const state = Y.encodeStateAsUpdate(this.ydoc);
    
    // Create a Blob from the Uint8Array
    const blob = new Blob([state as any], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('documentId', this.documentId);
    formData.append('yjsState', blob);

    fetch('/api/v1/archivos/yjs/save', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token') // O donde guardes el token
      },
      body: formData
    })
    .then(response => {
      if (response.ok) {
        alert('Documento guardado y exportado a Word.');
        // close logic if there's any
      } else {
        alert('Error al guardar el documento.');
      }
    })
    .catch(error => {
      console.error('Error guardando documento Yjs:', error);
      alert('Error de red al guardar.');
    });
  }
}
