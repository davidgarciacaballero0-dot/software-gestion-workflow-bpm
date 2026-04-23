package com.bpm.app.config;

import com.bpm.data.entities.*;
import com.bpm.data.entities.embedded.*;
import com.bpm.data.entities.enums.*;
import com.bpm.data.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RolRepository rolRepository;
    private final OrganizacionRepository orgRepository;
    private final DepartamentoRepository depRepository;
    private final UsuarioRepository usuarioRepository;
    private final PoliticaWorkflowRepository politicaRepository;
    private final TramiteInstanciaRepository tramiteRepository;
    private final EventoHistorialRepository historialRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting Data Seeding (Incremental Mode)...");

        // El modo de limpieza total ha sido desactivado para permitir la persistencia
        // de datos manuales (Fase 4.1)

        boolean partialSeed = false;

        // 1. Roles
        Rol adminRol = getOrCreateRol("ADMIN", List.of("ALL"));
        Rol jefeRol = getOrCreateRol("JEFE", List.of("APPROVE", "VIEW_DEPT"));
        Rol funcRol = getOrCreateRol("FUNCIONARIO", List.of("EXECUTE"));
        Rol clienteRol = getOrCreateRol("CLIENTE", List.of("START_TRAMITE"));

        // 2. Organización
        Organizacion org = orgRepository.findByNombre("Corporación BPM Latam")
                .orElseGet(() -> orgRepository.save(Organizacion.builder()
                        .nombre("Corporación BPM Latam")
                        .esquemaColores(Map.of("primary", "#4f46e5", "secondary", "#10b981"))
                        .build()));

        // 3. Departamentos
        Departamento depIT = getOrCreateDep("Sistemas (IT)", "IT-01", org.getId());
        Departamento depRRHH = getOrCreateDep("Recursos Humanos", "RH-01", org.getId());
        Departamento depFin = getOrCreateDep("Finanzas", "FN-01", org.getId());
        Departamento depOp = getOrCreateDep("Operaciones", "OP-01", org.getId());
        Departamento depVentas = getOrCreateDep("Atención al Cliente (Ventas)", "VT-01", org.getId());

        // 4. Usuarios
        String commonPass = passwordEncoder.encode("password123");

        // Admin
        getOrCreateUser("Gerente", "General", "10000001", "70000001", "admin@bpm.com", commonPass, adminRol.getId(),
                org.getId(), null);

        // Jefes
        Usuario jefeIT = getOrCreateUser("Jefe", "Sistemas", "20000001", "70000002", "jefe.it@bpm.com", commonPass,
                jefeRol.getId(), org.getId(), depIT.getId());
        Usuario jefeRRHH = getOrCreateUser("Jefe", "Recursos Humanos", "20000002", "70000003", "jefe.rrhh@bpm.com",
                commonPass, jefeRol.getId(), org.getId(), depRRHH.getId());
        Usuario jefeFin = getOrCreateUser("Jefe", "Finanzas", "20000003", "70000004", "jefe.finanzas@bpm.com",
                commonPass, jefeRol.getId(), org.getId(), depFin.getId());
        Usuario jefeOp = getOrCreateUser("Jefe", "Operaciones", "20000004", "70000005", "jefe.op@bpm.com", commonPass,
                jefeRol.getId(), org.getId(), depOp.getId());
        Usuario jefeVentas = getOrCreateUser("Jefe", "Ventas", "20000005", "70000006", "jefe.ventas@bpm.com",
                commonPass, jefeRol.getId(), org.getId(), depVentas.getId());

        // Update departamentos with Jefes IDs (CU-17)
        if (depIT.getIdJefe() == null) {
            depIT.setIdJefe(jefeIT.getId());
            depRepository.save(depIT);
        }
        if (depRRHH.getIdJefe() == null) {
            depRRHH.setIdJefe(jefeRRHH.getId());
            depRepository.save(depRRHH);
        }
        if (depFin.getIdJefe() == null) {
            depFin.setIdJefe(jefeFin.getId());
            depRepository.save(depFin);
        }
        if (depOp.getIdJefe() == null) {
            depOp.setIdJefe(jefeOp.getId());
            depRepository.save(depOp);
        }
        if (depVentas.getIdJefe() == null) {
            depVentas.setIdJefe(jefeVentas.getId());
            depRepository.save(depVentas);
        }

        // Funcionarios (Existentes)
        if (!partialSeed) {
            for (int i = 1; i <= 3; i++)
                getOrCreateUser("Dvp IT " + i, "Sistemas", "3000000" + i, "6000000" + i, "user.it" + i + "@bpm.com",
                        commonPass, funcRol.getId(), org.getId(), depIT.getId());
            for (int i = 1; i <= 3; i++)
                getOrCreateUser("Analista HR " + i, "Recursos Humanos", "4000000" + i, "6100000" + i,
                        "user.rh" + i + "@bpm.com", commonPass, funcRol.getId(), org.getId(), depRRHH.getId());
            for (int i = 1; i <= 2; i++)
                getOrCreateUser("Contador " + i, "Finanzas", "5000000" + i, "6200000" + i, "user.fn" + i + "@bpm.com",
                        commonPass, funcRol.getId(), org.getId(), depFin.getId());
            for (int i = 1; i <= 2; i++)
                getOrCreateUser("Operador " + i, "Operaciones", "6000000" + i, "6300000" + i,
                        "user.op" + i + "@bpm.com", commonPass, funcRol.getId(), org.getId(), depOp.getId());
        }

        // 4.1 Usuarios Ventas (Nuevos)
        getOrCreateUser("Asistente", "Ventas", "70000001", "71000001", "asistente.ventas@bpm.com", commonPass,
                funcRol.getId(), org.getId(), depVentas.getId());
        for (int i = 1; i <= 3; i++)
            getOrCreateUser("Vendedor " + i, "Ventas", "8000000" + i, "7200000" + i, "vendedor" + i + "@bpm.com",
                    commonPass, funcRol.getId(), org.getId(), depVentas.getId());

        // Clientes (Existentes)
        List<Usuario> clientes = usuarioRepository.findAll().stream()
                .filter(u -> u.getEmail().startsWith("cliente"))
                .toList();

        if (clientes.isEmpty()) {
            clientes = new ArrayList<>();
            for (int i = 1; i <= 8; i++) {
                clientes.add(usuarioRepository.save(Usuario.builder()
                        .nombre("Cliente " + i)
                        .apellidos("Externo " + i)
                        .ci("9000000" + i)
                        .celular("7990000" + i)
                        .email("cliente" + i + "@bpm.com")
                        .passwordHash(commonPass)
                        .idRol(clienteRol.getId())
                        .idOrganizacion(null)
                        .idDepartamento(null)
                        .fechaNacimiento(LocalDateTime.now().minusYears(18 + i))
                        .build()));
            }
        }

        // 5. Políticas
        PoliticaWorkflow polVacaciones = getOrCreatePoliticaVacaciones(org.getId(), depRRHH.getId());
        PoliticaWorkflow polFibra = getOrCreatePoliticaFibra(org.getId(), depVentas.getId(), depIT.getId(),
                depFin.getId(), depOp.getId());
        PoliticaWorkflow polPrueba = getOrCreatePoliticaPrueba2026(org.getId(), depVentas.getId(), depIT.getId());

        // 6. Trámites (~15 instancias si está vacío)
        if (tramiteRepository.count() == 0) {
            seedTramitesVacaciones(polVacaciones, clientes, depRRHH.getId());
            seedTramitesFibra(polFibra, clientes, depVentas.getId());
        }

        log.info("Data Seeding completed successfully. 23 Users and 15 Trámites created.");
    }

    private Rol getOrCreateRol(String nombre, List<String> permisos) {
        return rolRepository.findByNombre(nombre)
                .orElseGet(() -> rolRepository.save(Rol.builder().nombre(nombre).permisos(permisos).build()));
    }

    private Departamento getOrCreateDep(String nombre, String codigo, String idOrg) {
        return depRepository.findByNombre(nombre)
                .orElseGet(() -> depRepository
                        .save(Departamento.builder().nombre(nombre).codigoArea(codigo).idOrganizacion(idOrg).build()));
    }

    private Usuario getOrCreateUser(String nombre, String apellidos, String ci, String celular, String email,
            String pass, String idRol, String idOrg, String idDep) {
        return usuarioRepository.findByEmail(email)
                .orElseGet(() -> createUsuario(nombre, apellidos, ci, celular, email, pass, idRol, idOrg, idDep));
    }

    private PoliticaWorkflow getOrCreatePoliticaVacaciones(String idOrg, String idDepRRHH) {
        return politicaRepository.findByNombre("Solicitud de Vacaciones Anuales")
                .orElseGet(() -> politicaRepository.save(createPoliticaVacaciones(idOrg, idDepRRHH)));
    }

    private PoliticaWorkflow getOrCreatePoliticaFibra(String idOrg, String idVentas, String idIT, String idFin,
            String idOp) {
        return politicaRepository.findByNombre("Instalación de Fibra Óptica (Residencial)")
                .orElseGet(() -> politicaRepository.save(createPoliticaFibra(idOrg, idVentas, idIT, idFin, idOp)));
    }

    private Usuario createUsuario(String nombre, String apellidos, String ci, String celular, String email, String pass,
            String idRol, String idOrg, String idDep) {
        return usuarioRepository.save(Usuario.builder()
                .nombre(nombre)
                .apellidos(apellidos)
                .ci(ci)
                .celular(celular)
                .email(email)
                .passwordHash(pass)
                .idRol(idRol)
                .idOrganizacion(idOrg)
                .idDepartamento(idDep)
                .fechaNacimiento(LocalDateTime.now().minusYears(20 + new Random().nextInt(20)))
                .build());
    }

    private PoliticaWorkflow createPoliticaVacaciones(String idOrg, String idDepRRHH) {
        List<WorkflowNode> nodes = List.of(
                WorkflowNode.builder().id("start").type(NodeType.START).name("Inicio")
                        .uiPosition(new UIPosition(100.0, 250.0)).build(),
                WorkflowNode.builder()
                        .id("solicitud")
                        .type(NodeType.USER_TASK)
                        .name("Cargar Datos Galeria")
                        .departmentId(idDepRRHH)
                        .slaHours(72)
                        .uiPosition(new UIPosition(300.0, 250.0))
                        .formDefinition(List.of(
                                new FormFieldDefinition("f_dias", "Cantidad de Días", FormFieldType.NUMBER, true, null),
                                new FormFieldDefinition("f_motivo", "Motivo", FormFieldType.TEXT, true, null)))
                        .build(),
                WorkflowNode.builder().id("end").type(NodeType.END).name("Finalizado")
                        .uiPosition(new UIPosition(600.0, 250.0)).build());

        List<WorkflowEdge> edges = List.of(
                new WorkflowEdge("e1", "start", "solicitud", null),
                new WorkflowEdge("e2", "solicitud", "end", null));

        return PoliticaWorkflow.builder()
                .idOrganizacion(idOrg)
                .nombre("Solicitud de Vacaciones Anuales")
                .description("Proceso para solicitar días de descanso.")
                .version("1.0")
                .status(PolicyStatus.PUBLISHED)
                .nodes(nodes)
                .edges(edges)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private PoliticaWorkflow createPoliticaFibra(String idOrg, String idVentas, String idIT, String idFin,
            String idOp) {
        List<WorkflowNode> nodes = List.of(
                WorkflowNode.builder().id("start").type(NodeType.START).name("Inicio")
                        .uiPosition(new UIPosition(50.0, 250.0)).build(),
                WorkflowNode.builder()
                        .id("registro")
                        .type(NodeType.USER_TASK)
                        .name("Registro Inicial de Cliente")
                        .departmentId(idVentas)
                        .slaHours(72)
                        .uiPosition(new UIPosition(200.0, 250.0))
                        .formDefinition(List.of(
                                new FormFieldDefinition("f_nombre", "Nombre(s)", FormFieldType.TEXT, true, null),
                                new FormFieldDefinition("f_apellidos", "Apellidos", FormFieldType.TEXT, true, null),
                                new FormFieldDefinition("f_ci", "Carnet de Identidad", FormFieldType.TEXT, true, null),
                                new FormFieldDefinition("f_dir", "Dirección de Instalación", FormFieldType.TEXT, true,
                                        null)))
                        .build(),
                WorkflowNode.builder()
                        .id("analisis_itt")
                        .type(NodeType.USER_TASK)
                        .name("Verificación Técnica (IT)")
                        .departmentId(idIT)
                        .slaHours(48)
                        .uiPosition(new UIPosition(350.0, 250.0))
                        .formDefinition(List.of(
                                new FormFieldDefinition("f_cobertura", "¿Hay factibilidad técnica?",
                                        FormFieldType.BOOLEAN, true, null)))
                        .build(),
                WorkflowNode.builder()
                        .id("factibilidad")
                        .type(NodeType.EXCLUSIVE_GATEWAY)
                        .name("Decisión de Cobertura")
                        .uiPosition(new UIPosition(500.0, 250.0))
                        .build(),
                WorkflowNode.builder()
                        .id("pago")
                        .type(NodeType.USER_TASK)
                        .name("Cobro de Instalación")
                        .departmentId(idFin)
                        .slaHours(72)
                        .uiPosition(new UIPosition(600.0, 150.0))
                        .formDefinition(List.of(
                                new FormFieldDefinition("f_p_fecha", "Fecha de Pago", FormFieldType.DATE, true, null),
                                new FormFieldDefinition("f_p_monto", "Monto Cobrado ($)", FormFieldType.NUMBER, true,
                                        null),
                                new FormFieldDefinition("f_p_concepto", "Concepto (Ej: Instalación Fibra)",
                                        FormFieldType.TEXT, true, null)))
                        .build(),
                WorkflowNode.builder()
                        .id("instalacion")
                        .type(NodeType.USER_TASK)
                        .name("Ejecución de Instalación")
                        .departmentId(idOp)
                        .slaHours(72)
                        .uiPosition(new UIPosition(800.0, 150.0))
                        .formDefinition(List.of(
                                new FormFieldDefinition("f_i_tecnico", "Técnico Asignado", FormFieldType.TEXT, true,
                                        null),
                                new FormFieldDefinition("f_i_mac", "MAC Address Router", FormFieldType.TEXT, true,
                                        null)))
                        .build(),
                WorkflowNode.builder().id("rechazo").type(NodeType.END).name("Trámite Rechazado (Sin Cobertura)")
                        .uiPosition(new UIPosition(600.0, 400.0)).build(),
                WorkflowNode.builder().id("end").type(NodeType.END).name("Servicio Activado")
                        .uiPosition(new UIPosition(1000.0, 150.0)).build());

        List<WorkflowEdge> edges = List.of(
                new WorkflowEdge("e1", "start", "registro", null),
                new WorkflowEdge("e2", "registro", "analisis_itt", null),
                new WorkflowEdge("e_add1", "analisis_itt", "factibilidad", null),
                new WorkflowEdge("e3", "factibilidad", "pago",
                        Condition.builder().variable("f_cobertura").operator(ConditionOperator.EQUALS).value("true")
                                .build()),
                new WorkflowEdge("e4", "factibilidad", "rechazo",
                        Condition.builder().variable("f_cobertura").operator(ConditionOperator.EQUALS).value("false")
                                .build()),
                new WorkflowEdge("e5", "pago", "instalacion", null),
                new WorkflowEdge("e6", "instalacion", "end", null));

        return PoliticaWorkflow.builder()
                .idOrganizacion(idOrg)
                .nombre("Instalación de Fibra Óptica (Residencial)")
                .description("Proceso ágil para alta de nuevos clientes de Internet y TV.")
                .version("1.0")
                .status(PolicyStatus.PUBLISHED)
                .nodes(nodes)
                .edges(edges)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private PoliticaWorkflow getOrCreatePoliticaPrueba2026(String idOrg, String idVentas, String idIT) {
        return politicaRepository.findByNombre("Prueba 2026")
                .orElseGet(() -> politicaRepository.save(createPoliticaPrueba2026(idOrg, idVentas, idIT)));
    }

    private PoliticaWorkflow createPoliticaPrueba2026(String idOrg, String idVentas, String idIT) {
        List<WorkflowNode> nodes = List.of(
                WorkflowNode.builder().id("start").type(NodeType.START).name("Inicio")
                        .uiPosition(new UIPosition(50.0, 200.0)).build(),
                
                WorkflowNode.builder()
                        .id("recopilacion")
                        .type(NodeType.USER_TASK)
                        .name("Recopilación de Requisitos")
                        .departmentId(idVentas)
                        .slaHours(24)
                        .uiPosition(new UIPosition(200.0, 200.0))
                        .formDefinition(List.of(
                                new FormFieldDefinition("f_nombre", "Nombres del Cliente", FormFieldType.TEXT, true, null),
                                new FormFieldDefinition("f_apellidos", "Apellidos del Cliente", FormFieldType.TEXT, true, null),
                                new FormFieldDefinition("f_ci", "Cédula de Identidad", FormFieldType.TEXT, true, null),
                                new FormFieldDefinition("f_foto_ci", "Foto del CI (Anverso)", FormFieldType.FILE, true, null),
                                new FormFieldDefinition("f_email", "Correo Electrónico", FormFieldType.TEXT, true, null)))
                        .build(),

                WorkflowNode.builder()
                        .id("evaluacion")
                        .type(NodeType.USER_TASK)
                        .name("Evaluación Técnica")
                        .departmentId(idIT)
                        .slaHours(48)
                        .uiPosition(new UIPosition(400.0, 200.0))
                        .formDefinition(List.of(
                                new FormFieldDefinition("f_aprobado", "¿Cumple con los requisitos?", FormFieldType.BOOLEAN, true, null)))
                        .build(),

                WorkflowNode.builder()
                        .id("bifurcacion")
                        .type(NodeType.EXCLUSIVE_GATEWAY)
                        .name("Decisión")
                        .uiPosition(new UIPosition(550.0, 200.0))
                        .build(),

                WorkflowNode.builder()
                        .id("camino_a")
                        .type(NodeType.USER_TASK)
                        .name("Procesamiento Premium")
                        .departmentId(idIT)
                        .slaHours(12)
                        .uiPosition(new UIPosition(700.0, 100.0))
                        .build(),

                WorkflowNode.builder()
                        .id("camino_b")
                        .type(NodeType.USER_TASK)
                        .name("Procesamiento Estándar")
                        .departmentId(idVentas)
                        .slaHours(48)
                        .uiPosition(new UIPosition(700.0, 300.0))
                        .build(),

                WorkflowNode.builder().id("end").type(NodeType.END).name("Finalizado")
                        .uiPosition(new UIPosition(900.0, 200.0)).build()
        );

        List<WorkflowEdge> edges = List.of(
                new WorkflowEdge("e1", "start", "recopilacion", null),
                new WorkflowEdge("e2", "recopilacion", "evaluacion", null),
                new WorkflowEdge("e3", "evaluacion", "bifurcacion", null),
                
                // Bifurcación basada en f_aprobado
                new WorkflowEdge("e4", "bifurcacion", "camino_a", 
                        Condition.builder().variable("f_aprobado").operator(ConditionOperator.EQUALS).value("true").build()),
                new WorkflowEdge("e5", "bifurcacion", "camino_b", 
                        Condition.builder().variable("f_aprobado").operator(ConditionOperator.EQUALS).value("false").build()),
                
                new WorkflowEdge("e6", "camino_a", "end", null),
                new WorkflowEdge("e7", "camino_b", "end", null)
        );

        return PoliticaWorkflow.builder()
                .idOrganizacion(idOrg)
                .nombre("Prueba 2026")
                .description("Flujo de prueba completo con adjuntos y bifurcación.")
                .version("1.0")
                .status(PolicyStatus.PUBLISHED)
                .nodes(nodes)
                .edges(edges)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private void seedTramitesVacaciones(PoliticaWorkflow pol, List<Usuario> clientes, String idDep) {
        String[] estados = { "EN_PROGRESO", "EN_PROGRESO", "EN_PROGRESO", "FINALIZADO" };
        Random rand = new Random();
        for (int i = 1; i <= 10; i++) {
            Usuario c = clientes.get(rand.nextInt(clientes.size()));
            String estado = estados[rand.nextInt(estados.length)];
            TramiteInstancia t = tramiteRepository.save(TramiteInstancia.builder()
                    .codigoTramite("VAC-2026-" + String.format("%04d", i))
                    .idPolitica(pol.getId())
                    .idUsuarioSolicitante(c.getId())
                    .ciSolicitante(c.getCi())
                    .nombreSolicitante(c.getNombre() + " " + c.getApellidos())
                    .estadoActual(estado)
                    .nodoActualId("solicitud")
                    .departamentoActualId(idDep)
                    .createdAt(LocalDateTime.now().minusDays(rand.nextInt(10)))
                    .datosAcumuladosFormulario(
                            Map.of("f_dias", rand.nextInt(15) + 1, "f_motivo", "Vacaciones de prueba"))
                    .build());

            historialRepository.save(EventoHistorial.builder()
                    .idTramite(t.getId())
                    .tipoEvento(TipoEvento.CREACION)
                    .nodoDestinoId("solicitud")
                    .nodoDestinoNombre("Cargar Datos Galeria")
                    .ejecutadoPorUsuarioId(c.getId())
                    .ejecutadoPorNombre(c.getNombre() + " " + c.getApellidos())
                    .createdAt(t.getCreatedAt())
                    .build());
        }
    }

    private void seedTramitesFibra(PoliticaWorkflow pol, List<Usuario> clientes, String idDepVentas) {
        Random rand = new Random();
        for (int i = 1; i <= 5; i++) {
            Usuario c = clientes.get(rand.nextInt(clientes.size()));
            TramiteInstancia t = tramiteRepository.save(TramiteInstancia.builder()
                    .codigoTramite("FIB-2026-" + String.format("%04d", i))
                    .idPolitica(pol.getId())
                    .idUsuarioSolicitante(c.getId())
                    .ciSolicitante(c.getCi())
                    .nombreSolicitante(c.getNombre() + " " + c.getApellidos())
                    .estadoActual("EN_PROGRESO")
                    .nodoActualId("registro")
                    .departamentoActualId(idDepVentas)
                    .createdAt(LocalDateTime.now().minusHours(rand.nextInt(48)))
                    .datosAcumuladosFormulario(Map.of(
                            "f_nombre", c.getNombre(),
                            "f_apellidos", c.getApellidos(),
                            "f_ci", c.getCi(),
                            "f_dir", "Calle Ficticia #" + (10 + i)))
                    .build());

            historialRepository.save(EventoHistorial.builder()
                    .idTramite(t.getId())
                    .tipoEvento(TipoEvento.CREACION)
                    .nodoDestinoId("registro")
                    .nodoDestinoNombre("Registro Inicial de Cliente")
                    .ejecutadoPorUsuarioId(c.getId())
                    .ejecutadoPorNombre(c.getNombre() + " " + c.getApellidos())
                    .createdAt(t.getCreatedAt())
                    .build());
        }
    }
}
