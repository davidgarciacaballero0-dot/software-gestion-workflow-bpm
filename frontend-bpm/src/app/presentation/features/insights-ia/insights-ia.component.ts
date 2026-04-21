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
    idDestino: ''
  };

  usuariosOrigen: any[] = [];
  selectedUserIds: string[] = [];

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

  onOrigenChange(): void {
    this.selectedUserIds = [];
    this.usuariosOrigen = [];
    if (!this.reassignForm.idOrigen) return;

    this.http.get<any[]>('/api/v1/usuarios/departamento/' + this.reassignForm.idOrigen).subscribe({
      next: (users) => {
        this.usuariosOrigen = users;
      },
      error: (err) => {
        console.error('Error fetching users:', err);
      }
    });
  }

  toggleUserSelection(userId: string, event: any): void {
    if (event.target.checked) {
      this.selectedUserIds.push(userId);
    } else {
      this.selectedUserIds = this.selectedUserIds.filter(id => id !== userId);
    }
  }

  ejecutarOptimizacion(): void {
    if (!this.reassignForm.idOrigen || !this.reassignForm.idDestino || this.selectedUserIds.length === 0) {
      this.aiReport = '⚠️ Error: Debe especificar origen, destino y seleccionar al menos un funcionario.';
      return;
    }

    this.applying = true;
    const body = {
      idOrigen: this.reassignForm.idOrigen,
      idDestino: this.reassignForm.idDestino,
      userIds: this.selectedUserIds
    };

    this.http.post('/api/v1/optimization/reassign', body).subscribe({
      next: (res: any) => {
        this.aiReport = '🚀 ¡Optimización ejecutada exitosamente! El personal ha sido reubicado y el sistema estabilizado en BD.';
        this.applying = false;
        this.reassignForm.idOrigen = '';
        this.reassignForm.idDestino = '';
        this.usuariosOrigen = [];
        this.selectedUserIds = [];
        this.fetchMetrics();
      },
      error: (err) => {
        this.aiReport = '⚠️ Error: Hubo un conflicto al ejecutar reasignación. Verifique permisos.';
        this.applying = false;
      }
    });
  }
}
