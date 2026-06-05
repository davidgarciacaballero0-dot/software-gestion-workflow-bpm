import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DocumentPermission {
  sujetoId: string;
  tipoSujeto: string;
  nivel: string;
}

export interface ArchivoAdjunto {
  id: string;
  idTramiteInstancia: string;
  idUsuarioSubida: string;
  nombreOriginal: string;
  contentType: string;
  tamano: number;
  createdAt: string;
  idPolitica?: string;
  idCliente?: string;
  tipoDocumento?: string;
  departamentoOrigenId?: string;
  permisos?: DocumentPermission[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
  private apiUrl = `/api/v1/archivos`;

  constructor(private http: HttpClient) {}

  getByTramite(idTramite: string): Observable<ArchivoAdjunto[]> {
    return this.http.get<ArchivoAdjunto[]>(`${this.apiUrl}/tramite/${idTramite}`);
  }

  getByCliente(idCliente: string): Observable<ArchivoAdjunto[]> {
    return this.http.get<ArchivoAdjunto[]>(`${this.apiUrl}/cliente/${idCliente}`);
  }

  getByPolitica(idPolitica: string): Observable<ArchivoAdjunto[]> {
    return this.http.get<ArchivoAdjunto[]>(`${this.apiUrl}/politica/${idPolitica}`);
  }

  getGlobal(idUsuario: string): Observable<ArchivoAdjunto[]> {
    return this.http.get<ArchivoAdjunto[]>(`${this.apiUrl}/global?idUsuario=${idUsuario}`);
  }

  updatePermisos(idArchivo: string, permisos: DocumentPermission[]): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${idArchivo}/permisos`, permisos);
  }
}
