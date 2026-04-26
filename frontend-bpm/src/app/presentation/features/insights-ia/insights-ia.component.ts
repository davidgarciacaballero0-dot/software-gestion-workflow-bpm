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
        this.aiReport = res.reporte || res.respuesta || JSON.stringify(res);
        this.formattedReport = this.formatReport(this.aiReport);
        this.analyzingIA = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.aiReport = '⚠️ El Cerebro IA (Puerto 8000) no respondió. Inicie el servicio Python.';
        this.formattedReport = this.formatReport(this.aiReport);
        this.analyzingIA = false;
        this.cdr.detectChanges();
      }
    });
  }

  private aiDetailedReport: string = '';

  private formatReport(input: any): SafeHtml {
    let html = '';
    let data: any = {};

    try {
      data = typeof input === 'string' ? JSON.parse(input) : input;
    } catch (e) {
      return this.sanitizer.bypassSecurityTrustHtml(input.replace(/\n/g, '<br>'));
    }

    // Guardar versión detallada para el PDF (si existe)
    if (data.analisis_detallado) {
      this.aiDetailedReport = `REPORTE DETALLADO DE CONSULTORÍA IA\n\n` + 
                              `ANÁLISIS PROFUNDO:\n${data.analisis_detallado}\n\n` +
                              `RECOMENDACIONES:\n${(data.recomendaciones || []).join('\n')}`;
    }

    // 1. Mostrar Versión Breve (Analisis)
    const analisis = data.analisis_breve || data.analisis || '';
    if (analisis) {
      html += `<div class="report-section mb-4">
                <h4 style="color: #4f46e5; border-bottom: 2px solid #eef2ff; padding-bottom: 0.5rem; margin-bottom: 1rem;">
                  🔍 Análisis de Rendimiento
                </h4>
                <p style="line-height: 1.6; color: #334155; font-weight: 500;">${analisis}</p>
              </div>`;
    }

    // 2. Recomendaciones (Breves)
    if (data.recomendaciones && Array.isArray(data.recomendaciones)) {
      html += `<div class="report-section mt-4" style="background: rgba(79, 70, 229, 0.03); padding: 1rem; border-radius: 12px; border-left: 4px solid #4f46e5;">
                <h4 style="color: #4f46e5; margin-bottom: 0.8rem; font-size: 0.9rem;">🚀 Recomendaciones</h4>
                <ul style="padding-left: 1.2rem; margin: 0; color: #334155; font-size: 0.85rem;">`;
      
      data.recomendaciones.slice(0, 3).forEach((rec: string) => {
        html += `<li style="margin-bottom: 0.5rem;">${rec}</li>`;
      });
      
      html += `</ul></div>`;
    }

    // 3. Nivel de Alerta
    if (data.nivel_alerta) {
      const color = data.nivel_alerta.toLowerCase().includes('alto') ? '#ef4444' : '#f59e0b';
      html = `<div style="display:flex; justify-content: flex-end; margin-bottom: 0.5rem;">
                <span style="background: ${color}22; color: ${color}; padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; border: 1px solid ${color}44;">
                  ${data.nivel_alerta.toUpperCase()}
                </span>
              </div>` + html;
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
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

  solicitarProyeccion() {
    this.projectingIA = true;
    this.projectionData = null;
    this.http.post<any>('/api/v1/optimization/projections', { meses: this.horizonteMeses }).subscribe({
      next: (res: any) => {
        this.projectionData = res;
        this.projectionReport = res.analisis_predictivo || '';
        this.projectingIA = false;
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Error al generar la proyección. Verifique el microservicio de IA.');
        this.projectingIA = false;
        this.cdr.detectChanges();
      }
    });
  }
}
