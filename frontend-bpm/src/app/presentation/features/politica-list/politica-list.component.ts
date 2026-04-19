import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.cargarPoliticas();
  }

  cargarPoliticas(): void {
    const user = this.authService.currentUser();
    const orgId = user?.idOrganizacion;

    if (!orgId) {
      console.warn('No Organization context found in session.');
      this.loading = false;
      this.politicas = [];
      return;
    }

    this.loading = true;
    console.log('Loading policies for org:', orgId);
    
    // Safety timeout to prevent infinite skeletons if the proxy hangs
    const safetyTimer = setTimeout(() => {
      this.zone.run(() => {
        if (this.loading) {
          console.warn('Backend request timed out (Safety Triggered)');
          this.loading = false;
          this.cd.detectChanges();
        }
      });
    }, 4000);

    this.politicaService.listarPorOrganizacion(orgId).subscribe({
      next: (data) => {
        clearTimeout(safetyTimer);
        this.zone.run(() => {
          this.politicas = data || [];
          this.loading = false;
          this.cd.detectChanges();
          console.log('Policies synchronized:', this.politicas.length);
        });
      },
      error: (err) => {
        clearTimeout(safetyTimer);
        this.zone.run(() => {
          console.error('API Error:', err);
          this.loading = false;
          this.cd.detectChanges();
        });
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
