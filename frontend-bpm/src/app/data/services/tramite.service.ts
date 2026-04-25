import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StartProcedureRequestDTO, TramiteResponseDTO } from '../models/tramite.model';

@Injectable({
  providedIn: 'root'
})
export class TramiteService {
  private apiUrl = '/api/v1/tramites';

  constructor(private http: HttpClient) {}

  iniciarTramite(request: StartProcedureRequestDTO): Observable<TramiteResponseDTO> {
    return this.http.post<TramiteResponseDTO>(`${this.apiUrl}/iniciar`, request);
  }

  avanzarTramite(request: any): Observable<TramiteResponseDTO> {
    return this.http.post<TramiteResponseDTO>(`${this.apiUrl}/avanzar`, request);
  }

  obtenerTramite(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  listarPorDepartamento(departamentoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/departamento/${departamentoId}`);
  }

  listarPorUsuario(usuarioId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/solicitante/${usuarioId}`);
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
    return this.http.patch<TramiteResponseDTO>(`${this.apiUrl}/${tramiteId}/asignar/${funcionarioId}`, {});
  }
}

