export interface Departamento {
  id?: string;
  idOrganizacion: string; // Referencia al tenant
  idDepartamentoPadre?: string;
  nombre: string;
  codigoArea?: string;
  idJefe?: string; // CU-17
  createdAt?: string;
  updatedAt?: string;
}
