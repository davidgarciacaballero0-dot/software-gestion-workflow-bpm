import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { TramiteResponseDTO } from '../models/tramite.model';

@Injectable({
  providedIn: 'root'
})
export class DexieService extends Dexie {
  tramites!: Table<TramiteResponseDTO, string>;
  syncQueue!: Table<{
    id?: number;
    tramiteId: string;
    action: string;
    payload: any;
    timestamp: number;
  }, number>;

  constructor() {
    super('BPMWorkflowOfflineDB');
    this.version(1).stores({
      tramites: 'id, estado, solicitanteId, asignadoId', // Primary key and indexed props
      syncQueue: '++id, tramiteId, action, timestamp'
    });
  }

  // --- Tramites Cache ---
  async saveTramites(tramites: TramiteResponseDTO[]): Promise<void> {
    await this.tramites.bulkPut(tramites);
  }

  async getTramite(id: string): Promise<TramiteResponseDTO | undefined> {
    return this.tramites.get(id);
  }

  async getAllTramites(): Promise<TramiteResponseDTO[]> {
    return this.tramites.toArray();
  }

  async getTramitesByAsignado(asignadoId: string): Promise<TramiteResponseDTO[]> {
    return this.tramites.where('asignadoId').equals(asignadoId).toArray();
  }

  // --- Sync Queue ---
  async addSyncTask(tramiteId: string, action: string, payload: any): Promise<void> {
    await this.syncQueue.add({
      tramiteId,
      action,
      payload,
      timestamp: Date.now()
    });
  }

  async getSyncQueue(): Promise<any[]> {
    return this.syncQueue.orderBy('timestamp').toArray();
  }

  async removeSyncTask(id: number): Promise<void> {
    await this.syncQueue.delete(id);
  }

  async clearSyncQueue(): Promise<void> {
    await this.syncQueue.clear();
  }
}
