import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../data/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <!-- Sidebar de Navegación -->
      <aside class="sidebar-container glass">
        <div class="sidebar-header">
          <div class="logo-box">BPM</div>
          <div class="brand-text">
            <h2>Workflow</h2>
            <span>Enterprise Edition</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/app/catalog" routerLinkActive="active" class="nav-item">
            <span class="icon">🚀</span>
            <span>Catálogo de Trámites</span>
          </a>
          <a routerLink="/app/inbox" routerLinkActive="active" class="nav-item">
            <span class="icon">📥</span>
            <span>Bandeja de Entrada</span>
          </a>
          <a routerLink="/app/designer" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()">
            <span class="icon">🎨</span>
            <span>Diseñador BPM</span>
          </a>
          <a routerLink="/app/supervision" routerLinkActive="active" class="nav-item" *ngIf="isJefe()">
            <span class="icon">📊</span>
            <span>Métricas de Supervisión</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-profile-pill glass" *ngIf="authService.currentUser() as user">
            <div class="avatar-gradient">
              {{ user.nombre.charAt(0).toUpperCase() }}
            </div>
            <div class="user-details">
              <span class="name">{{ user.nombre }}</span>
              <span class="role">{{ user.idRol }}</span>
            </div>
          </div>
          
          <button class="logout-action" (click)="authService.logout()">
            <span class="icon">🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <!-- Main Workspace -->
      <main class="workspace-viewport">
        <header class="workspace-header glass">
          <div class="header-left">
            <span class="breadcrumb">Sistema</span>
            <span class="separator">/</span>
            <span class="current-page">Workspace</span>
          </div>
          <div class="header-right">
             <div class="alert-indicator">🔔</div>
          </div>
        </header>
        
        <section class="content-container animate-fade-in">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      background: var(--bg-dark);
      overflow: hidden;
    }

    /* Sidebar Refined Styles */
    .sidebar-container {
      width: 280px;
      height: 100%;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      z-index: 50;
      transition: width 0.3s ease;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2.5rem;
      padding-left: 0.5rem;
    }

    .logo-box {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--primary), #a855f7);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: white;
      box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
      font-size: 0.9rem;
    }

    .brand-text h2 { font-size: 1.1rem; font-weight: 700; margin: 0; color: #fff; }
    .brand-text span { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.8rem 1rem;
      border-radius: 10px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .nav-item:hover {
      background: hsla(0, 0%, 100%, 0.05);
      color: #fff;
      transform: translateX(4px);
    }

    .nav-item.active {
      background: hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.15);
      color: var(--primary);
      box-shadow: inset 0 0 0 1px hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.2);
    }

    /* Main Content Styles */
    .workspace-viewport {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .workspace-header {
      height: 64px;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
    }

    .header-left { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
    .breadcrumb { color: var(--text-muted); }
    .separator { color: var(--border); }
    .current-page { color: #fff; font-weight: 600; }

    .content-container {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
      background: radial-gradient(circle at top right, hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.03), transparent 40%);
    }

    /* User Profile Footer */
    .sidebar-footer {
      margin-top: auto;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .user-profile-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 12px;
    }

    .avatar-gradient {
      width: 38px;
      height: 38px;
      background: linear-gradient(45deg, var(--primary), var(--accent));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
    }

    .user-details { display: flex; flex-direction: column; line-height: 1.2; }
    .user-details .name { font-size: 0.85rem; font-weight: 600; color: #fff; }
    .user-details .role { font-size: 0.7rem; color: var(--text-muted); }

    .logout-action {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: transparent;
      border: 1px solid hsla(0, 72%, 51%, 0.2);
      border-radius: 10px;
      color: #f87171;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .logout-action:hover {
      background: hsla(0, 72%, 51%, 0.1);
      border-color: #f87171;
    }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthService);

  isAdmin() {
    return this.authService.currentUser()?.idRol === 'ADMIN_SISTEMA';
  }

  isJefe() {
    return this.authService.currentUser()?.esJefe === true;
  }
}
