import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Client, IMessage } from '@stomp/stompjs';
import * as SockJS_ from 'sockjs-client';
const SockJS = (SockJS_ as any).default || SockJS_;

export interface Notification {
  titulo: string;
  mensaje: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private stompClient: Client | null = null;
  private notificationSubject = new Subject<Notification>();

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeWebSocketConnection();
    }
  }

  private initializeWebSocketConnection(): void {
    const socket = new SockJS('/ws-bpm');
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
          this.notificationSubject.next(notification);
        }
      });
    }
  }

  getNotifications(): Observable<Notification> {
    return this.notificationSubject.asObservable();
  }
}
