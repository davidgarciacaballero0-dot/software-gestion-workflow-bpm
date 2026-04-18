import { Component, OnInit } from '@angular/core';
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
  loading = false;

  private userId = '';
  private deptId = '';

  constructor(
    private tramiteService: TramiteService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Extract real IDs from JWT token
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userId = payload.userId || '';
      } catch (e) {}
    }

    // Get departmentId from stored user data (if the user has one)
    const user = this.authService.currentUser();
    this.deptId = user?.idDepartamento || '';

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
      ? this.tramiteService.listarPorUsuario(this.userId)
      : this.tramiteService.listarPorDepartamento(this.deptId);

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
