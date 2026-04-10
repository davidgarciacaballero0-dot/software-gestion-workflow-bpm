package com.bpm.domain.services;

import com.bpm.app.dto.OrganizacionRequestDTO;
import com.bpm.app.dto.OrganizacionResponseDTO;
import com.bpm.app.exceptions.ResourceNotFoundException;
import com.bpm.data.entities.Organizacion;
import com.bpm.data.repositories.OrganizacionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OrganizacionServiceTest {

    @Mock
    private OrganizacionRepository organizacionRepository;

    @InjectMocks
    private OrganizacionService organizacionService;

    private Organizacion tenantMock;

    @BeforeEach
    void setUp() {
        tenantMock = Organizacion.builder()
                .id("12345")
                .nombre("Ministerio de Obras")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void debeGuardarYRetornarOrganizacion_CuandoSeCrea() {
        // Arrange
        OrganizacionRequestDTO request = new OrganizacionRequestDTO();
        request.setNombre("Ministerio de Obras");
        when(organizacionRepository.save(any(Organizacion.class))).thenReturn(tenantMock);

        // Act
        OrganizacionResponseDTO response = organizacionService.crearOrganizacion(request);

        // Assert
        assertNotNull(response);
        assertEquals("Ministerio de Obras", response.getNombre());
        assertEquals("12345", response.getId());
        verify(organizacionRepository, times(1)).save(any(Organizacion.class));
    }

    @Test
    void debeRetornarOrganizacion_CuandoIdExiste() {
        // Arrange
        when(organizacionRepository.findById("12345")).thenReturn(Optional.of(tenantMock));

        // Act
        OrganizacionResponseDTO response = organizacionService.obtenerPorId("12345");

        // Assert
        assertNotNull(response);
        assertEquals("12345", response.getId());
    }

    @Test
    void debeLanzarExcepcionGlobal404_CuandoIdNoExiste_ProtegiendoBd() {
        // Arrange
        when(organizacionRepository.findById("erroneo_999")).thenReturn(Optional.empty());

        // Act & Assert
        Exception exception = assertThrows(ResourceNotFoundException.class, () -> organizacionService.obtenerPorId("erroneo_999"));
        assertTrue(exception.getMessage().contains("no encontrada"));
    }
}
