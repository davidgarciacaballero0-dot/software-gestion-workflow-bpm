export interface Auditoria {
  id?: string;
  idUsuarioActor: string;
  accion: string;
  entidadAfectada: string;
  ipOrigen: string;
  createdAt?: string;
}
