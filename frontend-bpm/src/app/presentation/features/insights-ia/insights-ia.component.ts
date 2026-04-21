import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
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
export class InsightsIAComponent implements OnInit, AfterViewInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  activeTab: 'analisis' | 'ejecucion' = 'analisis';
  loadingMetrics = false;
  analyzingIA = false;
  executingAction = false;
  
  metrics: MetricData[] = [];
  aiReport: string = '';
  errorMsg: string = '';

  reassignForm = { idOrigen: '', idDestino: '', motivo: 'Reequilibrio sugerido por IA' };
  usuariosOrigen: any[] = [];
  selectedUserIds: string[] = [];

  public barChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: '#94a3b8' } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#64748b' }, grid: { display: false } }
    }
  };

  public barChartType: any = 'bar';
  public barChartData: any = {
    labels: [],
    datasets: [
      { data: [], label: 'Carga Real', backgroundColor: '#6366f1', borderRadius: 4 },
      { data: [], label: 'Capacidad', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 4 }
    ]
  };

  constructor(
    private analiticaService: AnaliticaService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarMetricas();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.refreshCharts(), 500);
  }

  switchTab(tab: 'analisis' | 'ejecucion') {
    this.activeTab = tab;
    this.cdr.detectChanges();
    if (tab === 'analisis') {
      setTimeout(() => this.refreshCharts(), 150);
    }
  }

  cargarMetricas() {
    this.loadingMetrics = true;
    this.errorMsg = '';
    this.analiticaService.getMetrics().subscribe({
      next: (data) => {
        this.metrics = data;
        this.updateChartData();
        this.loadingMetrics = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error -100 Detection:', err);
        this.errorMsg = 'Error de conexión con el Backend (Code -100). Verifique que el servicio Java esté corriendo.';
        this.loadingMetrics = false;
      }
    });
  }

  updateChartData() {
    if (!this.metrics.length) return;
    this.barChartData.labels = this.metrics.map(m => m.nombreDepartamento);
    this.barChartData.datasets[0].data = this.metrics.map(m => m.cantidadTramites);
    this.barChartData.datasets[1].data = this.metrics.map(m => m.capacidadPersonal);
    this.refreshCharts();
  }

  refreshCharts() {
    if (this.chart && this.chart.chart) {
      this.chart.chart.update();
    }
  }

  solicitarAnalisisIA() {
    this.analyzingIA = true;
    this.aiReport = '';
    this.http.post<any>('/api/v1/optimization/analyze', {}).subscribe({
      next: (res) => {
        this.aiReport = res.reporte;
        this.analyzingIA = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.aiReport = '⚠️ El Cerebro IA (Puerto 8000) no respondió. Inicie el servicio Python.';
        this.analyzingIA = false;
      }
    });
  }

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
