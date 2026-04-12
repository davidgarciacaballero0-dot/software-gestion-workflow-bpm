export interface StartProcedureRequestDTO {
  idPolitica: string;
  idUsuarioSolicitante: string;
  datosIniciales?: any;
}

export interface TramiteResponseDTO {
  id: string;
  codigoTramite: string;
  nombrePolitica: string;
  estadoActual: string;
  nodoActualId: string;
  departamentoActualId: string;
  createdAt: string;
}
