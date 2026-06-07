import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
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
        <button class="history-toggle-btn" (click)="toggleHistory()">
          <span class="material-symbols-outlined">history</span>
          {{ showHistory ? 'Ocultar Actividad' : 'Ver Actividad' }}
        </button>
      </div>

      <div *ngIf="isFallback" class="fallback-warning-banner">
        <span class="material-symbols-outlined">warning</span>
        <span>Este documento no existía físicamente en el servidor de archivos (GCS/GridFS). Se ha cargado una versión vacía de contingencia. Al guardar cambios se creará el archivo real.</span>
      </div>

      <div class="main-layout">
        <div class="editor-section">
          <div *ngIf="loading" class="loading-overlay">
            <div class="spinner-container">
              <span class="material-symbols-outlined spin-icon">sync</span>
              <p>Cargando editor colaborativo...</p>
            </div>
          </div>
          <div *ngIf="error" class="error-overlay">
            <span class="material-symbols-outlined error-icon">error</span>
            <p>{{ error }}</p>
          </div>
          <div id="onlyoffice-placeholder" class="editor-wrapper"></div>
        </div>

        <!-- SIDEBAR DE HISTORIAL -->
        <div class="history-sidebar" [class.open]="showHistory">
          <div class="sidebar-header">
            <h3>Actividad del Archivo</h3>
            <button class="refresh-btn" (click)="loadHistory()" [disabled]="loadingHistory" title="Actualizar bitácora">
              <span class="material-symbols-outlined" [class.spin-icon]="loadingHistory">refresh</span>
            </button>
          </div>

          <div class="sidebar-content">
            <div *ngIf="loadingHistory" class="sidebar-loading">
              <span class="material-symbols-outlined spin-icon">sync</span>
              <p>Cargando bitácora...</p>
            </div>
            
            <div *ngIf="!loadingHistory && history.length === 0" class="no-history">
              <span class="material-symbols-outlined history-empty-icon">info</span>
              <p>No hay acciones registradas para este archivo.</p>
            </div>

            <div *ngIf="!loadingHistory && history.length > 0" class="history-timeline">
              <div class="history-item" *ngFor="let item of history">
                <div class="item-icon-wrapper" [ngClass]="item.action.toLowerCase()">
                  <span class="material-symbols-outlined">{{ getActionIcon(item.action) }}</span>
                </div>
                <div class="item-details">
                  <div class="item-header">
                    <span class="user-actor">{{ item.username }}</span>
                    <span class="action-badge" [ngClass]="item.action.toLowerCase()">{{ item.action }}</span>
                  </div>
                  <p class="action-description">{{ item.details }}</p>
                  <div class="item-footer">
                    <span class="timestamp">{{ item.timestamp | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span class="ip-address">IP: {{ item.ipAddress }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background: #121212;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 30px; /* Margen y padding mayor para responsividad */
      background: var(--primary, #070235); /* Azul marino del logo BPM */
      color: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      z-index: 10;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .fallback-warning-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      background: rgba(245, 158, 11, 0.15);
      border-bottom: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      font-size: 13px;
      font-weight: 500;
      z-index: 9;
    }
    .back-button {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: #e0e0e0;
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    .back-button:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border-color: rgba(255, 255, 255, 0.4);
    }
    .header-title {
      font-weight: 500;
      font-size: 16px;
      color: #f5f5f5;
    }
    .history-toggle-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--primary-container, #1E1B4B); /* Botón de actividad a tono con la paleta */
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      margin-right: 15px; /* Mover el botón un poco a la izquierda */
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .history-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.4);
    }
    .main-layout {
      display: flex;
      flex: 1;
      width: 100%;
      height: calc(100% - 60px);
      overflow: hidden;
      position: relative; /* Habilitar posicionamiento absoluto de los hijos */
    }
    .editor-section {
      flex: 1;
      height: 100%;
      position: relative;
    }
    .loading-overlay, .error-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(18, 18, 18, 0.95);
      font-size: 18px;
      color: #e0e0e0;
      z-index: 5;
    }
    .spinner-container, .error-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .spin-icon {
      animation: spin 1.5s linear infinite;
      font-size: 36px;
      color: #2563eb;
    }
    .error-icon {
      font-size: 48px;
      color: #ef4444;
    }
    .error-overlay p {
      color: #ef4444;
      font-weight: 500;
    }
    .editor-wrapper {
      width: 100%;
      height: 100%;
      background: #ffffff;
    }
    
    /* SIDEBAR STYLES */
    .history-sidebar {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 350px;
      transform: translateX(100%);
      background: rgba(255, 255, 255, 0.72); /* Fondo claro frosted glass similar al perfil */
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-left: 1px solid rgba(255, 255, 255, 0.4);
      display: flex;
      flex-direction: column;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 8;
      height: 100%;
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.08);
    }
    .history-sidebar.open {
      transform: translateX(0);
    }
    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(7, 2, 53, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.45); /* Encabezado de barra lateral traslúcido */
    }
    .sidebar-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--primary, #070235); /* Color azul del logo BPM */
    }
    .refresh-btn {
      background: transparent;
      color: var(--primary, #070235);
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: all 0.2s ease;
    }
    .refresh-btn:hover {
      color: var(--primary, #070235);
      background: rgba(7, 2, 53, 0.06);
    }
    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    .sidebar-loading, .no-history {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #4a5568;
      text-align: center;
      gap: 10px;
    }
    .history-empty-icon {
      font-size: 32px;
      color: #718096;
    }
    .history-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
    }
    .history-timeline::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 16px;
      width: 2px;
      background: rgba(7, 2, 53, 0.12); /* Línea de tiempo azulada clara */
    }
    .history-item {
      display: flex;
      gap: 14px;
      position: relative;
      background: rgba(255, 255, 255, 0.6); /* Tarjeta clara traslúcida */
      border: 1px solid rgba(7, 2, 53, 0.08);
      border-radius: 8px;
      padding: 12px;
      transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
    }
    .history-item:hover {
      transform: translateY(-2px);
      border-color: rgba(7, 2, 53, 0.18);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 4px 12px rgba(7, 2, 53, 0.04);
    }
    .item-icon-wrapper {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e2e8f0;
      z-index: 1;
      flex-shrink: 0;
    }
    .item-icon-wrapper span {
      font-size: 18px;
    }
    
    /* Action Type Themes */
    .item-icon-wrapper.creacion { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .item-icon-wrapper.lectura { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
    .item-icon-wrapper.modificacion { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
    .item-icon-wrapper.eliminacion { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

    .action-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .action-badge.creacion { background: rgba(16, 185, 129, 0.15); color: #059669; }
    .action-badge.lectura { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
    .action-badge.modificacion { background: rgba(245, 158, 11, 0.15); color: #d97706; }
    .action-badge.eliminacion { background: rgba(239, 68, 68, 0.15); color: #dc2626; }

    .item-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .user-actor {
      font-weight: 600;
      font-size: 13px;
      color: var(--primary, #070235); /* Color de actor en azul de la marca */
    }
    .action-description {
      margin: 0;
      font-size: 12px;
      color: #2d3748; /* Texto descriptivo en gris oscuro legible */
      line-height: 1.4;
    }
    .item-footer {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #718096;
      margin-top: 4px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding-top: 4px;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class OnlyofficeEditor implements OnInit, AfterViewInit, OnDestroy {
  archivoId: string = '';
  tramiteId: string = '';
  loading: boolean = true;
  error: string | null = null;
  docEditor: any;

  // History Sidebar variables
  history: any[] = [];
  showHistory: boolean = false;
  loadingHistory: boolean = false;
  isFallback: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.archivoId = this.route.snapshot.paramMap.get('id') || '';
    this.tramiteId = this.route.snapshot.queryParamMap.get('tramiteId') || '';
    this.loadHistory();
  }

  ngAfterViewInit() {
    if (!this.archivoId) {
      this.error = "No se especificó un archivo para editar.";
      this.loading = false;
      this.cdr.detectChanges();
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
        this.cdr.detectChanges();
        
        if (typeof DocsAPI === 'undefined') {
          this.error = "No se pudo cargar la API de OnlyOffice. Verifica que el Document Server esté en ejecución.";
          this.cdr.detectChanges();
          return;
        }

        config.events = {
          "onDocumentStateChange": (event: any) => {
            console.log("OnlyOffice state changed:", event.data);
            this.loadHistory();
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
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error(err);
        this.error = "No se pudo obtener la configuración del documento. Verifica tus permisos.";
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
    if (this.showHistory) {
      this.loadHistory();
    }
  }

  loadHistory() {
    if (!this.archivoId) return;
    this.loadingHistory = true;
    const usuarioActual = this.authService.currentUser();
    const idUsuario = usuarioActual ? usuarioActual.id : 'unknown';
    
    this.http.get<any[]>(`/api/v1/archivos/${this.archivoId}/historial?idUsuario=${idUsuario}`).subscribe({
      next: (data) => {
        // Ordenar de forma descendente por timestamp (los más recientes primero)
        this.history = [...data].sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        this.isFallback = data.some(item => 
          item.details && item.details.includes("Archivo físico ausente")
        );
        this.loadingHistory = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al cargar historial del archivo:", err);
        this.loadingHistory = false;
        this.cdr.detectChanges();
      }
    });
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'CREACION': return 'cloud_upload';
      case 'LECTURA': return 'visibility';
      case 'MODIFICACION': return 'edit';
      case 'ELIMINACION': return 'delete';
      default: return 'info';
    }
  }

  goBack() {
    if (this.tramiteId) {
      this.router.navigate(['/app/tramite/atencion', this.tramiteId]);
    } else {
      window.history.back();
    }
  }
}
