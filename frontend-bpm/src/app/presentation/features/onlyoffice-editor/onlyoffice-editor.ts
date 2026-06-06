import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../data/services/auth.service';

declare var DocsAPI: any;

@Component({
  selector: 'app-onlyoffice-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container">
      <div class="editor-header">
        <button class="back-button" (click)="goBack()">
          <span class="material-symbols-outlined">arrow_back</span>
          Volver al trámite
        </button>
        <span class="header-title">Editor de Documentos</span>
      </div>
      <div *ngIf="loading" class="loading-overlay">
        Cargando editor...
      </div>
      <div *ngIf="error" class="error-overlay">
        {{ error }}
      </div>
      <div id="onlyoffice-placeholder" class="editor-wrapper"></div>
    </div>
  `,
  styles: [`
    .editor-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }
    .editor-header {
      display: flex;
      align-items: center;
      padding: 10px 20px;
      background: #1e1e1e;
      color: white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 10;
    }
    .back-button {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: white;
      border: 1px solid #444;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .back-button:hover {
      background: #333;
    }
    .header-title {
      margin-left: 20px;
      font-weight: 500;
      font-size: 16px;
    }
    .loading-overlay, .error-overlay {
      position: absolute;
      top: 50px; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      font-size: 18px;
      color: #555;
      z-index: 5;
    }
    .error-overlay { color: #d32f2f; }
    .editor-wrapper {
      flex: 1;
      width: 100%;
      height: 100%;
    }
  `]
})
export class OnlyofficeEditor implements OnInit, AfterViewInit, OnDestroy {
  archivoId: string = '';
  tramiteId: string = '';
  loading: boolean = true;
  error: string | null = null;
  docEditor: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.archivoId = this.route.snapshot.paramMap.get('id') || '';
    this.tramiteId = this.route.snapshot.queryParamMap.get('tramiteId') || '';
  }

  ngAfterViewInit() {
    if (!this.archivoId) {
      this.error = "No se especificó un archivo para editar.";
      this.loading = false;
      return;
    }
    this.initEditor();
  }

  ngOnDestroy() {
    if (this.docEditor) {
      this.docEditor.destroyEditor();
    }
  }

  initEditor() {
    const usuarioActual = this.authService.currentUser();
    const idUsuario = usuarioActual ? usuarioActual.id : 'unknown';

    this.http.get<any>(`/api/v1/onlyoffice/config/${this.archivoId}?idUsuario=${idUsuario}`).subscribe({
      next: (config) => {
        this.loading = false;
        
        // Ensure OnlyOffice script is loaded
        if (typeof DocsAPI === 'undefined') {
          this.error = "No se pudo cargar la API de OnlyOffice. Verifica que el Document Server esté en ejecución.";
          return;
        }

        // Add event handlers
        config.events = {
          "onDocumentStateChange": (event: any) => {
            console.log("OnlyOffice state changed:", event.data);
          },
          "onError": (event: any) => {
            console.error("OnlyOffice error:", event.data);
          }
        };

        try {
          this.docEditor = new DocsAPI.DocEditor("onlyoffice-placeholder", config);
        } catch (err) {
          console.error(err);
          this.error = "Error al inicializar el editor.";
        }
      },
      error: (err) => {
        console.error(err);
        this.error = "No se pudo obtener la configuración del documento. Verifica tus permisos.";
        this.loading = false;
      }
    });
  }

  goBack() {
    if (this.tramiteId) {
      this.router.navigate(['/app/tramite/atencion', this.tramiteId]);
    } else {
      window.history.back();
    }
  }
}
