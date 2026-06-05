import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-reportes-nlp',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './reportes-nlp.component.html',
  styleUrls: ['./reportes-nlp.component.css']
})
export class ReportesNlpComponent implements OnInit {
  prompt: string = '';
  loading: boolean = false;
  resultado: any[] | null = null;
  error: string | null = null;
  isRecording: boolean = false;
  private recognition: any;

  public chartData: ChartConfiguration<'bar'>['data'] | null = null;
  public chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      const { webkitSpeechRecognition }: any = window;
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'es-ES';

      this.recognition.onstart = () => {
        this.isRecording = true;
        this.cd.detectChanges();
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.prompt += (this.prompt ? ' ' : '') + transcript;
        this.cd.detectChanges();
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.isRecording = false;
        this.cd.detectChanges();
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        this.cd.detectChanges();
      };
    } else {
      console.warn('Speech recognition no es soportado en este navegador.');
    }
  }

  toggleRecording() {
    if (!this.recognition) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }
    if (this.isRecording) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

  generarReporte() {
    if (!this.prompt || this.prompt.trim() === '') return;
    
    this.loading = true;
    this.error = null;
    this.resultado = null;
    this.chartData = null;
    
    this.http.post<any[]>('/api/v1/reportes/nlp', { prompt: this.prompt }).subscribe({
      next: (res) => {
        this.resultado = res;
        this.loading = false;
        if (res && res.length > 0) {
          this.buildChart(res);
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        this.error = 'No se pudo generar el reporte: ' + (err.error?.message || 'Error del servidor');
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  buildChart(data: any[]) {
    // Expected { _id: "estado/departamento", total: count }
    const labels = data.map(item => item._id || 'Desconocido');
    const values = data.map(item => item.total || 0);

    this.chartData = {
      labels: labels,
      datasets: [
        {
          data: values,
          label: 'Total',
          backgroundColor: '#38bdf8',
          borderColor: '#0ea5e9',
          borderWidth: 1
        }
      ]
    };
  }
}
