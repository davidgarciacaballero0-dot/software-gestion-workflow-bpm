import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { TramiteService } from '../../../data/services/tramite.service';
import { OrganizacionService } from '../../../data/services/organizacion.service';
import { PoliticaWorkflow, PolicyStatus } from '../../../data/models/politica-workflow.model';
import { StartProcedureRequestDTO, TramiteResponseDTO } from '../../../data/models/tramite.model';
import { AuthService } from '../../../data/services/auth.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-politica-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './politica-list.component.html',
  styleUrls: ['./politica-list.component.css']
})
export class PoliticaListComponent implements OnInit {
  politicas: PoliticaWorkflow[] = [];
  organizacionesMap: Map<string, string> = new Map();
  loading = false;
  isClient = false;
  showConfirmDialog = false;
  pendingPolitica: PoliticaWorkflow | null = null;
  resultMessage: string | null = null;
  resultIsError = false;
  welcomeMessage = '';
  tramitesActivos: TramiteResponseDTO[] = [];

  constructor(
    private politicaService: PoliticaWorkflowService,
    private tramiteService: TramiteService,
    private orgService: OrganizacionService,
    private authService: AuthService,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.isClient = user?.nombreRol === 'CLIENTE';
    this.welcomeMessage = `¡Bienvenido, ${user?.nombre} ${user?.apellidos || ''}!`;
    this.cargarDatos();
    
    if (this.isClient && user?.id) {
      this.cargarTramitesActivos(user.id);
    }
  }

  cargarTramitesActivos(username: string): void {
    this.tramiteService.listarPorUsuario(username).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.tramitesActivos = (data || []).filter(t => t.estadoActual !== 'FINALIZADO');
          this.cd.detectChanges();
        });
      }
    });
  }

  cargarDatos(): void {
    this.loading = true;
    const user = this.authService.currentUser();
    const orgId = user?.idOrganizacion;

    // Fetch organizations to show names in global catalog
    const orgsObs = this.isClient ? this.orgService.listarTodas() : of([]);
    const policiesObs = this.isClient 
      ? this.politicaService.listarCatalogoPublico()
      : this.politicaService.listarPorOrganizacion(orgId!);

    forkJoin({
      orgs: orgsObs,
      policies: policiesObs
    }).subscribe({
      next: ({ orgs, policies }) => {
        this.zone.run(() => {
          orgs.forEach(o => {
            if (o.id) this.organizacionesMap.set(o.id, o.nombre);
          });
          this.politicas = policies || [];
          this.loading = false;
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error('Error sincronizando catálogo:', err);
          this.loading = false;
          this.cd.detectChanges();
        });
      }
    });
  }

  iniciarTramite(politica: PoliticaWorkflow): void {
    if (!politica.id || politica.status !== PolicyStatus.PUBLISHED) return;
    // Show confirm dialog instead of blocking confirm()
    this.pendingPolitica = politica;
    this.showConfirmDialog = true;
  }

  confirmarInicio(): void {
    if (!this.pendingPolitica) return;
    const user = this.authService.currentUser();
    if (!user) return;

    const token = this.authService.getToken();
    let userId = user.nombre;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId || user.nombre;
      } catch (e) {}
    }

    const request: StartProcedureRequestDTO = {
      idPolitica: this.pendingPolitica.id!,
      idUsuarioSolicitante: userId,
      datosIniciales: {
        timestamp_inicio: new Date().toISOString(),
        procedencia: 'Front-End BPM - ' + (this.isClient ? 'External Client' : 'Internal User')
      }
    };

    this.showConfirmDialog = false;
    this.tramiteService.iniciarTramite(request).subscribe({
      next: (res) => {
        this.resultMessage = `🚀 Instancia Creada exitosamente. Código: ${res.codigoTramite}. Puede seguir el estado en su Bandeja de Entrada.`;
        this.resultIsError = false;
        this.pendingPolitica = null;
      },
      error: (err) => {
        this.resultMessage = 'Error de Ejecución: ' + (err.error?.message || 'Falla en el motor de procesos');
        this.resultIsError = true;
        this.pendingPolitica = null;
      }
    });
  }

  cancelarInicio(): void {
    this.showConfirmDialog = false;
    this.pendingPolitica = null;
  }

  getNombreOrganizacion(idOrg: string): string {
    return this.organizacionesMap.get(idOrg) || 'Organización Autónoma';
  }

  getStatusBadgeClass(status: string): string {
    return status.toLowerCase();
  }
}
