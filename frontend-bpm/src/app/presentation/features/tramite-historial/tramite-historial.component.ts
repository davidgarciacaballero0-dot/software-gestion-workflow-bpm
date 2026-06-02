import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TramiteService } from '../../../data/services/tramite.service';
import { HttpClient } from '@angular/common/http';

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
  archivos: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tramiteService: TramiteService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarDatos(id);
    }
  }

  cargarDatos(id: string): void {
    this.loading = true;

    // Safety timeout to prevent infinite spinner
    const safetyTimer = setTimeout(() => {
      this.zone.run(() => {
        if (this.loading) {
          this.loading = false;
          this.cd.detectChanges();
        }
      });
    }, 6000);

    this.tramiteService.obtenerTramite(id).subscribe({
      next: (tramite) => {
        this.zone.run(() => {
          this.tramite = tramite;
          this.cargarArchivos(id);
          this.cargarHistorial(id, safetyTimer);
        });
      },
      error: (err) => {
        clearTimeout(safetyTimer);
        this.zone.run(() => {
          console.error(err);
          this.loading = false;
          this.cd.detectChanges();
        });
      }
    });
  }

  cargarArchivos(id: string): void {
    this.http.get<any[]>(`/api/v1/archivos/tramite/${id}`).subscribe({
      next: (archivos) => {
        this.zone.run(() => {
          this.archivos = archivos || [];
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error al cargar archivos adjuntos del trámite:', err);
      }
    });
  }

  cargarHistorial(id: string, safetyTimer?: any): void {
    this.tramiteService.obtenerHistorial(id).subscribe({
      next: (data) => {
        if (safetyTimer) clearTimeout(safetyTimer);
        this.zone.run(() => {
          this.eventos = (data || []).sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          this.loading = false;
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        if (safetyTimer) clearTimeout(safetyTimer);
        this.zone.run(() => {
          console.error(err);
          this.loading = false;
          this.cd.detectChanges();
        });
      }
    });
  }

  isImage(contentType: string): boolean {
    return !!contentType && contentType.startsWith('image/');
  }

  getDownloadUrl(id: string): string {
    return `/api/v1/archivos/download/${id}`;
  }

  descargarArchivo(id: string): void {
    window.open(this.getDownloadUrl(id), '_blank');
  }

  getEventIcon(tipo: string): string {
    switch (tipo) {
      case 'CREACION': return 'star';
      case 'AVANCE': return 'arrow_forward';
      case 'INTERVENCION': return 'build';
      case 'FINALIZACION': return 'flag';
      case 'RECHAZO': return 'block';
      default: return 'location_on';
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
    this.router.navigate(['/app/inbox']);
  }
}
