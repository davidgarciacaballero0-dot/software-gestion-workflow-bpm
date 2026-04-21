import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MetricData {
  departamentoId: string;
  nombreDepartamento: string;
  tiempoPromedioHoras: number;
  cantidadTramites: number;
  capacidadPersonal: number;
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

  getMetrics(): Observable<MetricData[]> {
    return this.http.get<MetricData[]>(`${this.apiUrl}/metrics`);
  }

  downloadExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/report/excel`, { responseType: 'blob' });
  }

  downloadPdf(text: string): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/report/pdf`, { text }, { responseType: 'blob' });
  }

  reassignPersonal(request: ReassignMassRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/reassign`, request);
  }
}
