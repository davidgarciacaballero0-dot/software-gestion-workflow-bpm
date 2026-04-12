import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { TramiteService } from '../../../data/services/tramite.service';
import { PoliticaWorkflow, PolicyStatus } from '../../../data/models/politica-workflow.model';
import { StartProcedureRequestDTO } from '../../../data/models/tramite.model';

@Component({
  selector: 'app-politica-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './politica-list.component.html',
  styleUrls: ['./politica-list.component.css']
})
export class PoliticaListComponent implements OnInit {
  politicas: PoliticaWorkflow[] = [];
  loading = false;

  constructor(
    private politicaService: PoliticaWorkflowService,
    private tramiteService: TramiteService
  ) {}

  ngOnInit(): void {
    this.cargarPoliticas();
  }

  cargarPoliticas(): void {
    this.loading = true;
    this.politicaService.listarPorOrganizacion('MOCK_ORG_ID').subscribe({
      next: (data) => {
        this.politicas = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  iniciarTramite(politica: PoliticaWorkflow): void {
    if (!politica.id || politica.status !== PolicyStatus.PUBLISHED) return;

    const request: StartProcedureRequestDTO = {
      idPolitica: politica.id,
      idUsuarioSolicitante: 'USER_MOCK_01', // En producción vendría de AuthService
      datosIniciales: {
        timestamp_inicio: new Date().toISOString()
      }
    };

    if (confirm(`¿Desea iniciar un nuevo trámite de "${politica.nombre}"?`)) {
      this.tramiteService.iniciarTramite(request).subscribe({
        next: (res) => {
          alert(`🚀 Trámite iniciado con éxito.\nCódigo: ${res.codigoTramite}`);
        },
        error: (err) => {
          alert('Error al iniciar trámite: ' + (err.error?.message || 'Error desconocido'));
        }
      });
    }
  }

  getStatusBadgeClass(status: string): string {
    return status.toLowerCase();
  }
}
