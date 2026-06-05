package com.bpm.domain.services;

import com.bpm.app.dto.AvanzarTramiteRequestDTO;
import com.bpm.app.dto.IntervencionRequestDTO;
import com.bpm.app.dto.StartProcedureRequestDTO;
import com.bpm.app.dto.TramiteResponseDTO;
import com.bpm.app.exceptions.WorkflowValidationException;
import com.bpm.data.entities.EventoHistorial;
import com.bpm.data.entities.PoliticaWorkflow;
import com.bpm.data.entities.Rol;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.entities.Usuario;
import com.bpm.data.entities.embedded.Condition;
import com.bpm.data.entities.embedded.WorkflowEdge;
import com.bpm.data.entities.embedded.WorkflowNode;
import com.bpm.data.entities.enums.NodeType;
import com.bpm.data.entities.enums.PolicyStatus;
import com.bpm.data.entities.enums.TipoEvento;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.EventoHistorialRepository;
import com.bpm.data.repositories.PoliticaWorkflowRepository;
import com.bpm.data.repositories.RolRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import com.bpm.data.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
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
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ia.service.url:http://localhost:8000/ia}")
    private String IA_URL;

    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        return new RestTemplate(factory);
    }

    @Autowired
    public TramiteService(TramiteInstanciaRepository tramiteRepository,
            PoliticaWorkflowRepository politicaRepository,
            DepartamentoRepository departamentoRepository,
            SequenceGeneratorService sequenceGenerator,
            NotificationService notificationService,
            EventoHistorialRepository historialRepository,
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            PasswordEncoder passwordEncoder) {
        this.tramiteRepository = tramiteRepository;
        this.politicaRepository = politicaRepository;
        this.departamentoRepository = departamentoRepository;
        this.sequenceGenerator = sequenceGenerator;
        this.notificationService = notificationService;
        this.historialRepository = historialRepository;
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public TramiteResponseDTO iniciarTramite(StartProcedureRequestDTO request) {
        PoliticaWorkflow politica = politicaRepository.findById(request.getIdPolitica())
                .orElseThrow(() -> new WorkflowValidationException(
                        "Política no encontrada con ID: " + request.getIdPolitica()));

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
            throw new WorkflowValidationException(
                    "El primer nodo después del INICIO debe ser una USER_TASK para ser instanciado.");
        }

        long seqNum = sequenceGenerator.generateSequence("tramite_seq");
        int year = Calendar.getInstance().get(Calendar.YEAR);
        String code = String.format("TRM-%d-%04d", year, seqNum);

        // --- REQ: Auto-registro de Usuario Solicitante y Detección de Iniciador ---
        Usuario iniciador = null;
        if (request.getIdUsuarioSolicitante() != null && !request.getIdUsuarioSolicitante().isEmpty()) {
            iniciador = usuarioRepository.findById(request.getIdUsuarioSolicitante()).orElse(null);
        }

        // Determinar si el iniciador es Funcionario (tiene departamento)
        boolean esFuncionarioIniciador = iniciador != null && iniciador.getIdDepartamento() != null;
        
        Usuario solicitante = null;
        String ciParaSolicitante = null;

        // Extraer CI del cliente desde los datos iniciales (proporcionado por el funcionario)
        if (request.getDatosIniciales() != null) {
            ciParaSolicitante = (String) request.getDatosIniciales().get("f_ci");
            if (ciParaSolicitante == null) ciParaSolicitante = (String) request.getDatosIniciales().get("ci");
        }

        if (esFuncionarioIniciador && ciParaSolicitante != null) {
            // El funcionario está registrando a un cliente
            solicitante = usuarioRepository.findByCi(ciParaSolicitante).orElse(null);
            if (solicitante == null) {
                solicitante = autoRegistrarUsuario(request.getDatosIniciales(), ciParaSolicitante);
            }
        } else {
            // Es un cliente iniciando su propio trámite (o no se proporcionó CI de tercero)
            solicitante = iniciador;
        }

        String ci = (solicitante != null) ? solicitante.getCi() : "";
        String nombreCompleto = (solicitante != null) ? (solicitante.getNombre() + " " + solicitante.getApellidos())
                : "Cliente Externo";
        String idSolicitante = (solicitante != null) ? solicitante.getId() : request.getIdUsuarioSolicitante();

        TramiteInstancia instancia = TramiteInstancia.builder()
                .id(request.getId()) // CU-23: Usar UUID generado en frontend si existe (creación offline)
                .codigoTramite(code)
                .idPolitica(politica.getId())
                .idUsuarioSolicitante(idSolicitante)
                .ciSolicitante(ci)
                .nombreSolicitante(nombreCompleto)
                .estadoActual("EN_PROGRESO")
                .nodoActualId(firstOpNode.getId())
                .departamentoActualId(firstOpNode.getDepartmentId())
                .nodosActualesIds(List.of(firstOpNode.getId()))
                .departamentosActualesIds(List.of(firstOpNode.getDepartmentId()))
                .funcionarioAsignadoId((esFuncionarioIniciador && iniciador != null) ? iniciador.getId() : null) // Auto-asignación si es funcionario
                .prioridad(request.getPrioridad() != null ? request.getPrioridad() : 2)
                .datosAcumuladosFormulario(
                        request.getDatosIniciales() != null ? request.getDatosIniciales() : new HashMap<>())
                .fechaInicioNodoActual(LocalDateTime.now())
                .fechaVencimientoSla(firstOpNode.getSlaHours() != null ? LocalDateTime.now().plusHours(firstOpNode.getSlaHours()) : null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        evaluarDocumentacionDinamica(instancia, politica);
        TramiteInstancia guardado = tramiteRepository.save(instancia);

        // CU-10: Registrar evento de creación en la Bitácora
        registrarEvento(guardado, null, firstOpNode.getId(),
                request.getIdUsuarioSolicitante(), TipoEvento.CREACION, null,
                guardado.getDatosAcumuladosFormulario(), false, null);

        notificationService.notificarDepartamento(
                guardado.getDepartamentoActualId(),
                "Nuevo Trámite Asignado",
                "Se ha recibido el trámite " + guardado.getCodigoTramite() + " para su revisión.");

        return mapearADTO(guardado, politica.getNombre());
    }

    public TramiteResponseDTO mapearADTO(TramiteInstancia instancia, String nombrePolitica) {
        // Inicializar listas en la instancia si son nulas o vacías
        if (instancia.getNodosActualesIds() == null || instancia.getNodosActualesIds().isEmpty()) {
            if (instancia.getNodoActualId() != null) {
                instancia.setNodosActualesIds(new java.util.ArrayList<>(List.of(instancia.getNodoActualId())));
            } else {
                instancia.setNodosActualesIds(new java.util.ArrayList<>());
            }
        }
        if (instancia.getDepartamentosActualesIds() == null || instancia.getDepartamentosActualesIds().isEmpty()) {
            if (instancia.getDepartamentoActualId() != null) {
                instancia.setDepartamentosActualesIds(new java.util.ArrayList<>(List.of(instancia.getDepartamentoActualId())));
            } else {
                instancia.setDepartamentosActualesIds(new java.util.ArrayList<>());
            }
        }

        // Obtener nombres de departamentos
        List<String> nombresDepts = new java.util.ArrayList<>();
        for (String depId : instancia.getDepartamentosActualesIds()) {
            if (depId != null) {
                String name = departamentoRepository.findById(depId)
                        .map(d -> d.getNombre())
                        .orElse("Desconocido");
                nombresDepts.add(name);
            }
        }

        // Obtener nombres de nodos
        List<String> nombresNodos = new java.util.ArrayList<>();
        Optional<PoliticaWorkflow> polOpt = politicaRepository.findById(instancia.getIdPolitica());
        for (String nId : instancia.getNodosActualesIds()) {
            String name = nId;
            if (polOpt.isPresent() && polOpt.get().getNodes() != null) {
                name = polOpt.get().getNodes().stream()
                        .filter(n -> n.getId().equals(nId))
                        .map(n -> n.getName())
                        .findFirst()
                        .orElse(nId);
            }
            nombresNodos.add(name);
        }

        String nombreDept = nombresDepts.isEmpty() ? "N/A" : nombresDepts.get(0);
        String nombreNodo = nombresNodos.isEmpty() ? "N/A" : nombresNodos.get(0);

        return TramiteResponseDTO.builder()
                .id(instancia.getId())
                .codigoTramite(instancia.getCodigoTramite())
                .idPolitica(instancia.getIdPolitica())
                .idUsuarioSolicitante(instancia.getIdUsuarioSolicitante())
                .ciSolicitante(instancia.getCiSolicitante())
                .nombreSolicitante(instancia.getNombreSolicitante())
                .funcionarioAsignadoId(instancia.getFuncionarioAsignadoId())
                .nombrePolitica(nombrePolitica != null ? nombrePolitica : "Sin definir")
                .estadoActual(instancia.getEstadoActual())
                .nodoActualId(instancia.getNodoActualId())
                .nombreNodoActual(nombreNodo)
                .departamentoActualId(instancia.getDepartamentoActualId())
                .nombreDepartamentoActual(nombreDept)
                .nodosActualesIds(instancia.getNodosActualesIds())
                .departamentosActualesIds(instancia.getDepartamentosActualesIds())
                .nombresNodosActuales(nombresNodos)
                .nombresDepartamentosActuales(nombresDepts)
                .prioridad(instancia.getPrioridad())
                .dynamicPriority(instancia.getDynamicPriority())
                .esAnomalo(instancia.getEsAnomalo())
                .anomaliaDetalle(instancia.getAnomaliaDetalle())
                .datosAcumuladosFormulario(instancia.getDatosAcumuladosFormulario())
                .archivosAdjuntos(instancia.getArchivosAdjuntos())
                .documentosDinamicosRequeridos(instancia.getDocumentosDinamicosRequeridos())
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

        // === NUEVO CANDADO DE SEGURIDAD: Segmentación por Departamento ===
        if (request.getIdUsuarioAccion() != null && !request.getIdUsuarioAccion().isEmpty()) {
            Usuario usuarioEjecutor = usuarioRepository.findById(request.getIdUsuarioAccion()).orElse(null);
            if (usuarioEjecutor != null && usuarioEjecutor.getIdDepartamento() != null && !usuarioEjecutor.getIdDepartamento().isEmpty()) {
                // Si el usuario pertenece a un departamento, debe coincidir con alguno de los departamentos actuales del trámite
                if (instancia.getDepartamentosActualesIds() != null && !instancia.getDepartamentosActualesIds().isEmpty()) {
                    if (!instancia.getDepartamentosActualesIds().contains(usuarioEjecutor.getIdDepartamento())) {
                        throw new WorkflowValidationException("Acceso Denegado: Este trámite se encuentra en otra área. Solo funcionarios del departamento correspondiente pueden avanzar el proceso.");
                    }
                } else if (instancia.getDepartamentoActualId() != null && !instancia.getDepartamentoActualId().equals(usuarioEjecutor.getIdDepartamento())) {
                    throw new WorkflowValidationException("Acceso Denegado: Este trámite se encuentra en otra área. Solo funcionarios del departamento correspondiente pueden avanzar el proceso.");
                }
            }
        }
        // =================================================================

        // 1. Acumular datos del formulario
        if (request.getDatosFormulario() != null) {
            if (instancia.getDatosAcumuladosFormulario() == null) {
                instancia.setDatosAcumuladosFormulario(new HashMap<>());
            }
            instancia.getDatosAcumuladosFormulario().putAll(request.getDatosFormulario());
        }

        // 2. Identificar el nodo de origen que se está completando
        String nodoOrigenId = request.getNodoActualId();
        if (nodoOrigenId == null || nodoOrigenId.isEmpty()) {
            if (instancia.getNodosActualesIds() != null && !instancia.getNodosActualesIds().isEmpty()) {
                if (instancia.getNodosActualesIds().size() == 1) {
                    nodoOrigenId = instancia.getNodosActualesIds().get(0);
                } else if (request.getIdUsuarioAccion() != null && !request.getIdUsuarioAccion().isEmpty()) {
                    Usuario usuarioEjecutor = usuarioRepository.findById(request.getIdUsuarioAccion()).orElse(null);
                    if (usuarioEjecutor != null && usuarioEjecutor.getIdDepartamento() != null) {
                        final String userDepId = usuarioEjecutor.getIdDepartamento();
                        nodoOrigenId = instancia.getNodosActualesIds().stream()
                                .map(id -> findNodeById(politica, id))
                                .filter(n -> userDepId.equals(n.getDepartmentId()))
                                .map(WorkflowNode::getId)
                                .findFirst()
                                .orElse(instancia.getNodosActualesIds().get(0));
                    } else {
                        nodoOrigenId = instancia.getNodosActualesIds().get(0);
                    }
                } else {
                    nodoOrigenId = instancia.getNodosActualesIds().get(0);
                }
            } else {
                nodoOrigenId = instancia.getNodoActualId();
            }
        }

        if (nodoOrigenId == null) {
            throw new WorkflowValidationException("No se pudo determinar el nodo de origen para avanzar.");
        }

        final String finalNodoOrigenId = nodoOrigenId;
        WorkflowNode nodoOrigen = findNodeById(politica, finalNodoOrigenId);

        // 3. Evaluar SLA del nodo completado
        boolean excedioSla = false;
        if (instancia.getFechaVencimientoSla() != null) {
            excedioSla = LocalDateTime.now().isAfter(instancia.getFechaVencimientoSla());
        }
        LocalDateTime oldSlaVencimiento = instancia.getFechaVencimientoSla();

        // 4. Cargar y actualizar los tokens activos de la instancia
        if (instancia.getNodosActualesIds() == null || instancia.getNodosActualesIds().isEmpty()) {
            instancia.setNodosActualesIds(new java.util.ArrayList<>(List.of(instancia.getNodoActualId())));
        }
        if (instancia.getDepartamentosActualesIds() == null || instancia.getDepartamentosActualesIds().isEmpty()) {
            if (instancia.getDepartamentoActualId() != null) {
                instancia.setDepartamentosActualesIds(new java.util.ArrayList<>(List.of(instancia.getDepartamentoActualId())));
            } else {
                instancia.setDepartamentosActualesIds(new java.util.ArrayList<>());
            }
        }

        java.util.List<String> activeNodes = new java.util.ArrayList<>(instancia.getNodosActualesIds());
        activeNodes.remove(finalNodoOrigenId);

        java.util.List<String> activeDepts = new java.util.ArrayList<>();

        // Encontrar conexiones salientes del nodo origen completado
        List<WorkflowEdge> outgoing = politica.getEdges().stream()
                .filter(e -> e.getSourceNodeId().equals(finalNodoOrigenId))
                .toList();

        if (outgoing.isEmpty()) {
            throw new WorkflowValidationException("El paso '" + nodoOrigen.getName() + "' no tiene conexiones salientes.");
        }

        // Si hay un solo camino, tomarlo; si no, evaluar condiciones (Gateway)
        WorkflowEdge edgeElegido;
        if (outgoing.size() == 1) {
            edgeElegido = outgoing.get(0);
        } else {
            edgeElegido = outgoing.stream()
                    .filter(e -> e.getCondition() != null && evaluarCondicion(e.getCondition(), instancia.getDatosAcumuladosFormulario()))
                    .findFirst()
                    .orElse(null);
            if (edgeElegido == null) {
                edgeElegido = outgoing.stream()
                        .filter(e -> e.getCondition() == null)
                        .findFirst()
                        .orElse(outgoing.get(0));
            }
        }

        WorkflowNode nextStopNode = findNodeById(politica, edgeElegido.getTargetNodeId());
        
        // Resolver navegación recursiva sobre gateways hasta puntos de parada (USER_TASK o END)
        resolverNavegacionParalela(politica, nextStopNode, instancia.getDatosAcumuladosFormulario(), activeNodes, activeDepts);

        // Reconstruir lista de departamentos basada en todos los nodos activos actuales
        activeDepts.clear();
        String endNodeId = null;
        java.util.List<String> nodesToRemove = new java.util.ArrayList<>();

        for (String activeId : activeNodes) {
            WorkflowNode n = findNodeById(politica, activeId);
            if (n.getType() == NodeType.USER_TASK) {
                activeDepts.add(n.getDepartmentId() != null ? n.getDepartmentId() : "");
            } else if (n.getType() == NodeType.END) {
                endNodeId = n.getId();
                nodesToRemove.add(activeId);
            }
        }
        
        // Remover del pool de tokens activos los que correspondan al fin del flujo
        activeNodes.removeAll(nodesToRemove);

        // 5. Actualizar la instancia según los tokens resultantes
        if (activeNodes.isEmpty()) {
            // Todos los hilos del proceso han concluido
            instancia.setEstadoActual("FINALIZADO");
            instancia.setNodoActualId(endNodeId != null ? endNodeId : finalNodoOrigenId);
            instancia.setDepartamentoActualId(null);
            instancia.setFechaVencimientoSla(null);
            instancia.setFuncionarioAsignadoId(null);
            instancia.setNodosActualesIds(new java.util.ArrayList<>());
            instancia.setDepartamentosActualesIds(new java.util.ArrayList<>());
        } else {
            // Quedan hilos activos (o se crearon nuevos por bifurcación fork)
            instancia.setNodosActualesIds(activeNodes);
            instancia.setDepartamentosActualesIds(activeDepts);
            
            // Sincronizar campos legacy de base
            instancia.setNodoActualId(activeNodes.get(0));
            instancia.setDepartamentoActualId(activeDepts.isEmpty() ? null : activeDepts.get(0));
            
            instancia.setFechaInicioNodoActual(LocalDateTime.now());
            
            // SLA: Tomar el primer nodo activo como referencia para el SLA
            WorkflowNode primerNodoActivo = findNodeById(politica, activeNodes.get(0));
            instancia.setFechaVencimientoSla(primerNodoActivo.getSlaHours() != null ? 
                LocalDateTime.now().plusHours(primerNodoActivo.getSlaHours()) : null);
            
            // Liberar asignación de funcionario si cambia de área
            if (primerNodoActivo.getDepartmentId() != null && !primerNodoActivo.getDepartmentId().equals(instancia.getDepartamentoActualId())) {
                instancia.setFuncionarioAsignadoId(null);
            }
        }

        instancia.setUpdatedAt(LocalDateTime.now());
        
        // Evaluar requerimientos documentales dinámicos antes de guardar
        evaluarDocumentacionDinamica(instancia, politica);
        
        TramiteInstancia guardado = tramiteRepository.save(instancia);

        // Registrar evento de avance/finalización en la Bitácora
        TipoEvento tipo = activeNodes.isEmpty() ? TipoEvento.FINALIZACION : TipoEvento.AVANCE;
        registrarEvento(guardado, finalNodoOrigenId, nextStopNode.getId(),
                request.getIdUsuarioAccion(), tipo, null,
                instancia.getDatosAcumuladosFormulario(), excedioSla, oldSlaVencimiento);

        // Notificaciones en tiempo real para todos los departamentos que ahora tengan tareas
        for (String depId : activeDepts) {
            if (depId != null && !depId.isEmpty()) {
                notificationService.notificarDepartamento(
                        depId,
                        "Trámite en Tránsito",
                        "El trámite " + guardado.getCodigoTramite() + " tiene tareas asignadas a su departamento.");
            }
        }

        // Evaluar autotransición automática
        if (!activeNodes.isEmpty()) {
            guardado = evaluarYEjecutarAutotransicion(guardado, politica);
        }

        return mapearADTO(guardado, politica.getNombre());
    }

    // ========================================================================================
    // MOTOR DE NAVEGACIÓN: Resuelve gateways recursivamente hasta un punto de
    // parada
    // ========================================================================================



    // ========================================================================================
    // EVALUADOR DE CONDICIONES: Compara variables del formulario
    // ========================================================================================

    private boolean evaluarCondicion(Condition condition, Map<String, Object> datos) {
        Object valorVariable = datos.get(condition.getVariable());
        if (valorVariable == null)
            return false;

        String valorActual = String.valueOf(valorVariable);
        String valorEsperado = condition.getValue();

        return switch (condition.getOperator()) {
            case EQUALS -> valorActual.equalsIgnoreCase(valorEsperado);
            case NOT_EQUALS -> !valorActual.equalsIgnoreCase(valorEsperado);
            case GREATER_THAN -> {
                try {
                    yield Double.parseDouble(valorActual) > Double.parseDouble(valorEsperado);
                } catch (NumberFormatException e) {
                    yield false;
                }
            }
            case LESS_THAN -> {
                try {
                    yield Double.parseDouble(valorActual) < Double.parseDouble(valorEsperado);
                } catch (NumberFormatException e) {
                    yield false;
                }
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

    private Usuario autoRegistrarUsuario(Map<String, Object> datos, String ci) {
        String nombre = (String) datos.getOrDefault("f_nombre", datos.getOrDefault("nombre", "Usuario"));
        String apellidos = (String) datos.getOrDefault("f_apellidos", datos.getOrDefault("apellidos", "Nuevo"));
        String email = (String) datos.getOrDefault("f_email", datos.getOrDefault("email", null));
        if (email == null || email.isEmpty()) {
            email = "cliente." + ci + "@bpm.local"; // Email generado por sistema
        }
        String celular = (String) datos.getOrDefault("f_celular", datos.getOrDefault("celular", "00000000"));

        // Lógica de Password: iniciales + "." + CI
        String iniciales = "";
        if (nombre.length() > 0)
            iniciales += nombre.substring(0, 1).toLowerCase();
        if (apellidos.length() > 0)
            iniciales += apellidos.substring(0, 1).toLowerCase();
        String rawPassword = iniciales + "." + ci;

        // Buscar Rol CLIENTE
        String idRolCliente = rolRepository.findByNombre("CLIENTE").stream()
                .findFirst()
                .map(Rol::getId)
                .orElse(null);

        Usuario nuevo = Usuario.builder()
                .nombre(nombre)
                .apellidos(apellidos)
                .ci(ci)
                .email(email)
                .celular(celular)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .idRol(idRolCliente)
                .createdAt(LocalDateTime.now())
                .build();

        return usuarioRepository.save(nuevo);
    }

    public TramiteInstancia obtenerTramitePorId(String id) {
        TramiteInstancia tramite = tramiteRepository.findById(id)
                .orElseThrow(() -> new WorkflowValidationException("Trámite no encontrado: " + id));
        if (tramite.getVersion() == null) {
            tramite.setVersion(1L);
        }
        return tramite;
    }

    public TramiteResponseDTO asignarFuncionario(String tramiteId, String funcionarioId) {
        TramiteInstancia tramite = obtenerTramitePorId(tramiteId);
        usuarioRepository.findById(funcionarioId)
                .orElseThrow(() -> new WorkflowValidationException("Funcionario no encontrado"));

        tramite.setFuncionarioAsignadoId(funcionarioId);
        TramiteInstancia guardado = tramiteRepository.save(tramite);

        registrarEvento(guardado, tramite.getNodoActualId(), tramite.getNodoActualId(), 
                funcionarioId, TipoEvento.AVANCE, "Trámite tomado por el funcionario para su atención.", null, false, null);

        return mapearADTO(guardado, obtenerNombrePolitica(guardado.getIdPolitica()));
    }

    public String obtenerNombrePolitica(String idPolitica) {
        if (idPolitica == null) return "Sin definir";
        return politicaRepository.findById(idPolitica)
                .map(PoliticaWorkflow::getNombre)
                .orElse("Sin definir");
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

    public List<TramiteResponseDTO> listarBandejaAsignados(String funcionarioId) {
        return tramiteRepository.findByFuncionarioAsignadoId(funcionarioId).stream()
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

    public List<TramiteResponseDTO> listarSupervisionGlobal() {
        return tramiteRepository.findAll().stream()
                .map(this::transformarADTO)
                .collect(Collectors.toList());
    }

    public List<TramiteResponseDTO> buscarPorCi(String ci) {
        List<TramiteInstancia> resultados = tramiteRepository.findByCiSolicitanteContaining(ci);
        return resultados.stream()
                .map(this::transformarADTO)
                .collect(Collectors.toList());
    }

    private TramiteResponseDTO transformarADTO(TramiteInstancia t) {
        PoliticaWorkflow p = null;
        if (t.getIdPolitica() != null) {
            p = politicaRepository.findById(t.getIdPolitica()).orElse(null);
        }
        return mapearADTO(t, p != null ? p.getNombre() : "N/A");
    }

    // ========================================================================================
    // CU-21: INTERVENCIÓN ADMINISTRATIVA — Reasignación forzada de trámite
    // ========================================================================================

    public TramiteResponseDTO intervenirTramite(IntervencionRequestDTO request) {
        TramiteInstancia instancia = obtenerTramitePorId(request.getIdTramite());

        String nodoAnterior = instancia.getNodoActualId();

        // Reasignación forzada: ignora la lógica del grafo
        instancia.setNodoActualId(request.getNuevoNodoId());
        instancia.setDepartamentoActualId(request.getNuevoDepartamentoId());
        instancia.setEstadoActual("EN_PROGRESO");
        instancia.setUpdatedAt(LocalDateTime.now());

        TramiteInstancia guardado = tramiteRepository.save(instancia);

        // Registrar evento de intervención en la Bitácora
        registrarEvento(guardado, nodoAnterior, request.getNuevoNodoId(),
                request.getUsuarioInterventorId(), TipoEvento.INTERVENCION, request.getMotivo(), null, false, null);

        // Notificar al nuevo departamento
        if (request.getNuevoDepartamentoId() != null) {
            notificationService.notificarDepartamento(
                    request.getNuevoDepartamentoId(),
                    "Trámite Reasignado (Intervención)",
                    "El trámite " + guardado.getCodigoTramite()
                            + " ha sido reasignado a su departamento por administración.");
        }

        PoliticaWorkflow politica = politicaRepository.findById(guardado.getIdPolitica())
                .orElse(null);

        return mapearADTO(guardado, politica != null ? politica.getNombre() : "");
    }

    // ========================================================================================
    // CU-10: HISTORIAL — Consulta de la Bitácora de un Trámite
    // ========================================================================================

    public List<EventoHistorial> listarHistorial(String idTramite) {
        List<EventoHistorial> eventos = historialRepository.findByIdTramite(idTramite);

        // Parche legacy: Si falta el nombre (registros antiguos), intentar resolverlo
        // ahora
        for (EventoHistorial evento : eventos) {
            final String evUsId = evento.getEjecutadoPorUsuarioId();
            if (evento.getEjecutadoPorNombre() == null && evUsId != null) {
                usuarioRepository.findById(evUsId)
                        .ifPresent(u -> {
                            // Si es el cliente que inició el trámite, mostramos su nombre
                            tramiteRepository.findById(idTramite).ifPresent(t -> {
                                if (evUsId.equals(t.getIdUsuarioSolicitante())) {
                                    evento.setEjecutadoPorNombre(
                                            u.getNombre() + " " + (u.getApellidos() != null ? u.getApellidos() : ""));
                                } else {
                                    evento.setEjecutadoPorNombre("Funcionario de Departamento");
                                }
                            });
                        });
            }

            if (evento.getNodoDestinoNombre() == null && evento.getNodoDestinoId() != null) {
                // Buscamos en la política del trámite
                tramiteRepository.findById(idTramite).ifPresent(t -> {
                    politicaRepository.findById(t.getIdPolitica()).ifPresent(p -> {
                        if (p.getNodes() != null) {
                            p.getNodes().stream()
                                    .filter(n -> n.getId().equals(evento.getNodoDestinoId()))
                                    .findFirst()
                                    .ifPresent(n -> evento.setNodoDestinoNombre(n.getName()));
                        }
                    });
                });
            }
        }
        return eventos;
    }

    // ========================================================================================
    // HELPER PRIVADO: Registrar Evento en Bitácora
    // ========================================================================================

    private void registrarEvento(TramiteInstancia tramite, String nodoOrigen, String nodoDestino,
            String usuarioId, TipoEvento tipo, String motivo,
            Map<String, Object> snapshot, boolean excedioSla, LocalDateTime slaVencimiento) {

        String usuarioNombre = "Sistema";
        if (usuarioId != null) {
            final String uId = usuarioId;
            usuarioNombre = usuarioRepository.findById(usuarioId)
                    .map(u -> {
                        // Si es el cliente que inició el trámite, mostramos su nombre
                        if (uId.equals(tramite.getIdUsuarioSolicitante())) {
                            return u.getNombre() + " " + (u.getApellidos() != null ? u.getApellidos() : "");
                        }
                        // Si es un funcionario, solo mostramos el rol o un texto genérico
                        return "Funcionario de Departamento";
                    })
                    .orElse("Usuario");
        }

        String nodoNombre = nodoDestino;
        if (nodoDestino != null) {
            final String nId = nodoDestino;
            nodoNombre = politicaRepository.findById(tramite.getIdPolitica())
                    .map(p -> p.getNodes().stream()
                            .filter(n -> n.getId().equals(nId))
                            .map(n -> n.getName())
                            .findFirst()
                            .orElse(nId))
                    .orElse(nodoDestino);
        }

        EventoHistorial evento = EventoHistorial.builder()
                .idTramite(tramite.getId())
                .nodoOrigenId(nodoOrigen)
                .nodoDestinoId(nodoDestino)
                .nodoDestinoNombre(nodoNombre)
                .ejecutadoPorUsuarioId(usuarioId)
                .ejecutadoPorNombre(usuarioNombre)
                .tipoEvento(tipo)
                .motivo(motivo)
                .snapshotDatos(snapshot)
                .excedioSLA(excedioSla)
                .slaVencimientoEsperado(slaVencimiento)
                .build();
        historialRepository.save(evento);
    }

    private void evaluarDocumentacionDinamica(TramiteInstancia tramite, PoliticaWorkflow politica) {
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("datosFormulario", tramite.getDatosAcumuladosFormulario());
            req.put("descripcionTramite", politica.getNombre() + " - " + politica.getDescription());
            req.put("archivosAdjuntos", tramite.getArchivosAdjuntos() != null ? tramite.getArchivosAdjuntos() : new HashMap<>());

            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            Map<String, Object> iaResponse = restTemplate.postForObject(
                    IA_URL + "/validar-documentacion-dinamica",
                    req,
                    responseType
            );

            if (iaResponse != null && iaResponse.containsKey("documentos_requeridos")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> docs = (List<Map<String, Object>>) iaResponse.get("documentos_requeridos");
                if (docs != null) {
                    tramite.setDocumentosDinamicosRequeridos(docs);
                    System.out.println("✅ CU-27: Auditoría de documentación dinámica completada. Requisitos exigidos: " + docs.size());
                }
            }
        } catch (Exception e) {
            System.err.println("WARN: Fallo en auditoría de documentación dinámica: " + e.getMessage());
        }
    }

    private TramiteInstancia evaluarYEjecutarAutotransicion(TramiteInstancia tramite, PoliticaWorkflow politica) {
        try {
            String currentNodoId = tramite.getNodoActualId();
            if (currentNodoId == null) return tramite;

            WorkflowNode currentNode = findNodeById(politica, currentNodoId);
            if (currentNode == null || currentNode.getType() != NodeType.USER_TASK) return tramite;

            List<WorkflowEdge> outgoing = politica.getEdges().stream()
                    .filter(e -> e.getSourceNodeId().equals(currentNodoId))
                    .toList();

            if (outgoing.isEmpty()) return tramite;

            List<Map<String, Object>> nodosSiguientes = outgoing.stream()
                    .map(e -> {
                        WorkflowNode next = findNodeById(politica, e.getTargetNodeId());
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", next.getId());
                        map.put("name", next.getName());
                        map.put("type", next.getType().toString());
                        return map;
                    })
                    .collect(Collectors.toList());

            List<String> historialSucesos = historialRepository.findByIdTramite(tramite.getId()).stream()
                    .map(e -> String.format("[%s] Tarea '%s' ejecutada por %s", 
                            e.getCreatedAt(), e.getNodoDestinoNombre(), e.getEjecutadoPorNombre()))
                    .collect(Collectors.toList());

            Map<String, Object> req = new HashMap<>();
            req.put("datosFormulario", tramite.getDatosAcumuladosFormulario());
            req.put("nodosSiguientes", nodosSiguientes);
            req.put("historial", historialSucesos);

            @SuppressWarnings("unchecked")
            Class<Map<String, Object>> responseType = (Class<Map<String, Object>>) (Class<?>) Map.class;
            Map<String, Object> iaResponse = restTemplate.postForObject(
                    IA_URL + "/predecir-transicion",
                    req,
                    responseType
            );

            if (iaResponse != null) {
                String nodoRecomendadoId = (String) iaResponse.get("nodo_recomendado_id");
                Double confianza = null;
                Object rawConf = iaResponse.get("confianza");
                if (rawConf instanceof Number) {
                    confianza = ((Number) rawConf).doubleValue();
                }

                String motivo = (String) iaResponse.get("motivo");

                if (nodoRecomendadoId != null && confianza != null && confianza >= 0.90) {
                    System.out.println("⚡ CU-28: Autotransicionando trámite " + tramite.getCodigoTramite() + " con confianza " + confianza);
                    return this.ejecutarAvanceAutomaticoInterno(tramite, currentNodoId, nodoRecomendadoId, motivo, confianza);
                }
            }
        } catch (Exception e) {
            System.err.println("WARN: Fallo en evaluación de autotransición predictiva: " + e.getMessage());
        }
        return tramite;
    }

    private TramiteInstancia ejecutarAvanceAutomaticoInterno(TramiteInstancia tramite, String nodoOrigenId, String nodoDestinoId, String motivo, Double confianza) {
        PoliticaWorkflow politica = politicaRepository.findById(tramite.getIdPolitica())
                .orElseThrow(() -> new WorkflowValidationException("Política asociada no encontrada."));

        WorkflowNode nodoDestino = findNodeById(politica, nodoDestinoId);

        boolean excedioSla = false;
        if (tramite.getFechaVencimientoSla() != null) {
            excedioSla = LocalDateTime.now().isAfter(tramite.getFechaVencimientoSla());
        }
        LocalDateTime oldSlaVencimiento = tramite.getFechaVencimientoSla();

        java.util.List<String> activeNodes = new java.util.ArrayList<>(tramite.getNodosActualesIds() != null ? tramite.getNodosActualesIds() : List.of(nodoOrigenId));
        activeNodes.remove(nodoOrigenId);

        java.util.List<String> activeDepts = new java.util.ArrayList<>();

        // Resolver navegación recursiva
        resolverNavegacionParalela(politica, nodoDestino, tramite.getDatosAcumuladosFormulario(), activeNodes, activeDepts);

        activeDepts.clear();
        String endNodeId = null;
        java.util.List<String> nodesToRemove = new java.util.ArrayList<>();

        for (String activeId : activeNodes) {
            WorkflowNode n = findNodeById(politica, activeId);
            if (n.getType() == NodeType.USER_TASK) {
                activeDepts.add(n.getDepartmentId() != null ? n.getDepartmentId() : "");
            } else if (n.getType() == NodeType.END) {
                endNodeId = n.getId();
                nodesToRemove.add(activeId);
            }
        }
        activeNodes.removeAll(nodesToRemove);

        if (activeNodes.isEmpty()) {
            tramite.setEstadoActual("FINALIZADO");
            tramite.setNodoActualId(endNodeId != null ? endNodeId : nodoDestinoId);
            tramite.setDepartamentoActualId(null);
            tramite.setFechaVencimientoSla(null);
            tramite.setFuncionarioAsignadoId(null);
            tramite.setNodosActualesIds(new java.util.ArrayList<>());
            tramite.setDepartamentosActualesIds(new java.util.ArrayList<>());
        } else {
            tramite.setNodosActualesIds(activeNodes);
            tramite.setDepartamentosActualesIds(activeDepts);
            tramite.setNodoActualId(activeNodes.get(0));
            tramite.setDepartamentoActualId(activeDepts.isEmpty() ? null : activeDepts.get(0));
            tramite.setFechaInicioNodoActual(LocalDateTime.now());
            
            WorkflowNode primerNodoActivo = findNodeById(politica, activeNodes.get(0));
            tramite.setFechaVencimientoSla(primerNodoActivo.getSlaHours() != null ? 
                LocalDateTime.now().plusHours(primerNodoActivo.getSlaHours()) : null);
            
            if (primerNodoActivo.getDepartmentId() != null && !primerNodoActivo.getDepartmentId().equals(tramite.getDepartamentoActualId())) {
                tramite.setFuncionarioAsignadoId(null);
            }
        }

        tramite.setUpdatedAt(LocalDateTime.now());
        
        // Ejecutar también validación documental al cambiar de nodo automáticamente
        evaluarDocumentacionDinamica(tramite, politica);
        
        TramiteInstancia guardado = tramiteRepository.save(tramite);

        String autoMotivo = String.format("Autotransición de IA recomendada (Confianza: %.0f%%). Diagnóstico: %s", confianza * 100, motivo);
        TipoEvento tipo = activeNodes.isEmpty() ? TipoEvento.FINALIZACION : TipoEvento.AVANCE;

        registrarEvento(guardado, nodoOrigenId, nodoDestinoId,
                null, tipo, autoMotivo,
                tramite.getDatosAcumuladosFormulario(), excedioSla, oldSlaVencimiento);

        for (String depId : activeDepts) {
            if (depId != null && !depId.isEmpty()) {
                notificationService.notificarDepartamento(
                        depId,
                        "Trámite Autotransicionado por IA ⚡",
                        "El trámite " + guardado.getCodigoTramite() + " fue avanzado automáticamente por la IA hacia su departamento.");
            }
        }
        return guardado;
    }


    private boolean canReach(PoliticaWorkflow politica, String startNodeId, String targetNodeId) {
        if (startNodeId.equals(targetNodeId)) return true;
        java.util.Set<String> visited = new java.util.HashSet<>();
        java.util.Queue<String> queue = new java.util.LinkedList<>();
        queue.add(startNodeId);
        visited.add(startNodeId);
        
        while (!queue.isEmpty()) {
            String current = queue.poll();
            List<WorkflowEdge> edges = politica.getEdges().stream()
                    .filter(e -> e.getSourceNodeId().equals(current))
                    .toList();
            for (WorkflowEdge edge : edges) {
                String next = edge.getTargetNodeId();
                if (next.equals(targetNodeId)) return true;
                if (!visited.contains(next)) {
                    visited.add(next);
                    queue.add(next);
                }
            }
        }
        return false;
    }

    private void resolverNavegacionParalela(
            PoliticaWorkflow politica, 
            WorkflowNode nodo, 
            Map<String, Object> datosAcumulados, 
            java.util.List<String> activeNodes, 
            java.util.List<String> activeDepts) {
        
        if (nodo.getType() == NodeType.USER_TASK) {
            if (!activeNodes.contains(nodo.getId())) {
                activeNodes.add(nodo.getId());
                activeDepts.add(nodo.getDepartmentId() != null ? nodo.getDepartmentId() : "");
            }
            return;
        }
        
        if (nodo.getType() == NodeType.END) {
            if (!activeNodes.contains(nodo.getId())) {
                activeNodes.add(nodo.getId());
            }
            return;
        }
        
        if (nodo.getType() == NodeType.EXCLUSIVE_GATEWAY) {
            List<WorkflowEdge> edgesSalientes = politica.getEdges().stream()
                    .filter(e -> e.getSourceNodeId().equals(nodo.getId()))
                    .toList();
            if (edgesSalientes.isEmpty()) {
                throw new WorkflowValidationException("Gateway Exclusivo '" + nodo.getName() + "' no tiene conexiones salientes.");
            }
            WorkflowEdge edgeElegido = null;
            if (edgesSalientes.size() == 1) {
                edgeElegido = edgesSalientes.get(0);
            } else {
                edgeElegido = edgesSalientes.stream()
                        .filter(e -> e.getCondition() != null && evaluarCondicion(e.getCondition(), datosAcumulados))
                        .findFirst()
                        .orElse(null);
                if (edgeElegido == null) {
                    edgeElegido = edgesSalientes.stream()
                            .filter(e -> e.getCondition() == null)
                            .findFirst()
                            .orElse(edgesSalientes.get(0));
                }
            }
            WorkflowNode next = findNodeById(politica, edgeElegido.getTargetNodeId());
            resolverNavegacionParalela(politica, next, datosAcumulados, activeNodes, activeDepts);
            return;
        }
        
        if (nodo.getType() == NodeType.PARALLEL_GATEWAY) {
            String gType = nodo.getGatewayType() != null ? nodo.getGatewayType() : "";
            if ("FORK".equalsIgnoreCase(gType)) {
                List<WorkflowEdge> edgesSalientes = politica.getEdges().stream()
                        .filter(e -> e.getSourceNodeId().equals(nodo.getId()))
                        .toList();
                if (edgesSalientes.isEmpty()) {
                    throw new WorkflowValidationException("Gateway Paralelo Fork '" + nodo.getName() + "' no tiene conexiones salientes.");
                }
                for (WorkflowEdge edge : edgesSalientes) {
                    WorkflowNode next = findNodeById(politica, edge.getTargetNodeId());
                    resolverNavegacionParalela(politica, next, datosAcumulados, activeNodes, activeDepts);
                }
            } else if ("JOIN".equalsIgnoreCase(gType)) {
                boolean esperar = false;
                for (String activeId : activeNodes) {
                    if (canReach(politica, activeId, nodo.getId())) {
                        esperar = true;
                        break;
                    }
                }
                
                if (esperar) {
                    System.out.println("JOIN Sincronización: Rama en espera. Aún quedan ramas activas pendientes.");
                } else {
                    System.out.println("JOIN Sincronización: ¡Todas las ramas completadas! Avanzando flujo principal.");
                    List<WorkflowEdge> edgesSalientes = politica.getEdges().stream()
                            .filter(e -> e.getSourceNodeId().equals(nodo.getId()))
                            .toList();
                    if (edgesSalientes.isEmpty()) {
                        throw new WorkflowValidationException("Gateway Paralelo Join '" + nodo.getName() + "' no tiene conexiones salientes.");
                    }
                    WorkflowNode next = findNodeById(politica, edgesSalientes.get(0).getTargetNodeId());
                    resolverNavegacionParalela(politica, next, datosAcumulados, activeNodes, activeDepts);
                }
            }
            return;
        }
        
        throw new WorkflowValidationException("Tipo de nodo no soportado: " + nodo.getType());
    }
}
