import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AnaliticaService, MetricData } from '../../../data/services/analitica.service';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';

// Registro global necesario para Chart.js en versiones modernas
Chart.register(...registerables);

@Component({
  selector: 'app-insights-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './insights-ia.component.html',
  styleUrls: ['./insights-ia.component.css']
})
export class InsightsIAComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // --- Estado General ---
  loadingMetrics = false;
  analyzingIA = false;
  executingAction = false;
  filtros = { meses: 0, idDepartamento: '' };
  activeTab: 'historico' | 'proyeccion' = 'historico';
  
  // Métricas para Gráficos e IA
  metrics: MetricData[] = [];
  aiReport: string = '';
  formattedReport: SafeHtml = '';
  errorMsg: string = '';

  // --- Voz ---
  isListening = false;
  voiceTranscript = '';
  private recognition: any = null;

  // --- Reestructuración ---
  reassignForm = { idOrigen: '', idDestino: '', motivo: 'Reequilibrio sugerido por IA' };
  usuariosOrigen: any[] = [];
  selectedUserIds: string[] = [];

  // --- Chart ---
  public barChartType: 'bar' | 'line' = 'bar';
  public barChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#64748b', font: { family: 'Inter', size: 12 } } }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' }
      },
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { display: false }
      }
    }
  };

  public barChartData: any = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Trámites Activos',
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: '#6366f1'
      },
      {
        data: [],
        label: 'Capacidad Personal',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: 'rgba(99, 102, 241, 0.4)',
        borderWidth: 1,
        borderRadius: 6
      },
      {
        data: [],
        label: 'Retrasos (Brecha SLA)',
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  constructor(
    private analiticaService: AnaliticaService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  // ========================================
  //  KPI GETTERS (Calculados sobre métricas filtradas)
  // ========================================

  get totalTramites(): number {
    return this.metrics.reduce((sum, m) => sum + m.cantidadTramites, 0);
  }

  get totalPersonal(): number {
    return this.metrics.reduce((sum, m) => sum + m.capacidadPersonal, 0);
  }

  get tiempoPromedioGlobal(): number {
    if (!this.metrics.length) return 0;
    const sum = this.metrics.reduce((s, m) => s + m.tiempoPromedioHoras, 0);
    return sum / this.metrics.length;
  }

  get totalRetrasos(): number {
    return this.metrics.reduce((sum, m) => sum + (m.retrasosSla || 0), 0);
  }

  ngOnInit(): void {
    this.cargarMetricas();
    this.initVoiceRecognition();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.refreshCharts(), 500);
  }

  ngOnDestroy(): void {
    if (this.recognition) {
      try { this.recognition.abort(); } catch (_) {}
    }
  }

  // ========================================
  //  MÉTRICAS
  // ========================================

  cargarMetricas() {
    this.loadingMetrics = true;
    this.fetchFilteredMetrics();
  }

  fetchFilteredMetrics() {
    this.analiticaService.getMetrics(this.filtros.meses, this.filtros.idDepartamento).subscribe({
      next: (data) => {
        this.metrics = data; // these are the filtered ones used for charts
        this.updateChartData();
        this.loadingMetrics = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching filtered metrics:', err);
        this.handleError();
      }
    });
  }

  handleError() {
    this.errorMsg = 'Error de conexión con el Backend. Verifique que el servicio Java esté corriendo.';
    this.loadingMetrics = false;
    this.cdr.detectChanges();
  }

  getLoadPercent(m: MetricData): number {
    if (!m.capacidadPersonal || m.capacidadPersonal === 0) {
      return m.cantidadTramites > 0 ? 100 : 0;
    }
    const ratio = (m.cantidadTramites / m.capacidadPersonal) * 100;
    return Math.min(ratio, 100);
  }

  aplicarFiltros() {
    this.loadingMetrics = true;
    this.fetchFilteredMetrics();
  }

  // ========================================
  //  CHART
  // ========================================

  updateChartData() {
    if (!this.metrics.length) return;
    this.barChartData = {
      ...this.barChartData,
      labels: this.metrics.map(m => this.truncateName(m.nombreDepartamento)),
      datasets: [
        {
          ...this.barChartData.datasets[0],
          data: this.metrics.map(m => m.cantidadTramites)
        },
        {
          ...this.barChartData.datasets[1],
          data: this.metrics.map(m => m.capacidadPersonal)
        },
        {
          ...this.barChartData.datasets[2],
          data: this.metrics.map(m => m.retrasosSla || 0)
        }
      ]
    };
    this.refreshCharts();
  }

  private truncateName(name: string): string {
    if (name.length <= 10) return name;
    return name.substring(0, 8) + '..';
  }

  refreshCharts() {
    if (this.chart?.chart) {
      this.chart.chart.update();
    }
  }

  toggleChartType() {
    this.barChartType = this.barChartType === 'bar' ? 'line' : 'bar';
    setTimeout(() => this.refreshCharts(), 100);
  }

  // ========================================
  //  ANÁLISIS IA
  // ========================================

  solicitarAnalisisIA() {
    this.analyzingIA = true;
    this.aiReport = '';
    this.formattedReport = '';
    this.http.post<any>('/api/v1/optimization/analyze', { 
      meses: this.filtros.meses, 
      idDepartamento: this.filtros.idDepartamento 
    }).subscribe({
      next: (res: any) => {
        // Guardar el reporte completo (puede ser un objeto profundo de la IA)
        this.aiReport = JSON.stringify(res);
        this.formattedReport = this.formatReport(res);
        this.analyzingIA = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.aiReport = '⚠️ El Cerebro IA (Puerto 8000) no respondió. Inicie el servicio Python.';
        this.formattedReport = this.sanitizer.bypassSecurityTrustHtml('<p style="color:#ef4444;">' + this.aiReport + '</p>');
        this.analyzingIA = false;
        this.cdr.detectChanges();
      }
    });
  }

  private aiDetailedReport: string = '';

  private formatReport(input: any): SafeHtml {
    let data: any = {};

    try {
      data = typeof input === 'string' ? JSON.parse(input) : input;
    } catch (e) {
      const text = typeof input === 'string' ? input : JSON.stringify(input);
      return this.sanitizer.bypassSecurityTrustHtml('<p style="line-height:1.6; color:#334155;">' + text.replace(/\n/g, '<br>') + '</p>');
    }

    // Guardar versión plana para PDF
    this.aiDetailedReport = JSON.stringify(data, null, 2);

    // Renderizar recursivamente cualquier estructura JSON de la IA
    const html = this.renderJsonToHtml(data, 0);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Renderiza CUALQUIER estructura JSON de la IA en HTML cards bonitas.
   * Convierte claves camelCase/snake_case en títulos legibles.
   */
  private renderJsonToHtml(obj: any, depth: number): string {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string') return `<p style="line-height:1.6; color:#334155; margin:0.3rem 0;">${obj}</p>`;
    if (typeof obj === 'number' || typeof obj === 'boolean') return `<span style="font-weight:600; color:#4f46e5;">${obj}</span>`;

    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const icons = ['🔍', '📊', '💡', '⚙️', '📋', '🚀', '👥', '📈'];
    let html = '';

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '';
      // Si es un array de strings simples, renderizar como lista
      if (typeof obj[0] === 'string') {
        html += '<ul style="padding-left:1.2rem; margin:0.3rem 0; color:#334155; font-size:0.85rem;">';
        obj.forEach((item: string) => { html += `<li style="margin-bottom:0.4rem;">${item}</li>`; });
        html += '</ul>';
      } else {
        // Array de objetos: renderizar cada uno como sub-card
        obj.forEach((item: any, i: number) => {
          html += `<div style="background:rgba(99,102,241,0.03); padding:0.6rem 0.8rem; border-radius:8px; margin-bottom:0.5rem; border-left:3px solid ${colors[i % colors.length]};">`;
          html += this.renderJsonToHtml(item, depth + 1);
          html += '</div>';
        });
      }
      return html;
    }

    // Es un objeto: renderizar cada clave como sección
    const keys = Object.keys(obj);
    // Filtrar claves de status/error/metadata
    const skipKeys = ['status', 'error'];

    keys.forEach((key, idx) => {
      if (skipKeys.includes(key)) return;
      const val = obj[key];
      if (val === null || val === undefined || val === '') return;

      const label = this.formatKeyLabel(key);
      const color = colors[idx % colors.length];
      const icon = icons[idx % icons.length];

      if (typeof val === 'string') {
        // String directo: mostrar como párrafo con título
        if (depth === 0) {
          html += `<div style="margin-bottom:0.8rem;">
                    <h4 style="color:${color}; font-size:0.85rem; margin-bottom:0.3rem; display:flex; align-items:center; gap:0.3rem;">${icon} ${label}</h4>
                    <p style="line-height:1.6; color:#334155; font-size:0.85rem; margin:0;">${val}</p>
                  </div>`;
        } else {
          html += `<p style="margin:0.2rem 0; font-size:0.83rem; color:#334155;"><strong style="color:#475569;">${label}:</strong> ${val}</p>`;
        }
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        html += `<p style="margin:0.2rem 0; font-size:0.83rem;"><strong style="color:#475569;">${label}:</strong> <span style="font-weight:600; color:${color};">${val}</span></p>`;
      } else if (typeof val === 'object') {
        // Objeto o Array anidado
        if (depth === 0) {
          html += `<div style="background:rgba(99,102,241,0.02); padding:0.8rem; border-radius:12px; border-left:4px solid ${color}; margin-bottom:0.8rem;">
                    <h4 style="color:${color}; margin-bottom:0.5rem; font-size:0.88rem; display:flex; align-items:center; gap:0.3rem;">${icon} ${label}</h4>
                    ${this.renderJsonToHtml(val, depth + 1)}
                  </div>`;
        } else {
          html += `<div style="margin:0.3rem 0 0.3rem 0.5rem;">
                    <strong style="color:#475569; font-size:0.82rem;">${label}:</strong>
                    ${this.renderJsonToHtml(val, depth + 1)}
                  </div>`;
        }
      }
    });

    return html;
  }

  /** Convierte claves como 'analisis_bpm' o 'resumenEjecutivo' en 'Análisis Bpm' / 'Resumen Ejecutivo' */
  private formatKeyLabel(key: string): string {
    // snake_case a spaces
    let label = key.replace(/_/g, ' ');
    // camelCase a spaces
    label = label.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Capitalizar primera letra de cada palabra
    return label.replace(/\b\w/g, c => c.toUpperCase());
  }

  // ========================================
  //  VOICE RECOGNITION (Web Speech API)
  // ========================================

  private initVoiceRecognition() {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API no soportada en este navegador.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = true;
    this.recognition.continuous = false;

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.voiceTranscript = transcript;
      this.cdr.detectChanges();

      // Si el resultado es final, enviar al análisis
      if (event.results[event.results.length - 1].isFinal) {
        this.processVoiceCommand(transcript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.cdr.detectChanges();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.cdr.detectChanges();
    };
  }

  startVoice() {
    if (!this.recognition) {
      alert('Tu navegador no soporta reconocimiento de voz. Usa Google Chrome.');
      return;
    }
    this.voiceTranscript = '';
    this.isListening = true;
    this.recognition.start();
    this.cdr.detectChanges();
  }

  stopVoice() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isListening = false;
    this.cdr.detectChanges();
  }

  private processVoiceCommand(transcript: string) {
    this.isListening = false;
    const cmd = transcript.toLowerCase();

    // Si la consulta menciona análisis, generar análisis IA
    if (cmd.includes('analiz') || cmd.includes('reporte') || cmd.includes('cuello') || cmd.includes('botella') ||
        cmd.includes('carga') || cmd.includes('rendimiento') || cmd.includes('optimiz')) {
      this.solicitarAnalisisIA();
      return;
    }

    // Si dice "excel", exportar excel
    if (cmd.includes('excel') || cmd.includes('descargar') || cmd.includes('exportar')) {
      this.exportarExcel();
      return;
    }

    // Para cualquier otra cosa, enviar como prompt genérico al asistente
    this.analyzingIA = true;
    this.aiReport = '';
    this.formattedReport = '';
    this.cdr.detectChanges();

    this.http.post<any>('/api/v1/optimization/asistente', { prompt: transcript }).subscribe({
      next: (res: any) => {
        this.aiReport = res.respuesta || res.reporte || JSON.stringify(res);
        this.formattedReport = this.formatReport(this.aiReport);
        this.analyzingIA = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.aiReport = '⚠️ No se pudo procesar el comando de voz. Verifique los servicios.';
        this.formattedReport = this.formatReport(this.aiReport);
        this.analyzingIA = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ========================================
  //  EXPORTACIÓN MULTI-FORMATO
  // ========================================

  exportarExcel() {
    this.analiticaService.downloadExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte_gestion_bpm.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Error al descargar el reporte Excel. Verifique el backend.');
      }
    });
  }

  exportarPDF() {
    if (!this.aiReport) {
      alert('Primero genere un análisis IA para poder exportar el PDF.');
      return;
    }

    // Usar la versión detallada si existe, si no la normal
    const contentToExport = this.aiDetailedReport || this.aiReport;

    let chartImageBase64 = '';
    try {
      if (this.chart?.chart) {
        chartImageBase64 = this.chart.chart.toBase64Image();
      }
    } catch (e) {
      console.warn('No se pudo extraer la imagen del gráfico', e);
    }

    this.analiticaService.downloadPdf(contentToExport, chartImageBase64, this.metrics).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'informe_ia_consultoria.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Error al descargar el informe PDF. Verifique el backend.');
      }
    });
  }

  setTab(tab: 'historico' | 'proyeccion') {
    this.activeTab = tab;
    if (tab === 'historico') {
      setTimeout(() => this.refreshCharts(), 200);
    }
  }

  // ========================================
  //  PROYECCIONES IA (NUEVA FASE)
  // ========================================
  horizonteMeses = 3;
  projectingIA = false;
  projectionData: any = null;
  projectionReport = '';

  // Chart de Proyección
  public projectionChartData: any = { labels: [], datasets: [] };
  public projectionChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#64748b', font: { family: 'Inter', size: 12 } } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { ticks: { color: '#64748b' }, grid: { display: false } }
    }
  };

  /**
   * Extrae datos de proyección mensual de cualquier estructura JSON de la IA
   * y construye el gráfico de línea.
   */
  private buildProjectionChart(data: any): void {
    // Buscar el array de proyección mensual en cualquier nivel del JSON
    let items: any[] = [];
    const findArray = (obj: any): any[] => {
      if (!obj || typeof obj !== 'object') return [];
      if (Array.isArray(obj)) return obj;
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === 'object') {
          return obj[key];
        }
      }
      // Buscar en un nivel más profundo
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          const found = findArray(obj[key]);
          if (found.length > 0) return found;
        }
      }
      return [];
    };
    items = findArray(data);

    if (items.length === 0) return;

    // Extraer labels (mes) y valores (demanda estimada)
    const labels = items.map((item: any) => {
      return item.mes || item.month || item.periodo || item.label || `Mes ${items.indexOf(item) + 1}`;
    });

    const values = items.map((item: any) => {
      return item.demanda_estimada || item.total_estimado || item.valor || item.value || item.demanda || 0;
    });

    const upperBound = items.map((item: any) => {
      return item.limite_superior || item.upper_bound || item.maximo || null;
    });

    const lowerBound = items.map((item: any) => {
      return item.limite_inferior || item.lower_bound || item.minimo || null;
    });

    const datasets: any[] = [
      {
        data: values,
        label: 'Demanda Estimada',
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#6366f1',
        borderWidth: 2
      }
    ];

    // Agregar bandas de confianza si existen
    if (upperBound.some((v: any) => v !== null)) {
      datasets.push({
        data: upperBound,
        label: 'Límite Superior',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1
      });
    }
    if (lowerBound.some((v: any) => v !== null)) {
      datasets.push({
        data: lowerBound,
        label: 'Límite Inferior',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1
      });
    }

    this.projectionChartData = { labels, datasets };
    this.cdr.detectChanges();
  }

  solicitarProyeccion() {
    this.projectingIA = true;
    this.projectionData = null;
    this.projectionReport = '';
    this.http.post<any>('/api/v1/optimization/projections', { meses: this.horizonteMeses }).subscribe({
      next: (res: any) => {
        this.projectionData = res;
        // Construir el gráfico de línea con los datos de proyección
        this.buildProjectionChart(res);
        // Manejar que analisis_predictivo puede ser string, objeto, o estar anidado
        const pred = res.analisis_predictivo || res.respuesta || res;
        if (typeof pred === 'string') {
          this.projectionReport = pred;
        } else {
          // Es un objeto: renderizarlo como HTML bonito
          this.projectionReport = this.renderJsonToHtml(pred, 0);
        }
        this.projectingIA = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.projectingIA = false;
        const body = err?.error;
        const errorType = body?.errorType || '';
        let titulo = '❌ Error';
        let mensaje = 'Error desconocido al generar la proyección.';

        if (errorType === 'QUOTA_EXHAUSTED' || err.status === 429) {
          titulo = '⚠️ Cuota de IA Agotada';
          mensaje = 'La API del Asistente IA ha alcanzado su límite de uso. El microservicio funciona correctamente, pero se agotaron las peticiones disponibles.\n\nIntente nuevamente en unos minutos.';
        } else if (errorType === 'SERVICE_DOWN') {
          titulo = '🔌 Microservicio No Disponible';
          mensaje = 'El servicio de IA no está en ejecución. Verifique que el contenedor ia-service esté activo con: docker ps';
        } else if (errorType === 'TIMEOUT') {
          titulo = '⏱️ Tiempo de Espera Agotado';
          mensaje = 'El modelo de IA tardó demasiado en procesar la solicitud. Intente nuevamente.';
        } else if (body?.error) {
          mensaje = body.error + (body.details ? '\n\n' + body.details : '');
        }

        alert(titulo + '\n\n' + mensaje);
        this.cdr.detectChanges();
      }
    });
  }
}
