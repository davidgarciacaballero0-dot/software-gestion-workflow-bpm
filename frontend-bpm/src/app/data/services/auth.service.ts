import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  id: string; // ID de MongoDB
  token: string;
  nombre: string;
  apellidos: string;
  email: string;
  ci: string;
  celular: string;
  fechaNacimiento: string;
  createdAt: string;
  idRol: string;
  idOrganizacion: string;
  esJefe?: boolean;
  nombreRol?: string;
  idDepartamento?: string;
}

export interface UserData {
  id: string; // ID de MongoDB
  nombre: string;
  apellidos: string;
  email: string;
  ci: string;
  celular: string;
  fechaNacimiento: string;
  createdAt: string;
  idRol: string;
  idOrganizacion: string;
  esJefe: boolean;
  nombreRol: string;
  idDepartamento: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/v1/auth';
  private readonly TOKEN_KEY = 'bpm_jwt_token';
  private readonly USER_KEY = 'bpm_user_data';

  // Signals for reactive state
  private _currentUser = signal<UserData | null>(null);
  public currentUser = computed(() => this._currentUser());
  public isAuthenticated = computed(() => !!this._currentUser());

  constructor(private http: HttpClient) {
    this.hydrate();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private hydrate(): void {
    if (this.isBrowser()) {
      const data = localStorage.getItem(this.USER_KEY);
      if (data) {
        try {
          this._currentUser.set(JSON.parse(data));
        } catch (e) {
          this.logout();
        }
      }
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        const userData: UserData = {
          id: response.id,
          nombre: response.nombre,
          apellidos: response.apellidos,
          email: response.email,
          ci: response.ci,
          celular: response.celular,
          fechaNacimiento: response.fechaNacimiento,
          createdAt: response.createdAt,
          idRol: response.idRol,
          idOrganizacion: response.idOrganizacion,
          esJefe: response.esJefe || false,
          nombreRol: response.nombreRol || '',
          idDepartamento: response.idDepartamento || ''
        };

        if (this.isBrowser()) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
        }
        
        this._currentUser.set(userData);
      })
    );
  }

  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this._currentUser.set(null);
    window.location.href = '/login';
  }

  getToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }
}
