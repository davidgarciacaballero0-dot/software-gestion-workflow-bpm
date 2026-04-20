package com.bpm.domain.services;

import com.bpm.app.dto.AvanzarTramiteRequestDTO;
import com.bpm.app.dto.IntervencionRequestDTO;
import com.bpm.app.dto.StartProcedureRequestDTO;
import com.bpm.app.dto.TramiteResponseDTO;
import com.bpm.app.exceptions.WorkflowValidationException;
import com.bpm.data.entities.EventoHistorial;
import com.bpm.data.entities.PoliticaWorkflow;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.entities.embedded.Condition;
import com.bpm.data.entities.embedded.WorkflowEdge;
import com.bpm.data.entities.embedded.WorkflowNode;
import com.bpm.data.entities.enums.NodeType;
import com.bpm.data.entities.enums.PolicyStatus;
import com.bpm.data.entities.enums.TipoEvento;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.EventoHistorialRepository;
import com.bpm.data.repositories.PoliticaWorkflowRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TramiteService {

    private final TramiteInstanciaRepository tramiteRepository;
    private final PoliticaWorkflowRepository politicaRepository;
    private final DepartamentoRepository departamentoRepository;
    private final SequenceGeneratorService sequenceGenerator;
    private final NotificationService notificationService;
    private final EventoHistorialRepository historialRepository;

    @Autowired
    public TramiteService(TramiteInstanciaRepository tramiteRepository,
                          PoliticaWorkflowRepository politicaRepository,
                          DepartamentoRepository departamentoRepository,
                          SequenceGeneratorService sequenceGenerator,
                          NotificationService notificationService,
                          EventoHistorialRepository historialRepository) {
        this.tramiteRepository = tramiteRepository;
        this.politicaRepository = politicaRepository;
        this.departamentoRepository = departamentoRepository;
        this.sequenceGenerator = sequenceGenerator;
        this.notificationService = notificationService;
        this.historialRepository = historialRepository;
    }

    public TramiteResponseDTO iniciarTramite(StartProcedureRequestDTO request) {
        PoliticaWorkflow politica = politicaRepository.findById(request.getIdPolitica())
                .orElseThrow(() -> new WorkflowValidationException("Política no encontrada con ID: " + request.getIdPolitica()));

        if (politica.getStatus() != PolicyStatus.PUBLISHED) {
            throw new WorkflowValidationException("Solo se pueden iniciar trámites de políticas en estado PUBLISHED.");
        }

        WorkflowNode startNode = politica.getNodes().stream()
                .filter(n -> n.getType() == NodeType.START)
                .findFirst()
                .orElseThrow(() -> new WorkflowValidationException("La política no tiene un nodo de INICIO válido."));

        WorkflowEdge startingEdge = politica.getEdges().stream()
                .filter(e -> e.getSourceNodeId().equals(startNode.getId()))
                .findFirst()
                .orElseThrow(() -> new WorkflowValidationException("El nodo INICIO no tiene conexiones salientes."));

        WorkflowNode firstOpNode = politica.getNodes().stream()
                .filter(n -> n.getId().equals(startingEdge.getTargetNodeId()))
                .findFirst()
                .orElseThrow(() -> new WorkflowValidationException("El primer nodo operativo no pudo ser encontrado."));

        if (firstOpNode.getType() != NodeType.USER_TASK) {
            throw new WorkflowValidationException("El primer nodo después del INICIO debe ser una USER_TASK para ser instanciado.");
        }

        long seqNum = sequenceGenerator.generateSequence("tramite_seq");
        int year = Calendar.getInstance().get(Calendar.YEAR);
        String code = String.format("TRM-%d-%04d", year, seqNum);

        TramiteInstancia instancia = TramiteInstancia.builder()
                .codigoTramite(code)
                .idPolitica(politica.getId())
                .idUsuarioSolicitante(request.getIdUsuarioSolicitante())
                .estadoActual("EN_PROGRESO")
                .nodoActualId(firstOpNode.getId())
                .departamentoActualId(firstOpNode.getDepartmentId())
                .prioridad(request.getPrioridad() != null ? request.getPrioridad() : 2) // Default priority 2 (Normal)
                .datosAcumuladosFormulario(request.getDatosIniciales() != null ? request.getDatosIniciales() : new HashMap<>())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        TramiteInstancia guardado = tramiteRepository.save(instancia);

        // CU-10: Registrar evento de creación en la Bitácora
        registrarEvento(guardado, null, firstOpNode.getId(),
                request.getIdUsuarioSolicitante(), TipoEvento.CREACION, null,
                guardado.getDatosAcumuladosFormulario());

        notificationService.notificarDepartamento(
                guardado.getDepartamentoActualId(),
                "Nuevo Trámite Asignado",
                "Se ha recibido el trámite " + guardado.getCodigoTramite() + " para su revisión."
        );

        return mapearADTO(guardado, politica.getNombre());
    }

    public TramiteResponseDTO mapearADTO(TramiteInstancia instancia, String nombrePolitica) {
        String nombreDept = "N/A";
        if (instancia.getDepartamentoActualId() != null) {
            nombreDept = departamentoRepository.findById(instancia.getDepartamentoActualId())
                    .map(d -> d.getNombre())
                    .orElse("Desconocido");
        }

        String nombreNodo = "N/A";
        if (instancia.getNodoActualId() != null) {
            Optional<PoliticaWorkflow> polOpt = politicaRepository.findById(instancia.getIdPolitica());
            if (polOpt.isPresent() && polOpt.get().getNodes() != null) {
                nombreNodo = polOpt.get().getNodes().stream()
                        .filter(n -> n.getId().equals(instancia.getNodoActualId()))
                        .map(n -> n.getName())
                        .findFirst()
                        .orElse(instancia.getNodoActualId());
            }
        }

        return TramiteResponseDTO.builder()
                .id(instancia.getId())
                .codigoTramite(instancia.getCodigoTramite())
                .idPolitica(instancia.getIdPolitica())
                .idUsuarioSolicitante(instancia.getIdUsuarioSolicitante())
                .nombrePolitica(nombrePolitica != null ? nombrePolitica : "Sin definir")
                .estadoActual(instancia.getEstadoActual())
                .nodoActualId(instancia.getNodoActualId())
                .nombreNodoActual(nombreNodo)
                .departamentoActualId(instancia.getDepartamentoActualId())
                .nombreDepartamentoActual(nombreDept)
                .prioridad(instancia.getPrioridad())
                .datosAcumuladosFormulario(instancia.getDatosAcumuladosFormulario())
                .createdAt(instancia.getCreatedAt())
                .build();
    }

    // ========================================================================================
    // CU-09: MOTOR DE AVANCE — El cerebro del BPM
    // ========================================================================================

    public TramiteResponseDTO avanzarTramite(AvanzarTramiteRequestDTO request) {
        TramiteInstancia instancia = tramiteRepository.findById(request.getIdTramite())
                .orElseThrow(() -> new WorkflowValidationException("Trámite no encontrado: " + request.getIdTramite()));

        if ("FINALIZADO".equals(instancia.getEstadoActual())) {
            throw new WorkflowValidationException("El trámite ya fue finalizado. No se puede avanzar.");
        }

        PoliticaWorkflow politica = politicaRepository.findById(instancia.getIdPolitica())
                .orElseThrow(() -> new WorkflowValidationException("Política asociada no encontrada."));

        // 1. Acumular datos del formulario
        if (request.getDatosFormulario() != null) {
            if (instancia.getDatosAcumuladosFormulario() == null) {
                instancia.setDatosAcumuladosFormulario(new HashMap<>());
            }
            instancia.getDatosAcumuladosFormulario().putAll(request.getDatosFormulario());
        }

        // 2. Identificar el nodo actual
        WorkflowNode nodoActual = findNodeById(politica, instancia.getNodoActualId());

        // 3. Resolver el siguiente nodo de parada (USER_TASK o END)
        WorkflowNode nextStopNode = resolverSiguienteNodoDeParada(
                politica, nodoActual, instancia.getDatosAcumuladosFormulario()
        );

        // 4. Actualizar la instancia según el nodo destino
        if (nextStopNode.getType() == NodeType.END) {
            instancia.setEstadoActual("FINALIZADO");
            instancia.setNodoActualId(nextStopNode.getId());
            // Se elimina la asignación de departamento a null para preservar el histórico en base de datos.
        } else {
            instancia.setNodoActualId(nextStopNode.getId());
            instancia.setDepartamentoActualId(nextStopNode.getDepartmentId());
        }

        instancia.setUpdatedAt(LocalDateTime.now());
        TramiteInstancia guardado = tramiteRepository.save(instancia);

        // CU-10: Registrar evento de avance o finalización en la Bitácora
        TipoEvento tipo = nextStopNode.getType() == NodeType.END ? TipoEvento.FINALIZACION : TipoEvento.AVANCE;
        registrarEvento(guardado, nodoActual.getId(), nextStopNode.getId(),
                request.getIdUsuarioAccion(), tipo, null,
                instancia.getDatosAcumuladosFormulario());

        // 5. Notificar en tiempo real
        if (nextStopNode.getType() == NodeType.USER_TASK && nextStopNode.getDepartmentId() != null) {
            notificationService.notificarDepartamento(
                    nextStopNode.getDepartmentId(),
                    "Trámite en Tránsito",
                    "El trámite " + guardado.getCodigoTramite() + " ha avanzado a: " + nextStopNode.getName()
            );
        }

        return mapearADTO(guardado, politica.getNombre());
    }

    // ========================================================================================
    // MOTOR DE NAVEGACIÓN: Resuelve gateways recursivamente hasta un punto de parada
    // ========================================================================================

    private WorkflowNode resolverSiguienteNodoDeParada(PoliticaWorkflow politica, WorkflowNode nodoActual,
                                                        Map<String, Object> datosAcumulados) {
        // Encontrar edges salientes del nodo actual
        List<WorkflowEdge> edgesSalientes = politica.getEdges().stream()
                .filter(e -> e.getSourceNodeId().equals(nodoActual.getId()))
                .toList();

        if (edgesSalientes.isEmpty()) {
            throw new WorkflowValidationException(
                    "El nodo '" + nodoActual.getName() + "' no tiene conexiones salientes. Flujo roto.");
        }

        // Si solo hay un camino, tomarlo directamente
        WorkflowEdge edgeElegido;
        if (edgesSalientes.size() == 1) {
            edgeElegido = edgesSalientes.get(0);
        } else {
            // Múltiples caminos: evaluar condiciones (Gateway)
            edgeElegido = edgesSalientes.stream()
                    .filter(e -> e.getCondition() != null && evaluarCondicion(e.getCondition(), datosAcumulados))
                    .findFirst()
                    .orElseThrow(() -> new WorkflowValidationException(
                            "Ninguna condición del Gateway '" + nodoActual.getName() + "' se cumplió con los datos proporcionados."));
        }

        // Resolver el nodo destino
        WorkflowNode nextNode = findNodeById(politica, edgeElegido.getTargetNodeId());

        // Si es USER_TASK o END, es un punto de parada
        if (nextNode.getType() == NodeType.USER_TASK || nextNode.getType() == NodeType.END) {
            return nextNode;
        }

        // Si es un GATEWAY, resolver recursivamente
        if (nextNode.getType() == NodeType.EXCLUSIVE_GATEWAY) {
            return resolverSiguienteNodoDeParada(politica, nextNode, datosAcumulados);
        }

        throw new WorkflowValidationException("Tipo de nodo no soportado para navegación: " + nextNode.getType());
    }

    // ========================================================================================
    // EVALUADOR DE CONDICIONES: Compara variables del formulario
    // ========================================================================================

    private boolean evaluarCondicion(Condition condition, Map<String, Object> datos) {
        Object valorVariable = datos.get(condition.getVariable());
        if (valorVariable == null) return false;

        String valorActual = String.valueOf(valorVariable);
        String valorEsperado = condition.getValue();

        return switch (condition.getOperator()) {
            case EQUALS -> valorActual.equalsIgnoreCase(valorEsperado);
            case NOT_EQUALS -> !valorActual.equalsIgnoreCase(valorEsperado);
            case GREATER_THAN -> {
                try { yield Double.parseDouble(valorActual) > Double.parseDouble(valorEsperado); }
                catch (NumberFormatException e) { yield false; }
            }
            case LESS_THAN -> {
                try { yield Double.parseDouble(valorActual) < Double.parseDouble(valorEsperado); }
                catch (NumberFormatException e) { yield false; }
            }
        };
    }

    // ========================================================================================
    // UTILIDADES
    // ========================================================================================

    private WorkflowNode findNodeById(PoliticaWorkflow politica, String nodeId) {
        return politica.getNodes().stream()
                .filter(n -> n.getId().equals(nodeId))
                .findFirst()
                .orElseThrow(() -> new WorkflowValidationException("Nodo no encontrado: " + nodeId));
    }

    public TramiteInstancia obtenerTramitePorId(String id) {
        return tramiteRepository.findById(id)
                .orElseThrow(() -> new WorkflowValidationException("Trámite no encontrado: " + id));
    }

    public List<TramiteResponseDTO> listarBandejaDepartamento(String departamentoId) {
        return tramiteRepository.findByDepartamentoActualId(departamentoId).stream()
                .map(this::transformarADTO)
                .collect(Collectors.toList());
    }

    public List<TramiteResponseDTO> listarBandejaPersonal(String usuarioId) {
        return tramiteRepository.findByIdUsuarioSolicitante(usuarioId).stream()
                .map(this::transformarADTO)
                .collect(Collectors.toList());
    }

    // ========================================================================================
    // CU-20: SUPERVISIÓN DE JEFATURA — Vista de carga departamental completa
    // ========================================================================================

    public List<TramiteResponseDTO> listarSupervisionDepartamento(String departamentoId) {
        // Incluye los FINALIZADOS para que la jefatura vea el histórico completo
        return tramiteRepository.findByDepartamentoActualId(departamentoId).stream()
                .map(this::transformarADTO)
                .collect(Collectors.toList());
    }

    private TramiteResponseDTO transformarADTO(TramiteInstancia t) {
        PoliticaWorkflow p = politicaRepository.findById(t.getIdPolitica()).orElse(null);
        return mapearADTO(t, p != null ? p.getNombre() : "N/A");
    }

    // ========================================================================================
    // CU-21: INTERVENCIÓN ADMINISTRATIVA — Reasignación forzada de trámite
    // ========================================================================================

    public TramiteResponseDTO intervenirTramite(IntervencionRequestDTO request) {
        TramiteInstancia instancia = tramiteRepository.findById(request.getIdTramite())
                .orElseThrow(() -> new WorkflowValidationException("Trámite no encontrado: " + request.getIdTramite()));

        String nodoAnterior = instancia.getNodoActualId();

        // Reasignación forzada: ignora la lógica del grafo
        instancia.setNodoActualId(request.getNuevoNodoId());
        instancia.setDepartamentoActualId(request.getNuevoDepartamentoId());
        instancia.setEstadoActual("EN_PROGRESO");
        instancia.setUpdatedAt(LocalDateTime.now());

        TramiteInstancia guardado = tramiteRepository.save(instancia);

        // Registrar evento de intervención en la Bitácora
        registrarEvento(guardado, nodoAnterior, request.getNuevoNodoId(),
                request.getUsuarioInterventorId(), TipoEvento.INTERVENCION, request.getMotivo(), null);

        // Notificar al nuevo departamento
        if (request.getNuevoDepartamentoId() != null) {
            notificationService.notificarDepartamento(
                    request.getNuevoDepartamentoId(),
                    "Trámite Reasignado (Intervención)",
                    "El trámite " + guardado.getCodigoTramite() + " ha sido reasignado a su departamento por administración."
            );
        }

        PoliticaWorkflow politica = politicaRepository.findById(guardado.getIdPolitica())
                .orElse(null);

        return mapearADTO(guardado, politica != null ? politica.getNombre() : "");
    }

    // ========================================================================================
    // CU-10: HISTORIAL — Consulta de la Bitácora de un Trámite
    // ========================================================================================

    public List<EventoHistorial> listarHistorial(String idTramite) {
        return historialRepository.findByIdTramite(idTramite);
    }

    // ========================================================================================
    // HELPER PRIVADO: Registrar Evento en Bitácora
    // ========================================================================================

    private void registrarEvento(TramiteInstancia tramite, String nodoOrigen, String nodoDestino,
                                  String usuarioId, TipoEvento tipo, String motivo,
                                  Map<String, Object> snapshot) {
        EventoHistorial evento = EventoHistorial.builder()
                .idTramite(tramite.getId())
                .nodoOrigenId(nodoOrigen)
                .nodoDestinoId(nodoDestino)
                .ejecutadoPorUsuarioId(usuarioId)
                .tipoEvento(tipo)
                .motivo(motivo)
                .snapshotDatos(snapshot)
                .build();
        historialRepository.save(evento);
    }
}
