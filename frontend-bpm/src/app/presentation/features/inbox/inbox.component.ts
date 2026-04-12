import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TramiteService } from '../../../data/services/tramite.service';
import { NotificationService } from '../../../data/services/notification.service';

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
  loading = false;

  // Mock IDs (In production these come from a Session/Auth service)
  mockUserId = 'USER_MOCK_01';
  mockDeptId = 'dept_riesgos_01';

  constructor(
    private tramiteService: TramiteService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
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
    this.loading = true;
    this.tramites = [];
    
    const obs = this.activeTab === 'personal' 
      ? this.tramiteService.listarPorUsuario(this.mockUserId)
      : this.tramiteService.listarPorDepartamento(this.mockDeptId);

    obs.subscribe({
      next: (data) => {
        this.tramites = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  atenderTramite(tramiteId: string): void {
    this.router.navigate(['/tramite/atencion', tramiteId]);
  }

  verHistorial(tramiteId: string): void {
    this.router.navigate(['/tramite/historial', tramiteId]);
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
