import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Departamento } from '../models/departamento.model';

@Injectable({
  providedIn: 'root'
})
export class DepartamentoService {
  private apiUrl = '/api/v1/departamentos';

  constructor(private http: HttpClient) {}

  listarPorOrganizacion(idOrganizacion: string): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(`${this.apiUrl}/organizacion/${idOrganizacion}`);
  }

  crear(departamento: Departamento): Observable<Departamento> {
    return this.http.post<Departamento>(this.apiUrl, departamento);
  }
}
