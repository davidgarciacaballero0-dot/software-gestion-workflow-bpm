package com.bpm.domain.services;

import com.bpm.app.dto.AvanzarTramiteRequestDTO;
import com.bpm.app.dto.StartProcedureRequestDTO;
import com.bpm.app.dto.TramiteResponseDTO;
import com.bpm.data.entities.PoliticaWorkflow;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.entities.embedded.WorkflowEdge;
import com.bpm.data.entities.embedded.WorkflowNode;
import com.bpm.data.entities.enums.NodeType;
import com.bpm.data.entities.enums.PolicyStatus;
import com.bpm.data.repositories.EventoHistorialRepository;
import com.bpm.data.repositories.PoliticaWorkflowRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TramiteServiceTest {

    @Mock
    private TramiteInstanciaRepository tramiteRepository;
    @Mock
    private PoliticaWorkflowRepository politicaRepository;
    @Mock
    private SequenceGeneratorService sequenceGenerator;
    @Mock
    private NotificationService notificationService;
    @Mock
    private EventoHistorialRepository historialRepository;

    @InjectMocks
    private TramiteService tramiteService;

    @Test
    void debeIniciarTramite_YAsignarPrimerNodoOperativo() {
        // Arrange
        WorkflowNode startNode = WorkflowNode.builder().id("START").type(NodeType.START).build();
        WorkflowNode opNode = WorkflowNode.builder().id("TASK_01").type(NodeType.USER_TASK).departmentId("DEPT_01").build();
        
        PoliticaWorkflow politica = PoliticaWorkflow.builder()
                .id("POL01")
                .nombre("Flujo Test")
                .status(PolicyStatus.PUBLISHED)
                .nodes(List.of(startNode, opNode))
                .edges(List.of(WorkflowEdge.builder().sourceNodeId("START").targetNodeId("TASK_01").build()))
                .build();

        StartProcedureRequestDTO request = new StartProcedureRequestDTO();
        request.setIdPolitica("POL01");
        request.setIdUsuarioSolicitante("USER01");

        when(politicaRepository.findById("POL01")).thenReturn(Optional.of(politica));
        when(sequenceGenerator.generateSequence(anyString())).thenReturn(500L);
        when(tramiteRepository.save(any(TramiteInstancia.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        TramiteResponseDTO res = tramiteService.iniciarTramite(request);

        // Assert
        assertNotNull(res);
        assertEquals("TASK_01", res.getNodoActualId());
        assertEquals("DEPT_01", res.getDepartamentoActualId());
        verify(notificationService).notificarDepartamento(eq("DEPT_01"), anyString(), anyString());
        verify(historialRepository).save(any()); // Registro de creación
    }

    @Test
    void debeAvanzarTramite_HaciaFin_SiNoHayMasNodos() {
        // Arrange
        WorkflowNode current = WorkflowNode.builder().id("TASK_01").type(NodeType.USER_TASK).build();
        WorkflowNode next = WorkflowNode.builder().id("END").type(NodeType.END).build();
        
        PoliticaWorkflow politica = PoliticaWorkflow.builder()
                .id("POL01")
                .nodes(List.of(current, next))
                .edges(List.of(WorkflowEdge.builder().sourceNodeId("TASK_01").targetNodeId("END").build()))
                .build();

        TramiteInstancia instancia = TramiteInstancia.builder()
                .id("TRAM01")
                .idPolitica("POL01")
                .nodoActualId("TASK_01")
                .estadoActual("EN_PROGRESO")
                .datosAcumuladosFormulario(new HashMap<>())
                .build();

        AvanzarTramiteRequestDTO request = new AvanzarTramiteRequestDTO();
        request.setIdTramite("TRAM01");
        request.setIdUsuarioAccion("USER_MOD");
        request.setDatosFormulario(new HashMap<>());

        when(tramiteRepository.findById("TRAM01")).thenReturn(Optional.of(instancia));
        when(politicaRepository.findById("POL01")).thenReturn(Optional.of(politica));
        when(tramiteRepository.save(any(TramiteInstancia.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        TramiteResponseDTO res = tramiteService.avanzarTramite(request);

        // Assert
        assertEquals("FINALIZADO", res.getEstadoActual());
        assertEquals("END", res.getNodoActualId());
        verify(historialRepository).save(any());
    }
}
