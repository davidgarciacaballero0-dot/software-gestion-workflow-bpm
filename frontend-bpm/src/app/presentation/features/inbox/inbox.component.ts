import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TramiteService } from '../../../data/services/tramite.service';
import { NotificationService } from '../../../data/services/notification.service';
import { AuthService } from '../../../data/services/auth.service';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.css']
})
export class InboxComponent implements OnInit {
  activeTab: 'personal' | 'department' = 'personal';
  tramites: any[] = [];
  tramitesActivos: any[] = [];
  tramitesFinalizados: any[] = [];
  loading = false;
  isClient = false;
  hasDept = false;

  private userId = '';
  private deptId = '';

  constructor(
    private tramiteService: TramiteService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.isClient = user?.nombreRol === 'CLIENTE';
    this.hasDept = !!user?.idDepartamento;
    this.deptId = user?.idDepartamento || '';
    
    // Extract real ID from JWT token
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userId = payload.userId || '';
      } catch (e) { }
    }

    this.switchTab('personal');

    // Escuchar notificaciones para refrescar la bandeja en tiempo real
    this.notificationService.getNotifications().subscribe(() => {
      this.loadInbox();
    });
  }

  switchTab(tab: 'personal' | 'department'): void {
    this.activeTab = tab;
    this.loadInbox();
  }

  loadInbox(): void {
    if (this.activeTab === 'department' && !this.deptId) {
       console.warn('Inbox: El usuario no tiene departamento asignado. No se pueden cargar trámites departamentales.');
       this.loading = false;
       this.tramites = [];
       return;
    }

    this.loading = true;
    this.tramites = [];

    const safetyTimer = setTimeout(() => {
      this.zone.run(() => {
        if (this.loading) {
          this.loading = false;
          this.cd.detectChanges();
        }
      });
    }, 4000);

    const obs = this.activeTab === 'personal'
      ? this.tramiteService.listarPorUsuario(this.userId)
      : this.tramiteService.listarPorDepartamento(this.deptId);

    obs.subscribe({
      next: (data) => {
        clearTimeout(safetyTimer);
        this.zone.run(() => {
          this.tramites = (data || []).sort((a: any, b: any) => (b.prioridad || 0) - (a.prioridad || 0));
          this.tramitesActivos = this.tramites.filter(t => t.estadoActual !== 'FINALIZADO' && t.estadoActual !== 'RECHAZADO');
          this.tramitesFinalizados = this.tramites.filter(t => t.estadoActual === 'FINALIZADO' || t.estadoActual === 'RECHAZADO');
          this.loading = false;
          this.cd.detectChanges();
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

  atenderTramite(tramiteId: string): void {
    this.router.navigate(['/app/tramite/atencion', tramiteId]);
  }

  verHistorial(tramiteId: string): void {
    this.router.navigate(['/app/tramite/historial', tramiteId]);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
