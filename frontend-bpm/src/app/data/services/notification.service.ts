import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Client, IMessage } from '@stomp/stompjs';
import { HttpClient } from '@angular/common/http';
import * as SockJS_ from 'sockjs-client';
const SockJS = (SockJS_ as any).default || SockJS_;

export interface Notification {
  id?: string;
  titulo: string;
  mensaje: string;
  leida?: boolean;
  createdAt: string;
}

import { signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private stompClient: Client | null = null;
  private notificationSubject = new Subject<Notification>();
  
  // <NEW> State management
  notifications = signal<Notification[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.leida).length);

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeWebSocketConnection();
      this.loadHistory();
    }
  }

  private initializeWebSocketConnection(): void {
    // En producción (Cloud Run), conectar directamente al backend para evitar
    // que el WebSocket pase por el proxy Nginx (no sobrevive doble LB).
    // En localhost, usar la ruta relativa que pasa por el proxy de desarrollo.
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const wsUrl = isLocalhost
      ? '/ws-bpm'
      : 'https://backend-spring-wyjjtm2n6a-uc.a.run.app/ws-bpm';

    const socket = new SockJS(wsUrl);
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Connected: ' + frame);
      const user = this.authService.currentUser();
      if (user && user.idDepartamento) {
        this.subscribeToDepartment(user.idDepartamento);
      }
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.stompClient.activate();
  }

  subscribeToDepartment(deptId: string): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.subscribe(`/topic/department/${deptId}`, (message: IMessage) => {
        if (message.body) {
          const notification: Notification = JSON.parse(message.body);
          // Actualizar el estado local
          this.notifications.update(list => [notification, ...list]);
          this.notificationSubject.next(notification);
        }
      });
    }
  }

  getNotifications(): Observable<Notification> {
    return this.notificationSubject.asObservable();
  }

  // REQ-10: Métodos genéricos para colaboración en tiempo real
  subscribeToTopic(topic: string, callback: (payload: any) => void): any {
    if (this.stompClient && this.stompClient.connected) {
      return this.stompClient.subscribe(topic, (message: IMessage) => {
        if (message.body) {
          callback(JSON.parse(message.body));
        }
      });
    }
    // Si no está conectado aún, reintentar cada 500ms hasta que conecte (máx 20 intentos = 10s)
    let attempts = 0;
    const retryInterval = setInterval(() => {
      attempts++;
      if (this.stompClient && this.stompClient.connected) {
        clearInterval(retryInterval);
        this.stompClient.subscribe(topic, (message: IMessage) => {
          if (message.body) {
            callback(JSON.parse(message.body));
          }
        });
      }
      if (attempts >= 20) {
        clearInterval(retryInterval);
        console.warn('WebSocket: No se pudo suscribir a', topic, 'después de 10s');
      }
    }, 500);
    return null;
  }

  sendMessage(destination: string, payload: any): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: destination,
        body: JSON.stringify(payload)
      });
    }
  }

  // Notificación local manual (Fix compilación)
  notify(mensaje: string, titulo: string = 'SISTEMA'): void {
    const notification: Notification = {
      titulo: titulo,
      mensaje: mensaje,
      leida: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.update(list => [notification, ...list]);
    this.notificationSubject.next(notification);
  }

  // <NEW> API Methods
  loadHistory(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const url = `/api/v1/notificaciones/usuario/${user.id}?departamentoId=${user.idDepartamento || ''}`;
    this.http.get<Notification[]>(url).subscribe(history => {
      this.notifications.set(history);
    });
  }

  markAsRead(notifId: string): void {
    this.http.patch(`/api/v1/notificaciones/${notifId}/leer`, {}).subscribe(() => {
      this.notifications.update(list => 
        list.map(n => n.id === notifId ? { ...n, leida: true } : n)
      );
    });
  }
}
