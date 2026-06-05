import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, tap, catchError, throwError } from 'rxjs';
import { StartProcedureRequestDTO, TramiteResponseDTO } from '../models/tramite.model';
import { OfflineService } from './offline.service';
import { DexieService } from './dexie.service';

@Injectable({
  providedIn: 'root'
})
export class TramiteService {
  private apiUrl = '/api/v1/tramites';

  constructor(
    private http: HttpClient,
    private offlineService: OfflineService,
    private dexieService: DexieService
  ) {}

  iniciarTramite(request: StartProcedureRequestDTO): Observable<TramiteResponseDTO> {
    if (!this.offlineService.isOnline) {
      // Generar UUID robusto en el cliente (soporta HTTPS y local dev)
      const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'f-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      request.id = uuid;
      this.offlineService.queueAction(uuid, 'iniciar', request);

      const tempResponse: TramiteResponseDTO = {
        id: uuid,
        codigoTramite: 'PENDING_SYNC',
        nombrePolitica: 'Trámite por Sincronizar',
        idPolitica: request.idPolitica,
        idUsuarioSolicitante: request.idUsuarioSolicitante,
        ciSolicitante: request.datosIniciales?.ci || '',
        nombreSolicitante: request.datosIniciales?.nombre || 'Cliente Offline',
        funcionarioAsignadoId: '',
        estadoActual: 'PENDIENTE_SINC',
        nodoActualId: '',
        departamentoActualId: '',
        prioridad: request.prioridad || 2,
        createdAt: new Date().toISOString()
      };

      // Guardar inmediatamente en Dexie de forma optimista
      this.dexieService.saveTramites([tempResponse]);
      return of(tempResponse);
    }
    return this.http.post<TramiteResponseDTO>(`${this.apiUrl}/iniciar`, request);
  }

  avanzarTramite(request: any): Observable<TramiteResponseDTO> {
    if (!this.offlineService.isOnline) {
      this.offlineService.queueAction(request.tramiteId, 'avanzar', request);
      
      // Obtener el trámite de la caché local y actualizarlo optimistamente
      this.dexieService.getTramite(request.tramiteId).then(existing => {
        if (existing) {
          existing.estadoActual = 'SYNC_PENDING';
          this.dexieService.saveTramites([existing]);
        }
      });

      const tempResponse: any = { id: request.tramiteId, estadoActual: 'SYNC_PENDING', ...request };
      return of(tempResponse);
    }
    return this.http.post<TramiteResponseDTO>(`${this.apiUrl}/avanzar`, request);
  }

  obtenerTramite(id: string): Observable<any> {
    if (!this.offlineService.isOnline) {
      return from(this.dexieService.getTramite(id));
    }
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      tap(tramite => {
        if (tramite) this.dexieService.saveTramites([tramite]);
      })
    );
  }

  listarPorDepartamento(departamentoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/departamento/${departamentoId}`);
  }

  listarPorUsuario(usuarioId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/solicitante/${usuarioId}`);
  }

  listarAsignados(usuarioId: string): Observable<any[]> {
    if (!this.offlineService.isOnline) {
      return from(this.dexieService.getTramitesByAsignado(usuarioId));
    }
    return this.http.get<any[]>(`${this.apiUrl}/asignados/${usuarioId}`).pipe(
      tap(tramites => {
        if (tramites && tramites.length > 0) {
          this.dexieService.saveTramites(tramites);
        }
      })
    );
  }

  obtenerHistorial(idTramite: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${idTramite}/historial`);
  }

  listarSupervision(departamentoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/supervision/${departamentoId}`);
  }

  intervenirTramite(request: any): Observable<TramiteResponseDTO> {
    return this.http.post<TramiteResponseDTO>(`${this.apiUrl}/intervencion`, request);
  }

  buscarPorCi(ci: string): Observable<TramiteResponseDTO[]> {
    return this.http.get<TramiteResponseDTO[]>(`${this.apiUrl}/search/ci/${ci}`);
  }

  asignarFuncionario(tramiteId: string, funcionarioId: string): Observable<TramiteResponseDTO> {
    if (!this.offlineService.isOnline) {
      this.offlineService.queueAction(tramiteId, 'asignar', { funcionarioId });
      
      // Actualizar localmente el asignado
      this.dexieService.getTramite(tramiteId).then(existing => {
        if (existing) {
          existing.funcionarioAsignadoId = funcionarioId;
          this.dexieService.saveTramites([existing]);
        }
      });

      return of({ id: tramiteId, funcionarioAsignadoId: funcionarioId } as any);
    }
    return this.http.patch<TramiteResponseDTO>(`${this.apiUrl}/${tramiteId}/asignar/${funcionarioId}`, {});
  }
}

