package com.bpm.domain.services;

import com.bpm.app.dto.DepartamentoRequestDTO;
import com.bpm.app.dto.DepartamentoResponseDTO;
import com.bpm.app.exceptions.ResourceNotFoundException;
import com.bpm.data.entities.Departamento;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.OrganizacionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DepartamentoServiceTest {

    @Mock
    private DepartamentoRepository departamentoRepository;

    @Mock
    private OrganizacionRepository organizacionRepository;

    @InjectMocks
    private DepartamentoService departamentoService;

    @Test
    void debeDenegarCreacionDepartamento_CuandoOrganizacionNoExiste_ParaMantenerIntegridad() {
        // Arrange
        DepartamentoRequestDTO dto = new DepartamentoRequestDTO();
        dto.setIdOrganizacion("tenant_invalido_123");
        dto.setNombre("Recursos Humanos");

        when(organizacionRepository.existsById("tenant_invalido_123")).thenReturn(false);

        // Act & Assert
        Exception exception = assertThrows(ResourceNotFoundException.class, () -> {
            departamentoService.crearDepartamento(dto);
        });

        // Verificamos que contenga la palabra Denegado (Manejada en Servicio)
        assertTrue(exception.getMessage().contains("Denegado"));
        // El motor Mockito asegura que JAMÁS se tocó Mongo
        verify(departamentoRepository, never()).save(any(Departamento.class));
    }

    @Test
    void debePermitirCreacion_CuandoOrganizacionSiExiste() {
        // Arrange
        DepartamentoRequestDTO dto = new DepartamentoRequestDTO();
        dto.setIdOrganizacion("tenant_valido");
        dto.setNombre("Sistemas IT");

        Departamento depMock = Departamento.builder().id("dep_007").nombre("Sistemas IT").build();

        when(organizacionRepository.existsById("tenant_valido")).thenReturn(true);
        when(departamentoRepository.save(any(Departamento.class))).thenReturn(depMock);

        // Act
        DepartamentoResponseDTO response = departamentoService.crearDepartamento(dto);

        // Assert
        assertNotNull(response);
        assertEquals("Sistemas IT", response.getNombre());
        verify(departamentoRepository, times(1)).save(any(Departamento.class));
    }
}
