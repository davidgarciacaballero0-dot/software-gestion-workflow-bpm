import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../data/services/auth.service';
import { ChatbotWidgetComponent } from '../../shared/voice-assistant/chatbot-widget.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ChatbotWidgetComponent],
  template: `
    <div class="app-layout">
      <!-- Modal de Perfil (Fase 4 - Glassmorphism) -->
      <div class="profile-modal-overlay" *ngIf="showProfile()" (click)="toggleProfile()">
        <div class="profile-card-glass animate-pop" (click)="$event.stopPropagation()">
           <div class="profile-header">
             <div class="header-avatar">{{ authService.currentUser()?.nombre?.charAt(0) }}</div>
             <div class="header-text">
               <h3>{{ authService.currentUser()?.nombre }} {{ authService.currentUser()?.apellidos }}</h3>
               <span class="role-badge">{{ authService.currentUser()?.nombreRol }}</span>
             </div>
             <button class="close-btn" (click)="toggleProfile()">✕</button>
           </div>

           <div class="profile-body">
             <!-- Información Personal (Todos) -->
             <div class="profile-section">
               <h4 class="section-title">Información Personal</h4>
               <div class="info-grid">
                 <div class="info-item">
                   <span class="label">Carnet de Identidad (CI)</span>
                   <span class="value">{{ authService.currentUser()?.ci || 'Sin registrar' }}</span>
                 </div>
                 <div class="info-item">
                   <span class="label">Teléfono / Celular</span>
                   <span class="value">{{ authService.currentUser()?.celular || 'Sin registrar' }}</span>
                 </div>
                 <div class="info-item">
                   <span class="label">Correo Electrónico</span>
                   <span class="value">{{ authService.currentUser()?.email }}</span>
                 </div>
                 <div class="info-item">
                   <span class="label">Fecha de Nacimiento</span>
                   <span class="value">{{ formatDate(authService.currentUser()?.fechaNacimiento) }}</span>
                 </div>
               </div>
             </div>

             <!-- Información Organizacional (Funcionarios) -->
             <div class="profile-section" *ngIf="!isClient()">
               <h4 class="section-title">Detalles de Operación</h4>
               <div class="info-grid">
                 <div class="info-item">
                   <span class="label">Organización</span>
                   <span class="value">🏢 Entidad BPM Latam</span>
                 </div>
                 <div class="info-item">
                   <span class="label">Departamento</span>
                   <span class="value">📍 {{ authService.currentUser()?.idDepartamento || 'Asignación Global' }}</span>
                 </div>
               </div>
             </div>

             <div class="profile-footer">
               <span class="reg-date">Miembro desde: {{ formatDate(authService.currentUser()?.createdAt) }}</span>
             </div>
           </div>
        </div>
      </div>

      <!-- Chatbot Inteligente Global -->
      <app-chatbot-widget></app-chatbot-widget>
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
          <a routerLink="/app/catalog" routerLinkActive="active" class="nav-item" *ngIf="!isClient()">
            <span class="icon">🚀</span>
            <span>Catálogo de Trámites</span>
          </a>
          <a routerLink="/app/inbox" routerLinkActive="active" class="nav-item">
            <span class="icon">📥</span>
            <span>{{ isClient() ? 'Mis Trámites' : 'Bandeja de Entrada' }}</span>
          </a>
          <a routerLink="/app/designer" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()">
            <span class="icon">🎨</span>
            <span>Diseñador BPM</span>
          </a>
          <a routerLink="/app/supervision" routerLinkActive="active" class="nav-item" *ngIf="isAdmin() || isJefe()">
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
          <div class="user-profile-pill monolith-surface clickable-profile" 
               *ngIf="authService.currentUser() as user"
               (click)="toggleProfile()">
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

    /* GLASS PROFILE MODAL STYLES (FASE 4) */
    .profile-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .profile-card-glass {
      width: 100%;
      max-width: 500px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 2rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      color: #1a1c1e;
    }

    .profile-header {
      padding: 2.5rem 2rem 1.5rem 2rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      position: relative;
      background: linear-gradient(135deg, rgba(77, 64, 255, 0.1), transparent);
    }

    .header-avatar {
      width: 70px;
      height: 70px;
      background: var(--primary);
      color: white;
      border-radius: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
    }

    .header-text h3 { margin: 0; font-size: 1.5rem; color: var(--primary); letter-spacing: -0.02em; }
    .role-badge { 
      font-size: 0.75rem; 
      font-weight: 700; 
      text-transform: uppercase; 
      color: var(--text-muted); 
      background: rgba(0,0,0,0.05); 
      padding: 0.2rem 0.6rem; 
      border-radius: 0.5rem; 
    }

    .close-btn { position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.5; }

    .profile-body { padding: 0 2rem 2.5rem 2rem; }
    .section-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary); opacity: 0.8; margin: 1.5rem 0 1rem 0; font-weight: 700; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .info-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .info-item .label { font-size: 0.7rem; color: var(--text-muted); font-weight: 500; }
    .info-item .value { font-size: 0.9rem; font-weight: 600; color: #1a1c1e; }

    .profile-footer { margin-top: 2rem; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 1rem; text-align: center; }
    .reg-date { font-size: 0.7rem; color: var(--text-muted); font-style: italic; }

    .clickable-profile { cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
    .clickable-profile:hover { border-color: var(--primary); background: var(--surface-container-low); }

    .animate-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes pop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  showProfile = signal(false);

  toggleProfile() {
    this.showProfile.update((v: boolean) => !v);
  }

  formatDate(dateStr?: string) {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  isAdmin() {
    return this.authService.currentUser()?.nombreRol === 'ADMIN';
  }

  isJefe() {
    return this.authService.currentUser()?.esJefe === true;
  }

  isClient() {
    return this.authService.currentUser()?.nombreRol === 'CLIENTE';
  }
}
