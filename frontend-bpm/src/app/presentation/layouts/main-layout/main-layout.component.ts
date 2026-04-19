import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../data/services/auth.service';
import { VoiceAssistantComponent } from '../../shared/voice-assistant/voice-assistant.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, VoiceAssistantComponent],
  template: `
    <div class="app-layout">
      <!-- Asistente de Voz Global -->
      <app-voice-assistant></app-voice-assistant>
      <!-- Sidebar de Navegación -->
      <aside class="sidebar-container glass-premium">
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

          <!-- Módulos de Gestión Administrativa (CU-1.2) -->
          <div class="nav-divider" *ngIf="isAdmin()">
             <span>Gestión</span>
          </div>
          <a routerLink="/app/organizations" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()">
            <span class="icon">🏢</span>
            <span>Organizaciones</span>
          </a>
          <a routerLink="/app/departments" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()">
            <span class="icon">🏘️</span>
            <span>Departamentos</span>
          </a>
          <a routerLink="/app/users" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()">
            <span class="icon">👥</span>
            <span>Usuarios</span>
          </a>
          <a routerLink="/app/roles" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()">
            <span class="icon">🔐</span>
            <span>Roles</span>
          </a>
          <a routerLink="/app/audit" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()">
            <span class="icon">📋</span>
            <span>Auditoría</span>
          </a>
          <a routerLink="/app/insights" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()">
            <span class="icon">🤖</span>
            <span>Reportes y Analítica IA</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-profile-pill monolith-surface" *ngIf="authService.currentUser() as user">
            <div class="avatar-gradient">
              {{ user.nombre.charAt(0).toUpperCase() }}
            </div>
            <div class="user-details">
              <span class="name">{{ user.nombre }}</span>
              <span class="role">{{ user.nombreRol }}</span>
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
        <header class="workspace-header glass-premium shadow-ambient">
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
      background: var(--surface);
      overflow: hidden;
      font-family: 'Inter', sans-serif;
    }

    /* Sidebar Refined Styles - Orchestrated Monolith */
    .sidebar-container {
      width: 280px;
      height: 100%;
      background: var(--surface-container-low);
      /* "No-Line" rule: Removed border-right */
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      z-index: 50;
      transition: width 0.3s ease;
      box-shadow: 1px 0 10px rgba(7, 2, 53, 0.03); /* Subtle lift */
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
      background: linear-gradient(135deg, var(--primary), var(--primary-container));
      border-radius: 0.5rem; /* rounded-lg */
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      box-shadow: var(--shadow-ambient);
      font-size: 0.9rem;
    }

    .brand-text h2 { font-size: 1.1rem; font-weight: 600; margin: 0; color: var(--primary); }
    .brand-text span { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.7rem 1rem;
      border-radius: 0.5rem; /* rounded-lg */
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.85rem; /* body-md */
      font-weight: 500;
      transition: all 0.2s;
    }

    .nav-item:hover {
      background: var(--surface-bright);
      color: var(--primary-container);
      transform: translateX(4px);
    }

    .nav-item.active {
      background: var(--surface-container-lowest);
      color: var(--primary);
      box-shadow: var(--shadow-ambient);
    }

    .nav-divider {
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      padding: 0 1rem;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.7;
    }

    /* Main Content Styles */
    .workspace-viewport {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      background: var(--surface);
    }

    .workspace-header {
      height: 64px;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      /* "No-Line" rule: Removed border-bottom, relying on glass and shadow-ambient */
      z-index: 40;
    }

    .header-left { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
    .breadcrumb { color: var(--text-muted); font-weight: 500; }
    .separator { color: var(--outline-variant); }
    .current-page { color: var(--primary); font-weight: 600; }

    .content-container {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
      background: radial-gradient(circle at top right, hsla(239, 84%, 95%, 0.5), transparent 40%);
    }

    /* User Profile Footer */
    .sidebar-footer {
      margin-top: auto;
      padding-top: 1.5rem;
      /* "No-Line" rule: Ghost border instead of solid */
      border-top: 1px solid rgba(200, 197, 208, 0.3); /* outline-variant */
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .user-profile-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      /* Using global monolith-surface class logic */
      box-shadow: 0 2px 8px rgba(7, 2, 53, 0.04);
    }

    .avatar-gradient {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, var(--primary), var(--primary-container));
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #fff;
    }

    .user-details { display: flex; flex-direction: column; line-height: 1.2; }
    .user-details .name { font-size: 0.85rem; font-weight: 600; color: var(--primary); }
    .user-details .role { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;}

    .logout-action {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: transparent;
      border: 1px solid rgba(186, 26, 26, 0.2); /* error color tinted */
      border-radius: 0.5rem;
      color: #ba1a1a;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .logout-action:hover {
      background: hsla(0, 100%, 96%, 1); /* error_container approx */
    }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthService);

  isAdmin() {
    return this.authService.currentUser()?.nombreRol === 'ADMIN';
  }

  isJefe() {
    return this.authService.currentUser()?.esJefe === true;
  }
}
