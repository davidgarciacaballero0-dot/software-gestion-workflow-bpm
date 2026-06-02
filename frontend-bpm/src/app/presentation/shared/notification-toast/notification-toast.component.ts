import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../data/services/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" *ngIf="currentNotification">
      <div class="toast-card shadow-premium animate-slide-in">
        <div class="toast-icon">🔔</div>
        <div class="toast-body">
          <strong>{{ currentNotification.titulo }}</strong>
          <p>{{ currentNotification.mensaje }}</p>
        </div>
        <button class="close-btn" (click)="clearNotification()">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 2rem;
      right: 2rem;
      z-index: 1000;
      pointer-events: none;
    }

    .toast-card {
      pointer-events: auto;
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      min-width: 300px;
      max-width: 450px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .toast-icon { font-size: 1.5rem; }
    
    .toast-body { flex: 1; }
    .toast-body strong { display: block; font-size: 0.9rem; color: #fff; margin-bottom: 0.2rem; }
    .toast-body p { margin: 0; font-size: 0.8rem; color: #94a3b8; }

    .close-btn {
      background: transparent;
      border: none;
      color: #475569;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.5rem;
      transition: color 0.2s;
    }
    .close-btn:hover { color: #fff; }

    .animate-slide-in {
      animation: slideIn 0.3s ease-out forwards;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class NotificationToastComponent implements OnInit {
  currentNotification: Notification | null = null;
  private timeoutId: any;

  constructor(
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.notificationService.getNotifications().subscribe((notif) => {
      // Defer state update to next microtask to prevent ExpressionChangedAfterItHasBeenCheckedError
      Promise.resolve().then(() => {
        this.currentNotification = notif;
        this.cdr.detectChanges();
        
        // Auto-ocultar después de 5 segundos
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => this.clearNotification(), 5000);
      });
    });
  }

  clearNotification(): void {
    this.currentNotification = null;
    this.cdr.detectChanges();
  }
}
