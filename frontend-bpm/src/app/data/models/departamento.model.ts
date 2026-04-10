export interface Departamento {
  id?: string;
  idOrganizacion: string; // Referencia al tenant
  idDepartamentoPadre?: string;
  nombre: string;
  codigoArea?: string;
  createdAt?: string;
  updatedAt?: string;
}
