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
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (rolRepository.count() > 0) {
            log.info("Data already seeded. Skipping...");
            return;
        }

        log.info("Starting Data Seeding...");

        // 1. Roles
        Rol adminRol = rolRepository.save(Rol.builder().nombre("ADMIN").permisos(List.of("ALL")).build());
        Rol jefeRol = rolRepository.save(Rol.builder().nombre("JEFE").permisos(List.of("APPROVE", "VIEW_DEPT")).build());
        Rol funcRol = rolRepository.save(Rol.builder().nombre("FUNCIONARIO").permisos(List.of("EXECUTE")).build());
        Rol clienteRol = rolRepository.save(Rol.builder().nombre("CLIENTE").permisos(List.of("START_TRAMITE")).build());

        // 2. Organización
        Organizacion org = orgRepository.save(Organizacion.builder()
                .nombre("Corporación BPM Latam")
                .esquemaColores(Map.of("primary", "#4f46e5", "secondary", "#10b981"))
                .build());

        // 3. Departamentos
        Departamento depIT = depRepository.save(Departamento.builder().nombre("Sistemas (IT)").codigoArea("IT-01").idOrganizacion(org.getId()).build());
        Departamento depRRHH = depRepository.save(Departamento.builder().nombre("Recursos Humanos").codigoArea("RH-01").idOrganizacion(org.getId()).build());
        Departamento depFin = depRepository.save(Departamento.builder().nombre("Finanzas").codigoArea("FN-01").idOrganizacion(org.getId()).build());
        Departamento depOp = depRepository.save(Departamento.builder().nombre("Operaciones").codigoArea("OP-01").idOrganizacion(org.getId()).build());

        // 4. Usuarios
        String commonPass = passwordEncoder.encode("password123");

        // Admin
        usuarioRepository.save(Usuario.builder()
                .nombre("Gerente General (Admin)")
                .email("admin@bpm.com")
                .passwordHash(commonPass)
                .idRol(adminRol.getId())
                .idOrganizacion(org.getId())
                .build());

        // Jefes
        Usuario jefeIT = createUsuario("Jefe de Sistemas", "jefe.it@bpm.com", commonPass, jefeRol.getId(), org.getId(), depIT.getId());
        Usuario jefeRRHH = createUsuario("Jefe de RRHH", "jefe.rrhh@bpm.com", commonPass, jefeRol.getId(), org.getId(), depRRHH.getId());
        Usuario jefeFin = createUsuario("Jefe de Finanzas", "jefe.finanzas@bpm.com", commonPass, jefeRol.getId(), org.getId(), depFin.getId());
        Usuario jefeOp = createUsuario("Jefe de Operaciones", "jefe.op@bpm.com", commonPass, jefeRol.getId(), org.getId(), depOp.getId());

        // Update departamentos with Jefes IDs (CU-17)
        depIT.setIdJefe(jefeIT.getId()); depRepository.save(depIT);
        depRRHH.setIdJefe(jefeRRHH.getId()); depRepository.save(depRRHH);
        depFin.setIdJefe(jefeFin.getId()); depRepository.save(depFin);
        depOp.setIdJefe(jefeOp.getId()); depRepository.save(depOp);

        // Funcionarios (10 distribuídos)
        for (int i = 1; i <= 3; i++) createUsuario("Dvp IT " + i, "user.it" + i + "@bpm.com", commonPass, funcRol.getId(), org.getId(), depIT.getId());
        for (int i = 1; i <= 3; i++) createUsuario("Analista HR " + i, "user.rh" + i + "@bpm.com", commonPass, funcRol.getId(), org.getId(), depRRHH.getId());
        for (int i = 1; i <= 2; i++) createUsuario("Contador " + i, "user.fn" + i + "@bpm.com", commonPass, funcRol.getId(), org.getId(), depFin.getId());
        for (int i = 1; i <= 2; i++) createUsuario("Operador " + i, "user.op" + i + "@bpm.com", commonPass, funcRol.getId(), org.getId(), depOp.getId());

        // Clientes (8 externos - SIN ORGANIZACION ASIGNADA)
        List<Usuario> clientes = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            clientes.add(usuarioRepository.save(Usuario.builder()
                .nombre("Cliente Externo " + i)
                .email("cliente" + i + "@bpm.com")
                .passwordHash(commonPass)
                .idRol(clienteRol.getId())
                .idOrganizacion(null) // Usuario libre de Tenants
                .idDepartamento(null)
                .build()));
        }

        // 5. Políticas (Vacaciones)
        PoliticaWorkflow politica = createPoliticaVacaciones(org.getId(), depRRHH.getId());
        politicaRepository.save(politica);

        // 6. Trámites (~15 instancias)
        seedTramites(politica, clientes, depRRHH.getId());

        log.info("Data Seeding completed successfully. 23 Users and 15 Trámites created.");
    }

    private Usuario createUsuario(String nombre, String email, String pass, String idRol, String idOrg, String idDep) {
        return usuarioRepository.save(Usuario.builder()
                .nombre(nombre)
                .email(email)
                .passwordHash(pass)
                .idRol(idRol)
                .idOrganizacion(idOrg)
                .idDepartamento(idDep)
                .build());
    }

    private PoliticaWorkflow createPoliticaVacaciones(String idOrg, String idDepRRHH) {
        List<WorkflowNode> nodes = List.of(
            WorkflowNode.builder().id("start").type(NodeType.START).name("Inicio").uiPosition(new UIPosition(100.0, 250.0)).build(),
            WorkflowNode.builder()
                .id("solicitud")
                .type(NodeType.USER_TASK)
                .name("Cargar Datos Galeria")
                .departmentId(idDepRRHH)
                .uiPosition(new UIPosition(300.0, 250.0))
                .formDefinition(List.of(
                    new FormFieldDefinition("f_dias", "Cantidad de Días", FormFieldType.NUMBER, true, null),
                    new FormFieldDefinition("f_motivo", "Motivo", FormFieldType.TEXT, true, null)
                )).build(),
            WorkflowNode.builder().id("end").type(NodeType.END).name("Finalizado").uiPosition(new UIPosition(600.0, 250.0)).build()
        );

        List<WorkflowEdge> edges = List.of(
            new WorkflowEdge("e1", "start", "solicitud", null),
            new WorkflowEdge("e2", "solicitud", "end", null)
        );

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

    private void seedTramites(PoliticaWorkflow pol, List<Usuario> clientes, String idDep) {
        String[] estados = {"INICIADO", "EN_PROGRESO", "REVISIÓN", "FINALIZADO", "RECHAZADO"};
        Random rand = new Random();
        
        for (int i = 1; i <= 15; i++) {
            String idSolicitante = clientes.get(rand.nextInt(clientes.size())).getId();
            String estado = estados[rand.nextInt(estados.length)];
            
            tramiteRepository.save(TramiteInstancia.builder()
                .codigoTramite("TRM-2026-" + String.format("%04d", i))
                .idPolitica(pol.getId())
                .idUsuarioSolicitante(idSolicitante)
                .estadoActual(estado)
                .nodoActualId(estado.equals("INICIADO") ? "start" : "solicitud")
                .departamentoActualId(idDep)
                .createdAt(LocalDateTime.now().minusDays(rand.nextInt(30)))
                .datosAcumuladosFormulario(Map.of("f_dias", rand.nextInt(15) + 1, "f_motivo", "Vacaciones seed data"))
                .build());
        }
    }
}
