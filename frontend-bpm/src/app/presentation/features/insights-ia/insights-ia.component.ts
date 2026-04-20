import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-insights-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insights-ia.component.html',
  styleUrls: ['./insights-ia.component.css']
})
export class InsightsIAComponent implements OnInit {
  metrics: any[] = [];
  aiReport: string = '';
  loading = false;
  analyzing = false;
  applying = false;

  // Form for manual reassignment based on IA suggestion
  reassignForm = {
    idOrigen: '',
    idDestino: '',
    cantidad: 1
  };

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchMetrics();
  }

  fetchMetrics(): void {
    this.loading = true;
    this.http.get<any[]>('/api/v1/optimization/metrics').subscribe({
      next: (data) => {
        this.metrics = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  solicitarAnalisisIA(): void {
    this.analyzing = true;
    this.aiReport = '';
    this.http.post<any>('/api/v1/optimization/analyze', {}).subscribe({
      next: (res) => {
        this.aiReport = res.reporte;
        this.analyzing = false;
      },
      error: (err) => {
        this.aiReport = '⚠️ Error: No se pudo conectar con el Cerebro IA.';
        this.analyzing = false;
      }
    });
  }

  descargarReporte(): void {
    this.http.get('/api/v1/optimization/report/excel', { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporte_optimizacion.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.aiReport = '⚠️ Error: No posee permisos para descargar el reporte.';
      }
    });
  }

  descargarPDF(): void {
    if (!this.aiReport) return;
    this.http.post('/api/v1/optimization/report/pdf', { text: this.aiReport }, { responseType: 'blob' })
      .subscribe(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'informe_ia_consultoria.pdf';
        a.click();
      });
  }

  ejecutarOptimizacion(): void {
    if (!this.reassignForm.idOrigen || !this.reassignForm.idDestino) {
      this.aiReport = '⚠️ Error: Debe especificar origen y destino para la reasignación.';
      return;
    }

    this.applying = true;
    const url = `/api/v1/optimization/reassign?idOrigen=${this.reassignForm.idOrigen}&idDestino=${this.reassignForm.idDestino}&cantidad=${this.reassignForm.cantidad}`;

    this.http.post(url, {}).subscribe({
      next: (res: any) => {
        this.aiReport = '🚀 ¡Optimización ejecutada exitosamente! El personal ha sido reubicado.';
        this.applying = false;
        this.fetchMetrics();
      },
      error: (err) => {
        this.aiReport = '⚠️ Error: Hubo un conflicto al ejecutar reasignación. Verifique permisos.';
        this.applying = false;
      }
    });
  }
}
