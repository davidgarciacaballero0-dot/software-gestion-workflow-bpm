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
      // Offline fallback: Queue the start request
      // We generate a temp ID for local tracking
      const tempId = 'temp-' + Date.now();
      this.offlineService.queueAction(tempId, 'iniciar', request);
      const tempResponse: any = { id: tempId, estado: 'PENDIENTE', codigo: 'PENDING_SYNC', ...request };
      return of(tempResponse);
    }
    return this.http.post<TramiteResponseDTO>(`${this.apiUrl}/iniciar`, request);
  }

  avanzarTramite(request: any): Observable<TramiteResponseDTO> {
    if (!this.offlineService.isOnline) {
      this.offlineService.queueAction(request.tramiteId, 'avanzar', request);
      // Optimistic response
      const tempResponse: any = { id: request.tramiteId, estado: 'SYNC_PENDING', ...request };
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
      return of({ id: tramiteId, asignadoId: funcionarioId } as any);
    }
    return this.http.patch<TramiteResponseDTO>(`${this.apiUrl}/${tramiteId}/asignar/${funcionarioId}`, {});
  }
}

