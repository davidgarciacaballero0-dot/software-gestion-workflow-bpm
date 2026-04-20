import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TramiteService } from '../../../data/services/tramite.service';
import { AuthService } from '../../../data/services/auth.service';
import { DepartamentoService } from '../../../data/services/departamento.service';
import { PoliticaWorkflowService } from '../../../data/services/politica-workflow.service';
import { AnaliticaService, MetricData } from '../../../data/services/analitica.service';
import { Departamento } from '../../../data/models/departamento.model';
import { TramiteResponseDTO } from '../../../data/models/tramite.model';

@Component({
  selector: 'app-supervision',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervision.component.html',
  styleUrls: ['./supervision.component.css']
})
export class SupervisionComponent implements OnInit {
  tramites: TramiteResponseDTO[] = [];
  metricasDepartamentales: MetricData[] = [];
  loading = false;
  searchTerm = '';
  resultsSearch: TramiteResponseDTO[] = [];
  
  private deptId = '';
  private userId = '';
  private orgId = '';

  // Catálogos para el modal
  departamentos: Departamento[] = [];
  nodosPolitica: any[] = [];

  // Stats
  stats = {
    total: 0,
    enProgreso: 0,
    finalizados: 0
  };

  // Intervention Modal State
  showModal = false;
  selectedTramite: any = null;
  resultMessage: string | null = null;
  resultIsError = false;
  intervencion = {
    nuevoNodoId: '',
    nuevoDepartamentoId: '',
    motivo: '',
    usuarioInterventorId: ''
  };

  constructor(
    private tramiteService: TramiteService,
    private authService: AuthService,
    private deptService: DepartamentoService,
    private polService: PoliticaWorkflowService,
    private analiticaService: AnaliticaService,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    // Extract real IDs from JWT and session
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userId = payload.userId || '';
        this.orgId = payload.orgId || '';
      } catch (e) {}
    }
    const user = this.authService.currentUser();
    this.deptId = user?.idDepartamento || '';
    // Fallback: si el JWT no tenía orgId, usar el del login response
    if (!this.orgId) {
      this.orgId = user?.idOrganizacion || '';
    }
    this.intervencion.usuarioInterventorId = this.userId;

    this.cargarDatos();
    this.cargarCatalogos();
    this.cargarMetricas();
  }

  cargarMetricas(): void {
    this.analiticaService.getMetrics().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.metricasDepartamentales = data || [];
          this.cd.detectChanges();
        });
      }
    });
  }

  cargarCatalogos(): void {
    if (this.orgId) {
      this.deptService.listarPorOrganizacion(this.orgId).subscribe({
        next: (depts) => {
          this.departamentos = depts;
          this.cd.detectChanges();
        }
      });
    }
  }

  cargarDatos(): void {
    if (!this.deptId) {
       console.warn('Supervision: Sin contexto de departamento.');
       this.loading = false;
       this.tramites = [];
       this.calcularStats();
       this.cd.detectChanges();
       return;
    }

    this.loading = true;

    const safetyTimer = setTimeout(() => {
      this.zone.run(() => {
        if (this.loading) {
          this.loading = false;
          this.cd.detectChanges();
        }
      });
    }, 4000);

    this.tramiteService.listarSupervision(this.deptId).subscribe({
      next: (data) => {
        clearTimeout(safetyTimer);
        this.zone.run(() => {
          this.tramites = data || [];
          this.calcularStats();
          this.loading = false;
          this.cd.detectChanges();
        });
        // Refrescar métricas generales también
        this.cargarMetricas();
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

  buscarPorCI(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.cargarDatos();
      return;
    }

    this.loading = true;
    this.tramiteService.buscarPorCi(this.searchTerm).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.tramites = data || [];
          this.calcularStats();
          this.loading = false;
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error(err);
          this.loading = false;
          this.cd.detectChanges();
        });
      }
    });
  }

  calcularStats(): void {
    this.stats.total = this.tramites.length;
    this.stats.enProgreso = this.tramites.filter(t => t.estadoActual === 'EN_PROGRESO').length;
    this.stats.finalizados = this.tramites.filter(t => t.estadoActual === 'FINALIZADO').length;
  }

  abrirIntervencion(tramite: TramiteResponseDTO): void {
    this.selectedTramite = tramite;
    this.intervencion.nuevoNodoId = tramite.nodoActualId;
    this.intervencion.nuevoDepartamentoId = tramite.departamentoActualId;
    this.intervencion.motivo = '';
    
    // Cargar nodos de la política específica
    this.nodosPolitica = [];
    if (tramite.idPolitica) {
      this.polService.obtenerPorId(tramite.idPolitica).subscribe({
        next: (pol) => {
          this.nodosPolitica = pol.nodes || [];
          this.cd.detectChanges();
        }
      });
    }

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
        this.zone.run(() => {
          this.resultMessage = '🛠️ Intervención ejecutada con éxito. El trámite ha sido reasignado.';
          this.resultIsError = false;
          this.showModal = false;
          this.cargarDatos();
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.resultMessage = 'Error: ' + (err.error?.message || 'No se pudo realizar la intervención');
          this.resultIsError = true;
          this.cd.detectChanges();
        });
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }
}
