import { Injectable, ApplicationRef } from '@angular/core';
import { DexieService } from './dexie.service';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();

  constructor(
    private dexieService: DexieService,
    private http: HttpClient,
    private appRef: ApplicationRef
  ) {
    this.initNetworkMonitoring();
  }

  private initNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnlineSubject.next(true);
      this.syncQueuedTasks();
    });

    window.addEventListener('offline', () => {
      this.isOnlineSubject.next(false);
    });

    // Check if there are tasks to sync initially when app loads
    this.appRef.isStable.pipe(first(isStable => isStable === true)).subscribe(() => {
      if (navigator.onLine) {
        this.syncQueuedTasks();
      }
    });
  }

  get isOnline(): boolean {
    return this.isOnlineSubject.getValue();
  }

  async queueAction(tramiteId: string, action: string, payload: any): Promise<void> {
    await this.dexieService.addSyncTask(tramiteId, action, payload);
    // Optionally update local cache immediately to reflect optimistic changes
  }

  async syncQueuedTasks(): Promise<void> {
    if (!this.isOnline) return;

    const queue = await this.dexieService.getSyncQueue();
    if (queue.length === 0) return;

    for (const task of queue) {
      try {
        let apiUrl = `/api/v1/tramites`;
        switch(task.action) {
          case 'avanzar':
            apiUrl = `${apiUrl}/avanzar`;
            break;
          case 'iniciar':
            apiUrl = `${apiUrl}/iniciar`;
            break;
          case 'asignar':
            apiUrl = `${apiUrl}/${task.tramiteId}/asignar/${task.payload.funcionarioId}`;
            break;
          default:
            apiUrl = `${apiUrl}/${task.action}`;
        }
        
        // Execute sync based on task action
        if (task.action === 'asignar') {
           await this.http.patch(apiUrl, task.payload).toPromise();
        } else {
           await this.http.post(apiUrl, task.payload).toPromise();
        }

        // Remove task on success
        if (task.id) {
           await this.dexieService.removeSyncTask(task.id);
        }
      } catch (error: any) {
        console.error(`Failed to sync task ${task.id}:`, error);
        // Handle optimistic concurrency conflicts (e.g. 409 Conflict)
        if (error.status === 409) {
           // Data changed on server during offline. Reject and remove from queue
           if (task.id) await this.dexieService.removeSyncTask(task.id);
           alert(`Conflicto de sincronización en trámite ${task.tramiteId}. Se han perdido los cambios offline debido a modificaciones concurrentes.`);
        }
        // If it's another error (500, etc), might keep in queue to retry later
      }
    }
  }
}
