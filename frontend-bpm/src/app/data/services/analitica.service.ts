import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MetricData {
  departamentoId: string;
  nombreDepartamento: string;
  tiempoPromedioHoras: number;
  cantidadTramites: number;
  capacidadPersonal: number;
  retrasosSla?: number;
}

export interface ReassignMassRequest {
  idOrigen: string;
  idDestino: string;
  userIds: string[];
  motivo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnaliticaService {
  private apiUrl = '/api/v1/optimization';

  constructor(private http: HttpClient) {}

  getMetrics(meses?: number, idDept?: string): Observable<MetricData[]> {
    let url = `${this.apiUrl}/metrics`;
    const params: string[] = [];
    if (meses !== undefined && meses !== null) params.push(`meses=${meses}`);
    if (idDept) params.push(`idDepartamento=${idDept}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<MetricData[]>(url);
  }

  downloadExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/report/excel`, { responseType: 'blob' });
  }

  downloadPdf(text: string, chartImage?: string, metrics?: MetricData[]): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/report/pdf`, { text, chartImage, metrics }, { responseType: 'blob' });
  }

  reassignPersonal(request: ReassignMassRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/reassign`, request);
  }

  getUsersByDepartamento(idDept: string): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/usuarios/departamento/' + idDept);
  }

  // RF-3.4: Sugerencias de Reasignación IA
  getSugerenciasReasignacion(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/suggestions/reassign`);
  }

  aprobarReasignacion(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/suggestions/reassign/${id}/approve`, {});
  }

  rechazarReasignacion(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/suggestions/reassign/${id}/reject`, {});
  }
}
