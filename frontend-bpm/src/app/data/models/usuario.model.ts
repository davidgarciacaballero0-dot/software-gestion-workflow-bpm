export interface Usuario {
  id: string;
  idOrganizacion: string;
  idDepartamento: string;
  idRol: string;
  nombre: string;
  email: string;
  password?: string;
  createdAt?: string;
}

// Alias para mantener consistencia con los DTOs del Backend
export type UsuarioResponseDTO = Usuario;
