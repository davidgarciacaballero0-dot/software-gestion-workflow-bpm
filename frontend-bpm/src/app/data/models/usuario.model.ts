export interface Usuario {
  id?: string;
  idOrganizacion: string; // Tenant al que pertenece
  idDepartamento: string;
  idRol: string;
  nombre: string;
  email: string;
  password?: string; // IMPORTANTE: Sólo se debe usar en peticiones POST. Viene undefined en GET por seguridad del backend.
  createdAt?: string;
}
