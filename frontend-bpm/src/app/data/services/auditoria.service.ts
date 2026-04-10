import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Auditoria } from '../models/auditoria.model';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private apiUrl = '/api/v1/auditoria';

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Auditoria[]> {
    return this.http.get<Auditoria[]>(this.apiUrl);
  }

  listarPorUsuario(idUsuario: string): Observable<Auditoria[]> {
    return this.http.get<Auditoria[]>(`${this.apiUrl}/usuario/${idUsuario}`);
  }
}
