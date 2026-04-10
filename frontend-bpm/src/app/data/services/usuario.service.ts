import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = '/api/v1/usuarios';

  constructor(private http: HttpClient) {}

  listarPorDepartamento(idDepartamento: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/departamento/${idDepartamento}`);
  }

  registrar(usuario: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }
}
