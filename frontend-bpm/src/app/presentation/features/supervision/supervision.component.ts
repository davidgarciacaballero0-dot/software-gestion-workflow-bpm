import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TramiteService } from '../../../data/services/tramite.service';

@Component({
  selector: 'app-supervision',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervision.component.html',
  styleUrls: ['./supervision.component.css']
})
export class SupervisionComponent implements OnInit {
  tramites: any[] = [];
  loading = false;
  
  // Mock Dept ID for the Boss
  mockDeptId = 'dept_riesgos_01';

  // Stats
  stats = {
    total: 0,
    enProgreso: 0,
    finalizados: 0
  };

  // Intervention Modal State
  showModal = false;
  selectedTramite: any = null;
  intervencion = {
    nuevoNodoId: '',
    nuevoDepartamentoId: '',
    motivo: '',
    usuarioInterventorId: 'JEFE_MOCK_01'
  };

  constructor(private tramiteService: TramiteService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.tramiteService.listarSupervision(this.mockDeptId).subscribe({
      next: (data) => {
        this.tramites = data;
        this.calcularStats();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  calcularStats(): void {
    this.stats.total = this.tramites.length;
    this.stats.enProgreso = this.tramites.filter(t => t.estadoActual === 'EN_PROGRESO').length;
    this.stats.finalizados = this.tramites.filter(t => t.estadoActual === 'FINALIZADO').length;
  }

  abrirIntervencion(tramite: any): void {
    this.selectedTramite = tramite;
    this.intervencion.nuevoNodoId = tramite.nodoActualId;
    this.intervencion.nuevoDepartamentoId = tramite.departamentoActualId;
    this.intervencion.motivo = '';
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.selectedTramite = null;
  }

  ejecutarIntervencion(): void {
    const request = {
      idTramite: this.selectedTramite.id,
      ...this.intervencion
    };

    this.tramiteService.intervenirTramite(request).subscribe({
      next: () => {
        alert('🛠️ Intervención ejecutada con éxito. El trámite ha sido reasignado.');
        this.showModal = false;
        this.cargarDatos();
      },
      error: (err) => {
        alert('Error: ' + (err.error?.message || 'No se pudo realizar la intervención'));
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }
}
