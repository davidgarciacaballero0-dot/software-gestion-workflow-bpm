import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { TramiteService } from '../../../data/services/tramite.service';
import { PoliticaWorkflow, PolicyStatus } from '../../../data/models/politica-workflow.model';
import { StartProcedureRequestDTO } from '../../../data/models/tramite.model';
import { AuthService } from '../../../data/services/auth.service';

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
    private tramiteService: TramiteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarPoliticas();
  }

  cargarPoliticas(): void {
    this.loading = true;
    const user = this.authService.currentUser();
    const orgId = user?.idOrganizacion || '69e3ae7d116741365db8477c';
    console.log('Loading politicas for org:', orgId, user);
    
    // Safety timeout in case proxy hangs
    const safetyTimer = setTimeout(() => {
      console.warn('Safety timeout reached');
      if (this.loading) {
         this.loading = false;
      }
    }, 5000);

    this.politicaService.listarPorOrganizacion(orgId).subscribe({
      next: (data) => {
        clearTimeout(safetyTimer);
        this.politicas = data;
        this.loading = false;
        console.log('Politicas loaded:', data);
      },
      error: (err) => {
        clearTimeout(safetyTimer);
        console.error('Error loading politicas:', err);
        this.loading = false;
      }
    });
  }

  iniciarTramite(politica: PoliticaWorkflow): void {
    if (!politica.id || politica.status !== PolicyStatus.PUBLISHED) return;

    const user = this.authService.currentUser();
    if (!user) return;

    // Extract userId from JWT token
    const token = this.authService.getToken();
    let userId = user.nombre;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId || user.nombre;
      } catch (e) {}
    }

    const request: StartProcedureRequestDTO = {
      idPolitica: politica.id,
      idUsuarioSolicitante: userId,
      datosIniciales: {
        timestamp_inicio: new Date().toISOString(),
        procedencia: 'Front-End BPM'
      }
    };

    if (confirm(`¿Confirma la ejecución inmediata del flujo "${politica.nombre}"?`)) {
      this.tramiteService.iniciarTramite(request).subscribe({
        next: (res) => {
          alert(`🚀 Instancia Creada: ${res.codigoTramite}`);
        },
        error: (err) => {
          alert('Error de Ejecución: ' + (err.error?.message || 'Falla en el motor de procesos'));
        }
      });
    }
  }

  getStatusBadgeClass(status: string): string {
    return status.toLowerCase();
  }
}
