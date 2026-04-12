import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TramiteService } from '../../../data/services/tramite.service';

@Component({
  selector: 'app-tramite-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tramite-historial.component.html',
  styleUrls: ['./tramite-historial.component.css']
})
export class TramiteHistorialComponent implements OnInit {
  tramite: any = null;
  eventos: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tramiteService: TramiteService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarDatos(id);
    }
  }

  cargarDatos(id: string): void {
    this.loading = true;
    this.tramiteService.obtenerTramite(id).subscribe({
      next: (tramite) => {
        this.tramite = tramite;
        this.cargarHistorial(id);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  cargarHistorial(id: string): void {
    this.tramiteService.obtenerHistorial(id).subscribe({
      next: (data) => {
        this.eventos = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  getEventIcon(tipo: string): string {
    switch (tipo) {
      case 'CREACION': return '🌟';
      case 'AVANCE': return '➡️';
      case 'INTERVENCION': return '🛠️';
      case 'FINALIZACION': return '🏁';
      case 'RECHAZO': return '🛑';
      default: return '📍';
    }
  }

  getEventColor(tipo: string): string {
    switch (tipo) {
      case 'CREACION': return '#3b82f6'; // Azul
      case 'AVANCE': return '#10b981'; // Esmeralda
      case 'INTERVENCION': return '#f59e0b'; // Ámbar
      case 'FINALIZACION': return '#8b5cf6'; // Violeta
      case 'RECHAZO': return '#ef4444'; // Rojo
      default: return '#64748b';
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  volver(): void {
    this.router.navigate(['/inbox']);
  }
}
