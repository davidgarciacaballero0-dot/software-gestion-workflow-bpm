import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoliticaWorkflow } from '../models/politica-workflow.model';

@Injectable({
  providedIn: 'root'
})
export class PoliticaWorkflowService {
  private apiUrl = '/api/v1/policies';

  constructor(private http: HttpClient) {}

  guardar(politica: PoliticaWorkflow): Observable<PoliticaWorkflow> {
    return this.http.post<PoliticaWorkflow>(this.apiUrl, politica);
  }

  listarPorOrganizacion(idOrganizacion: string): Observable<PoliticaWorkflow[]> {
    return this.http.get<PoliticaWorkflow[]>(`${this.apiUrl}/organization/${idOrganizacion}`);
  }

  obtenerPorId(id: string): Observable<PoliticaWorkflow> {
    return this.http.get<PoliticaWorkflow>(`${this.apiUrl}/${id}`);
  }
}
