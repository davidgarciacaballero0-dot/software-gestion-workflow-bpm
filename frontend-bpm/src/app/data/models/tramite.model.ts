export interface StartProcedureRequestDTO {
  idPolitica: string;
  idUsuarioSolicitante: string;
  datosIniciales?: any;
}

export interface TramiteResponseDTO {
  id: string;
  codigoTramite: string;
  nombrePolitica: string;
  idPolitica: string;
  idUsuarioSolicitante: string;
  estadoActual: string;
  nodoActualId: string;
  nombreNodoActual?: string;
  departamentoActualId: string;
  nombreDepartamentoActual?: string;
  prioridad: number;
  createdAt: string;
}
