import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Organizacion } from '../models/organizacion.model';

@Injectable({
  providedIn: 'root'
})
export class OrganizacionService {
  private apiUrl = '/api/v1/organizaciones';

  constructor(private http: HttpClient) { }

  listarTodas(): Observable<Organizacion[]> {
    return this.http.get<Organizacion[]>(this.apiUrl);
  }

  obtenerPorId(id: string): Observable<Organizacion> {
    return this.http.get<Organizacion>(`${this.apiUrl}/${id}`);
  }

  crear(organizacion: Organizacion): Observable<Organizacion> {
    return this.http.post<Organizacion>(this.apiUrl, organizacion);
  }
}
