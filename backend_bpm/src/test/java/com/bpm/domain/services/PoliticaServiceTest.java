package com.bpm.domain.services;

import com.bpm.app.dto.WorkflowResponseDTO;
import com.bpm.app.exceptions.WorkflowValidationException;
import com.bpm.data.entities.PoliticaWorkflow;
import com.bpm.data.entities.embedded.WorkflowNode;
import com.bpm.data.entities.enums.NodeType;
import com.bpm.data.entities.enums.PolicyStatus;
import com.bpm.data.repositories.OrganizacionRepository;
import com.bpm.data.repositories.PoliticaWorkflowRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PoliticaServiceTest {

    @Mock
    private PoliticaWorkflowRepository repository;
    @Mock
    private OrganizacionRepository organizacionRepository;

    @InjectMocks
    private PoliticaService service;

    @Test
    void debePublicarPolitica_SiEstructuraEsValida() {
        // Arrange
        WorkflowNode start = WorkflowNode.builder().id("N1").type(NodeType.START).build();
        WorkflowNode end = WorkflowNode.builder().id("N2").type(NodeType.END).build();

        PoliticaWorkflow borrador = PoliticaWorkflow.builder()
                .id("POL01")
                .nombre("Test")
                .status(PolicyStatus.DRAFT)
                .nodes(List.of(start, end))
                .build();

        when(repository.findById("POL01")).thenReturn(Optional.of(borrador));
        when(repository.save(any(PoliticaWorkflow.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        WorkflowResponseDTO resultado = service.publicarPolitica("POL01");

        // Assert
        assertEquals(PolicyStatus.PUBLISHED, resultado.getStatus());
        verify(repository, atLeastOnce()).save(any());
    }

    @Test
    void debeCrearNuevaVersion_IncrementandoValorString() {
        // Arrange
        PoliticaWorkflow v1 = PoliticaWorkflow.builder()
                .id("POL01")
                .nombre("Test")
                .version("1.0")
                .status(PolicyStatus.PUBLISHED)
                .build();

        when(repository.findById("POL01")).thenReturn(Optional.of(v1));
        when(repository.save(any(PoliticaWorkflow.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        WorkflowResponseDTO v2 = service.crearNuevaVersion("POL01");

        // Assert
        assertEquals("1.1", v2.getVersion());
        assertEquals(PolicyStatus.DRAFT, v2.getStatus());
    }

    @Test
    void lanzarExcepcion_SiFaltaNodoEndAlPublicar() {
        // Arrange
        WorkflowNode start = WorkflowNode.builder().id("N1").type(NodeType.START).build();

        PoliticaWorkflow incompleta = PoliticaWorkflow.builder()
                .id("POL01")
                .nodes(List.of(start))
                .build();

        when(repository.findById("POL01")).thenReturn(Optional.of(incompleta));

        // Act & Assert
        assertThrows(WorkflowValidationException.class, () -> service.publicarPolitica("POL01"));
    }
}
