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
  metrics: MetricData[] = [];
  realTimeMetrics: MetricData[] = [];
  aiReport: string = '';
  formattedReport: SafeHtml = '';
  errorMsg: string = '';

  // --- Filtros ---
  filtros = { meses: 0, idDepartamento: '', idPolitica: '' };

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
    this.errorMsg = '';
    
    // Fetch global real-time metrics (no filters) for the top panel
    this.analiticaService.getMetrics(0, '').subscribe({
      next: (data) => {
        this.realTimeMetrics = data;
        // Also fetch filtered metrics for charts
        this.fetchFilteredMetrics();
      },
      error: (err) => {
        console.error('Error fetching global metrics:', err);
        this.handleError();
      }
    });
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
    this.http.post<any>('/api/v1/optimization/analyze', {}).subscribe({
      next: (res) => {
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

  private formatReport(text: string): SafeHtml {
    // Convertir secciones [TÍTULO] en headers destacados
    let html = text
      .replace(/\[([A-ZÁÉÍÓÚÑ_\s]+)\]/g, '<br><strong style="color:#4f46e5;">[$1]</strong><br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
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
      next: (res) => {
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

    let chartImageBase64 = '';
    try {
      if (this.chart?.chart) {
        chartImageBase64 = this.chart.chart.toBase64Image();
      }
    } catch (e) {
      console.warn('No se pudo extraer la imagen del gráfico', e);
    }

    this.analiticaService.downloadPdf(this.aiReport, chartImageBase64).subscribe({
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

  // ========================================
  //  REESTRUCTURACIÓN
  // ========================================

  onOrigenChange() {
    this.usuariosOrigen = [];
    this.selectedUserIds = [];
    if (!this.reassignForm.idOrigen) return;
    this.http.get<any[]>('/api/v1/usuarios/departamento/' + this.reassignForm.idOrigen).subscribe(users => {
      this.usuariosOrigen = users;
      this.cdr.detectChanges();
    });
  }

  toggleUser(userId: string) {
    const idx = this.selectedUserIds.indexOf(userId);
    if (idx > -1) this.selectedUserIds.splice(idx, 1);
    else this.selectedUserIds.push(userId);
  }

  ejecutarTransferencia() {
    if (this.selectedUserIds.length === 0) return;
    this.executingAction = true;
    this.analiticaService.reassignPersonal({
      idOrigen: this.reassignForm.idOrigen,
      idDestino: this.reassignForm.idDestino,
      userIds: this.selectedUserIds,
      motivo: this.reassignForm.motivo
    }).subscribe({
      next: () => {
        this.executingAction = false;
        this.cargarMetricas();
        this.usuariosOrigen = [];
        this.selectedUserIds = [];
        alert('🚀 Reequilibrio de personal ejecutado con éxito.');
      },
      error: () => {
        this.executingAction = false;
        alert('Fallo en la ejecución de transferencia.');
      }
    });
  }
}
