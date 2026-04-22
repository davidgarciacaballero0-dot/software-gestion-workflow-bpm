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
    const id = politica.id || politica._id;
    if (id) {
      return this.http.put<PoliticaWorkflow>(`${this.apiUrl}/${id}`, politica);
    }
    return this.http.post<PoliticaWorkflow>(this.apiUrl, politica);
  }

  listarPorOrganizacion(idOrganizacion: string): Observable<PoliticaWorkflow[]> {
    return this.http.get<PoliticaWorkflow[]>(`${this.apiUrl}/organization/${idOrganizacion}`);
  }

  listarCatalogoPublico(): Observable<PoliticaWorkflow[]> {
    return this.http.get<PoliticaWorkflow[]>(`${this.apiUrl}/catalog`);
  }

  obtenerPorId(id: string): Observable<PoliticaWorkflow> {
    return this.http.get<PoliticaWorkflow>(`${this.apiUrl}/${id}`);
  }

  publicar(id: string): Observable<PoliticaWorkflow> {
    return this.http.patch<PoliticaWorkflow>(`${this.apiUrl}/${id}/publish`, {});
  }

  generarConIA(descripcion: string): Observable<any> {
    return this.http.post<any>(`/api/v1/optimization/analyze-flow`, { descripcion });
  }

  nuevaVersion(id: string): Observable<PoliticaWorkflow> {
    return this.http.post<PoliticaWorkflow>(`${this.apiUrl}/${id}/new-version`, {});
  }
}
