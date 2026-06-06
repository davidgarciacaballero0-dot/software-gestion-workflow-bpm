import { Component, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../data/services/auth.service';
import { NotificationService } from '../../../data/services/notification.service';
import { ChatbotWidgetComponent } from '../../shared/voice-assistant/chatbot-widget.component';
import { OfflineService } from '../../../data/services/offline.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ChatbotWidgetComponent],
  template: `
    <div class="app-layout">
      <!-- Top Navbar Global -->
      <header class="top-navbar glass-premium shadow-ambient">
        <div class="navbar-left">
          <button class="back-btn-premium" (click)="goBack()" title="Volver Atrás">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="navbar-brand" routerLink="/app/catalog" style="cursor: pointer;">
            <span class="brand-bold">Orquestador</span>BPM
          </div>
          <div class="search-box">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" placeholder="Buscar componentes...">
          </div>
        </div>
        
        <nav class="navbar-center" *ngIf="!isClient()">
          <a routerLink="/app/catalog" routerLinkActive="active" class="nav-link">Panel de Control</a>
          <a routerLink="/app/designer" routerLinkActive="active" class="nav-link">Flujos de Trabajo</a>
          <a routerLink="/app/inbox" routerLinkActive="active" class="nav-link">Tareas</a>
        </nav>
        <nav class="navbar-center" *ngIf="isClient()">
           <a routerLink="/app/inbox" routerLinkActive="active" class="nav-link">Mis Trámites</a>
        </nav>

        <div class="navbar-right">
          <!-- Indicador de Sincronización Offline -->
          <div class="sync-status-indicator animate-fade-in" *ngIf="isSyncing()" title="Sincronizando cambios locales con el servidor...">
             <span class="material-symbols-outlined spin-animation">sync</span>
          </div>

          <button class="icon-btn" (click)="toggleNotifications()">
            <span class="material-symbols-outlined">notifications</span>
            <span class="notification-dot" *ngIf="notificationService.unreadCount() > 0"></span>
          </button>

          <!-- Dropdown de Notificaciones -->
          <div class="notifications-dropdown glass-premium animate-fade-in shadow-premium" *ngIf="showNotifications()">
            <div class="dropdown-header">
              <h3>Notificaciones</h3>
              <span class="badge">{{ notificationService.unreadCount() }}</span>
            </div>
            <div class="dropdown-body">
              <div *ngIf="notificationService.notifications().length === 0" class="empty-state">
                No tienes notificaciones
              </div>
              <div *ngFor="let notif of notificationService.notifications()" 
                   class="notification-item" 
                   [class.unread]="!notif.leida"
                   (click)="notif.id && notificationService.markAsRead(notif.id)">
                <div class="item-icon">🔔</div>
                <div class="item-content">
                  <p class="title">{{ notif.titulo }}</p>
                  <p class="msg">{{ notif.mensaje }}</p>
                  <span class="time">{{ formatDate(notif.createdAt) }}</span>
                </div>
                <div class="unread-indicator" *ngIf="!notif.leida"></div>
              </div>
            </div>
          </div>
          <div class="avatar-clickable" (click)="toggleProfile()" *ngIf="authService.currentUser() as user">
             {{ user.nombre.charAt(0).toUpperCase() }}
          </div>
        </div>
      </header>

      <!-- Banner de Estado de Conexión Offline -->
      <div class="offline-banner animate-fade-in" *ngIf="!isOnline()">
        <span class="material-symbols-outlined">cloud_off</span>
        <span>Modo sin conexión activo. Los cambios se guardarán localmente y se sincronizarán al reconectar.</span>
      </div>

      <!-- Layout Body -->
      <div class="layout-body">
        <!-- Sidebar de Navegación -->
        <aside class="sidebar-container" [class.collapsed]="isCollapsed()">
          <div class="sidebar-header">
            <div class="logo-box"><span class="material-symbols-outlined">developer_board</span></div>
            <div class="brand-text" *ngIf="!isCollapsed()">
              <h2>BPM Core</h2>
              <span>Suite Empresarial</span>
            </div>
            <button class="toggle-sidebar-btn" (click)="toggleSidebar()" [title]="isCollapsed() ? 'Expandir' : 'Colapsar'">
              <span class="material-symbols-outlined">{{ isCollapsed() ? 'chevron_right' : 'chevron_left' }}</span>
            </button>
          </div>

          <div class="sidebar-action" *ngIf="!isCollapsed() && isAdmin()">
            <button class="btn-new-process" routerLink="/app/designer">
              <span class="material-symbols-outlined">add</span> Nuevo Proceso
            </button>
          </div>

          <nav class="sidebar-nav">
            <a routerLink="/app/inbox" routerLinkActive="active" class="nav-item" [title]="isCollapsed() ? 'Bandeja' : ''">
              <span class="material-symbols-outlined icon">inbox</span>
              <span class="label" *ngIf="!isCollapsed()">{{ isClient() ? 'Mis Trámites' : 'Bandeja de Entrada' }}</span>
            </a>
            <a routerLink="/app/catalog" routerLinkActive="active" class="nav-item" *ngIf="!isClient()" [title]="isCollapsed() ? 'Políticas' : ''">
              <span class="material-symbols-outlined icon">policy</span>
              <span class="label" *ngIf="!isCollapsed()">Políticas</span>
            </a>
            <a routerLink="/app/users" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()" [title]="isCollapsed() ? 'Usuarios' : ''">
              <span class="material-symbols-outlined icon">group</span>
              <span class="label" *ngIf="!isCollapsed()">Usuarios</span>
            </a>
            <a routerLink="/app/roles" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()" [title]="isCollapsed() ? 'Roles' : ''">
              <span class="material-symbols-outlined icon">admin_panel_settings</span>
              <span class="label" *ngIf="!isCollapsed()">Roles</span>
            </a>
            <a routerLink="/app/organizations" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()" [title]="isCollapsed() ? 'Organizaciones' : ''">
              <span class="material-symbols-outlined icon">domain</span>
              <span class="label" *ngIf="!isCollapsed()">Organizaciones</span>
            </a>
            <a routerLink="/app/departments" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()" [title]="isCollapsed() ? 'Departamentos' : ''">
              <span class="material-symbols-outlined icon">account_tree</span>
              <span class="label" *ngIf="!isCollapsed()">Departamentos</span>
            </a>
            <a routerLink="/app/audit" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()" [title]="isCollapsed() ? 'Auditoría' : ''">
              <span class="material-symbols-outlined icon">history</span>
              <span class="label" *ngIf="!isCollapsed()">Auditoría</span>
            </a>
            <a routerLink="/app/supervision" routerLinkActive="active" class="nav-item" *ngIf="isAdmin() || isJefe()" [title]="isCollapsed() ? 'Supervisión' : ''">
              <span class="material-symbols-outlined icon">monitoring</span>
              <span class="label" *ngIf="!isCollapsed()">Supervisión</span>
            </a>
            <a routerLink="/app/insights" routerLinkActive="active" class="nav-item" *ngIf="isAdmin()" [title]="isCollapsed() ? 'IA Insights' : ''">
              <span class="material-symbols-outlined icon">smart_toy</span>
              <span class="label" *ngIf="!isCollapsed()">Reportes Dinamicos</span>
            </a>
          </nav>

          <div class="sidebar-footer">
            <button class="logout-action" (click)="authService.logout()" [title]="isCollapsed() ? 'Cerrar Sesión' : ''">
              <span class="material-symbols-outlined icon">logout</span>
              <span class="label" *ngIf="!isCollapsed()">Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="workspace-viewport">
          <section class="content-container animate-fade-in">
            <router-outlet></router-outlet>
          </section>
        </main>
      </div>

      <!-- Chatbot Inteligente Global -->
      <app-chatbot-widget></app-chatbot-widget>
      
      <!-- Modal de Perfil (Glassmorphism) -->
      <div class="profile-modal-overlay" *ngIf="showProfile()" (click)="toggleProfile()">
        <div class="profile-card-glass animate-pop" (click)="$event.stopPropagation()">
           <div class="profile-header">
             <div class="header-avatar">{{ authService.currentUser()?.nombre?.charAt(0) }}</div>
             <div class="header-text">
               <h3>{{ authService.currentUser()?.nombre }} {{ authService.currentUser()?.apellidos }}</h3>
               <span class="role-badge">{{ authService.currentUser()?.nombreRol }}</span>
             </div>
             <button class="close-btn" (click)="toggleProfile()"><span class="material-symbols-outlined">close</span></button>
           </div>
           <div class="profile-body">
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

      <!-- Modal de Resolución de Conflictos (CU-23) -->
      <div class="profile-modal-overlay" *ngIf="pendingConflict()">
        <div class="profile-card-glass animate-pop" style="max-width: 500px; padding: 2.5rem; display: flex; flex-direction: column; gap: 1.5rem; border: 1px solid rgba(239, 68, 68, 0.3);">
          <div class="profile-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.2); padding-bottom: 1rem; display: flex; align-items: center; gap: 1rem;">
            <div class="header-avatar" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 1.5rem; font-weight: bold;">⚠️</div>
            <div class="header-text" style="display: flex; flex-direction: column; gap: 0.25rem;">
              <h3 style="color: #ef4444; margin: 0; font-size: 1.15rem; font-weight: 700;">Conflicto de Sincronización</h3>
              <span class="role-badge" style="background: #ef4444; color: white; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; width: fit-content;">Offline Sync Conflict</span>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <p style="font-size: 0.9rem; line-height: 1.5; color: #4b5563; margin: 0;">
              {{ pendingConflict()?.errorMsg }}
            </p>
            <div style="background: rgba(0,0,0,0.02); border-radius: 6px; padding: 1rem; border: 1px solid rgba(0,0,0,0.05); font-size: 0.8rem; color: #1f2937;">
              <strong>Operación fallida:</strong> {{ pendingConflict()?.task?.action | uppercase }}<br>
              <strong>ID Trámite:</strong> {{ pendingConflict()?.task?.tramiteId }}
            </div>
            
            <p style="font-size: 0.85rem; color: #6b7280; font-style: italic; margin: 0;">
              ¿Qué deseas hacer con tus cambios locales offline?
            </p>
            
            <div style="display: flex; gap: 1rem; margin-top: 1rem; justify-content: flex-end;">
              <button 
                style="background: #ef4444; color: white; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem; border: none; cursor: pointer;"
                (click)="discardConflict()">
                <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete_forever</span> Descartar mis Cambios
              </button>
              <button 
                style="background: #10b981; color: white; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem; border: none; cursor: pointer;"
                (click)="overwriteConflict()">
                <span class="material-symbols-outlined" style="font-size: 1.1rem;">publish</span> Forzar Sobrescritura
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--surface);
      overflow: hidden;
      font-family: 'Inter', sans-serif;
    }

    /* TOP NAVBAR */
    .top-navbar {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      background: #ffffff;
      border-bottom: 1px solid rgba(200, 197, 208, 0.3); /* very subtle */
      z-index: 100;
    }

    .navbar-left {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .navbar-brand {
      font-size: 1.25rem;
      color: var(--primary);
    }
    
    .brand-bold {
      font-weight: 800;
    }

    .search-box {
      display: flex;
      align-items: center;
      background: #f1f5f9;
      padding: 0.5rem 1rem;
      border-radius: 9999px; /* Pill shape */
      width: 250px;
    }

    .search-icon {
      color: var(--text-muted);
      font-size: 1.2rem;
      margin-right: 0.5rem;
    }

    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.85rem;
      color: var(--text-main);
      width: 100%;
    }

    .back-btn-premium {
      background: var(--surface-container-low);
      border: 1px solid rgba(200, 197, 208, 0.3);
      border-radius: 12px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--primary);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .back-btn-premium:hover {
      background: var(--primary);
      color: white;
      transform: translateX(-4px);
      box-shadow: var(--shadow-ambient);
    }

    .back-btn-premium span {
      font-size: 1.25rem;
    }

    .navbar-center {
      display: flex;
      gap: 2rem;
    }

    .nav-link {
      text-decoration: none;
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 600;
      padding: 1.2rem 0;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .nav-link:hover, .nav-link.active {
      color: var(--primary);
      border-bottom: 2px solid var(--primary);
    }

    .navbar-right {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .icon-btn:hover { color: var(--primary); }

    .notification-dot {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      background: #ef4444; /* red indicator */
      border-radius: 50%;
      border: 2px solid white;
    }

    /* DROPDOWN NOTIFICACIONES */
    .notifications-dropdown {
      position: absolute;
      top: 70px;
      right: 2rem;
      width: 320px;
      max-height: 400px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dropdown-header {
      padding: 1rem;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dropdown-header h3 { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--primary); }
    .dropdown-header .badge { background: #ef4444; color: white; font-size: 0.7rem; padding: 0.1rem 0.5rem; border-radius: 99px; }

    .dropdown-body {
      overflow-y: auto;
      flex: 1;
    }

    .empty-state { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }

    .notification-item {
      padding: 0.75rem 1rem;
      display: flex;
      gap: 0.75rem;
      cursor: pointer;
      transition: background 0.2s;
      border-bottom: 1px solid rgba(0,0,0,0.03);
      position: relative;
    }

    .notification-item:hover { background: rgba(0,0,0,0.02); }
    .notification-item.unread { background: rgba(77, 64, 255, 0.03); }

    .item-icon { font-size: 1.2rem; }
    .item-content { flex: 1; }
    .item-content .title { margin: 0; font-size: 0.8rem; font-weight: 700; color: var(--text-main); }
    .item-content .msg { margin: 0.2rem 0; font-size: 0.75rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .item-content .time { font-size: 0.65rem; color: var(--text-muted); opacity: 0.7; }

    .unread-indicator { width: 6px; height: 6px; background: var(--primary); border-radius: 50%; align-self: center; }

    .avatar-clickable {
      width: 36px;
      height: 36px;
      background: #0d9488; /* Teal as per image avatar */
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      cursor: pointer;
      box-shadow: var(--shadow-ambient);
    }

    /* LAYOUT BODY */
    .layout-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Sidebar Refined Styles - Orchestrated Monolith */
    .sidebar-container {
      width: 260px;
      height: 100%;
      background: #ffffff;
      border-right: 1px solid rgba(200, 197, 208, 0.3);
      display: flex;
      flex-direction: column;
      padding: 1.5rem 1rem;
      z-index: 50;
      transition: width 0.3s ease;
    }

    .sidebar-container.collapsed {
      width: 80px;
      padding: 1.5rem 0.5rem;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-left: 0.5rem;
      position: relative;
    }

    .toggle-sidebar-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      position: absolute;
      right: 0;
    }
    .toggle-sidebar-btn:hover { color: var(--primary); }

    .logo-box {
      width: 40px;
      height: 40px;
      background: var(--primary);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .brand-text h2 { font-size: 1rem; font-weight: 700; margin: 0; color: var(--primary); }
    .brand-text span { font-size: 0.7rem; color: var(--text-muted); }

    .sidebar-action {
      margin-bottom: 1.5rem;
      padding: 0 0.5rem;
    }

    .btn-new-process {
      width: 100%;
      padding: 0.75rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(30, 27, 75, 0.3);
      transition: all 0.2s;
    }
    
    .btn-new-process:hover {
       transform: translateY(-2px);
       box-shadow: 0 6px 15px rgba(30, 27, 75, 0.4);
    }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s;
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar-container.collapsed .nav-item {
      justify-content: center;
      padding: 0.75rem 0;
      gap: 0;
    }

    .sidebar-container.collapsed .icon {
      font-size: 1.3rem;
    }

    .nav-item:hover {
      background: var(--surface);
      color: var(--primary);
    }

    .nav-item.active {
      background: #f1f5f9; /* light blue-ish from image */
      color: var(--primary);
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

    .content-container {
      flex: 1;
      padding: 0; /* Designer requires full width/height, child components handle padding */
      overflow: auto;
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid rgba(200, 197, 208, 0.3);
    }

    .logout-action {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .logout-action:hover {
      background: #fee2e2;
      color: #dc2626;
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

    /* OFFLINE & SYNC UX/UI */
    .offline-banner {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      text-align: center;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      box-shadow: inset 0 -2px 5px rgba(0,0,0,0.05);
      z-index: 99;
    }
    .offline-banner span {
      font-size: 1.15rem;
    }
    .sync-status-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(99, 102, 241, 0.08);
      margin-right: 0.5rem;
    }
    .spin-animation {
      animation: spin 1.5s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class MainLayoutComponent {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  location = inject(Location);
  offlineService = inject(OfflineService);

  showProfile = signal(false);
  showNotifications = signal(false);
  isCollapsed = signal(false);
  pendingConflict = signal<any>(null);
  isOnline = signal<boolean>(this.offlineService.isOnline);
  isSyncing = signal<boolean>(false);

  constructor() {
    this.offlineService.conflictDetected$.subscribe(conflict => {
      this.pendingConflict.set(conflict);
    });

    this.offlineService.isOnline$.subscribe(online => {
      this.isOnline.set(online);
    });

    this.offlineService.isSyncing$.subscribe(syncing => {
      this.isSyncing.set(syncing);
    });
  }

  discardConflict() {
    const conflict = this.pendingConflict();
    if (conflict && conflict.task && conflict.task.id) {
      this.offlineService.resolveConflictDiscard(conflict.task.id, conflict.task.tramiteId).then(() => {
        this.pendingConflict.set(null);
      });
    }
  }

  overwriteConflict() {
    const conflict = this.pendingConflict();
    if (conflict && conflict.task && conflict.task.id) {
      this.offlineService.resolveConflictOverwrite(conflict.task.id, conflict.task).then(() => {
        this.pendingConflict.set(null);
      });
    }
  }

  toggleNotifications() {
    this.showNotifications.update(v => !v);
  }

  toggleProfile() {
    this.showProfile.update(v => !v);
  }

  goBack() {
    this.location.back();
  }

  toggleSidebar() {
    this.isCollapsed.update(v => !v);
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
