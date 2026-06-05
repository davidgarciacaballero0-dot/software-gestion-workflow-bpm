import { Injectable, ApplicationRef } from '@angular/core';
import { DexieService } from './dexie.service';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, first, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();
  
  // Emitido cuando se detecta un conflicto 409 al sincronizar
  public conflictDetected$ = new Subject<{ task: any; errorMsg: string }>();

  private isSyncing = false;

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
  }

  async syncQueuedTasks(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;
    this.isSyncing = true;

    try {
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
          
          if (error.status === 409) {
             // 409 Conflict: Sabor de bloqueo optimista
             // Emitimos el conflicto para la UI y pausamos la sync de esta cola
             const errorMsg = error.error?.message || 'El registro ha sido modificado en el servidor.';
             this.conflictDetected$.next({ task, errorMsg });
             break; // Detener la sincronización secuencial hasta que se resuelva este paso
          }
          // Para otros errores (ej. 500), lo dejamos en la cola para reintentar después
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // --- MÉTODOS DE RESOLUCIÓN DE CONFLICTOS (CU-23) ---

  /**
   * Opción A: Descartar cambios locales y actualizar el caché local con el estado del servidor.
   */
  async resolveConflictDiscard(taskId: number, tramiteId: string): Promise<void> {
    try {
      // 1. Eliminar tarea de la cola
      await this.dexieService.removeSyncTask(taskId);
      
      // 2. Traer el estado más reciente del servidor para corregir IndexedDB
      const serverState = await this.http.get<any>(`/api/v1/tramites/${tramiteId}`).toPromise();
      if (serverState) {
        await this.dexieService.saveTramites([serverState]);
      }
      
      // 3. Reanudar sincronización de las siguientes tareas
      this.syncQueuedTasks();
    } catch (err) {
      console.error("Error al descartar conflicto:", err);
    }
  }

  /**
   * Opción B: Forzar cambios locales. Trae el registro del servidor para obtener la última version,
   * mezcla los cambios locales, los guarda en el servidor y reanuda la sync.
   */
  async resolveConflictOverwrite(taskId: number, task: any): Promise<void> {
    try {
      const tramiteId = task.tramiteId;
      
      if (task.action === 'avanzar' || task.action === 'iniciar') {
        // 1. Obtener última versión del servidor
        const serverState = await this.http.get<any>(`/api/v1/tramites/${tramiteId}`).toPromise();
        
        if (serverState) {
          // 2. Mezclar datos y actualizar version
          const updatedPayload = { 
            ...task.payload,
            version: serverState.version // Tomar la última versión para saltar el bloqueo optimista
          };
          
          let apiUrl = `/api/v1/tramites`;
          if (task.action === 'avanzar') apiUrl += '/avanzar';
          else if (task.action === 'iniciar') apiUrl += '/iniciar';
          
          // 3. Volver a intentar la petición
          const result = await this.http.post<any>(apiUrl, updatedPayload).toPromise();
          if (result) {
            await this.dexieService.saveTramites([result]);
          }
        }
      } else if (task.action === 'asignar') {
        // Para asignaciones, re-intentar patch directo (normalmente no bloquean versión)
        const apiUrl = `/api/v1/tramites/${tramiteId}/asignar/${task.payload.funcionarioId}`;
        await this.http.patch(apiUrl, task.payload).toPromise();
      }

      // 4. Quitar la tarea completada y reanudar sync
      await this.dexieService.removeSyncTask(taskId);
      this.syncQueuedTasks();
    } catch (err) {
      console.error("Error al forzar sobrescritura de conflicto:", err);
      alert("No se pudo forzar el cambio. El trámite podría haber sido eliminado o modificado sustancialmente.");
    }
  }
}
