import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <!-- Sidebar de Navegación -->
      <aside class="app-sidebar shadow-premium">
        <div class="sidebar-header">
          <div class="logo-box">BPM</div>
          <h1>Workflow</h1>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/catalog" routerLinkActive="active" class="nav-item">
            <span class="icon">🚀</span>
            <span>Trámites</span>
          </a>
          <a routerLink="/inbox" routerLinkActive="active" class="nav-item">
            <span class="icon">📥</span>
            <span>Bandeja</span>
          </a>
          <a routerLink="/ designer" routerLinkActive="active" class="nav-item" *ngIf="isAdmin">
            <span class="icon">🎨</span>
            <span>Diseñador</span>
          </a>
          <a routerLink="/supervision" routerLinkActive="active" class="nav-item" *ngIf="isJefe">
            <span class="icon">📊</span>
            <span>Supervisión</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-pill glass">
            <div class="avatar">U</div>
            <div class="user-info">
              <span class="username">{{ userName }}</span>
              <span class="role">{{ userRole }}</span>
            </div>
          </div>
          <button class="logout-btn" (click)="logout()">
            <span class="icon">🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <!-- Contenido Principal -->
      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-dark);
    }

    .app-sidebar {
      width: 280px;
      background: #111827;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      z-index: 100;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 3rem;
    }

    .logo-box {
      width: 42px;
      height: 42px;
      background: var(--primary);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: white;
      box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
    }

    .sidebar-header h1 {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .sidebar-nav {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      transform: translateX(4px);
    }

    .nav-item.active {
      background: rgba(99, 102, 241, 0.15);
      color: var(--primary);
      box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.2);
    }

    .app-content {
      flex: 1;
      overflow: auto;
      padding: 2rem;
      background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.05), transparent);
    }

    .sidebar-footer {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 14px;
    }

    .avatar {
      width: 36px;
      height: 36px;
      background: var(--primary);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .username { font-size: 0.85rem; font-weight: 600; color: #fff; }
    .role { font-size: 0.7rem; color: var(--text-muted); }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      color: #f87171;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: #f87171;
    }
  `]
})
export class MainLayoutComponent {
  userName = 'Usuario';
  userRole = 'Rol';
  isAdmin = true;
  isJefe = true;

  logout() {
    localStorage.removeItem('bpm_jwt_token');
    window.location.href = '/login';
  }
}
