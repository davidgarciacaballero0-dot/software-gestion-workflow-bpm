import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { TramiteService } from '../../../data/services/tramite.service';
import { OrganizacionService } from '../../../data/services/organizacion.service';
import { PoliticaWorkflow, PolicyStatus } from '../../../data/models/politica-workflow.model';
import { StartProcedureRequestDTO } from '../../../data/models/tramite.model';
import { AuthService } from '../../../data/services/auth.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-politica-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './politica-list.component.html',
  styleUrls: ['./politica-list.component.css']
})
export class PoliticaListComponent implements OnInit {
  politicas: PoliticaWorkflow[] = [];
  organizacionesMap: Map<string, string> = new Map();
  loading = false;
  isClient = false;

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
    this.isClient = !user?.idOrganizacion;
    this.cargarDatos();
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
      idPolitica: politica.id,
      idUsuarioSolicitante: userId,
      datosIniciales: {
        timestamp_inicio: new Date().toISOString(),
        procedencia: 'Front-End BPM - ' + (this.isClient ? 'External Client' : 'Internal User')
      }
    };

    if (confirm(`¿Confirma la ejecución inmediata del flujo "${politica.nombre}"?`)) {
      this.tramiteService.iniciarTramite(request).subscribe({
        next: (res) => {
          alert(`🚀 Instancia Creada exitosamente.\nCódigo: ${res.codigoTramite}\nPuede seguir el estado en su Bandeja de Entrada.`);
        },
        error: (err) => {
          alert('Error de Ejecución: ' + (err.error?.message || 'Falla en el motor de procesos'));
        }
      });
    }
  }

  getNombreOrganizacion(idOrg: string): string {
    return this.organizacionesMap.get(idOrg) || 'Organización Autónoma';
  }

  getStatusBadgeClass(status: string): string {
    return status.toLowerCase();
  }
}
