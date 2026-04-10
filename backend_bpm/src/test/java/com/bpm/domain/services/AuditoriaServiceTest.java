package com.bpm.domain.services;

import com.bpm.app.dto.AuditoriaResponseDTO;
import com.bpm.data.entities.AuditoriaSistema;
import com.bpm.data.repositories.AuditoriaSistemaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuditoriaServiceTest {

    @Mock
    private AuditoriaSistemaRepository auditoriaRepository;

    @InjectMocks
    private AuditoriaService auditoriaService;

    @Test
    void debeRegistrarEventoDeAuditoria_ConDatosCompletos() {
        // Arrange
        AuditoriaSistema eventoGuardado = AuditoriaSistema.builder()
                .id("AUD_001")
                .idUsuarioActor("admin@empresa.gob")
                .accion("OrganizacionService.crearOrganizacion()")
                .entidadAfectada("OrganizacionService")
                .ipOrigen("192.168.1.100")
                .createdAt(LocalDateTime.now())
                .build();

        when(auditoriaRepository.save(any(AuditoriaSistema.class))).thenReturn(eventoGuardado);

        // Act
        auditoriaService.registrarEvento("admin@empresa.gob", "OrganizacionService.crearOrganizacion()", "OrganizacionService", "192.168.1.100");

        // Assert: Verificamos que MongoDB fue tocado exactamente 1 vez
        verify(auditoriaRepository, times(1)).save(any(AuditoriaSistema.class));
    }

    @Test
    void debeListarEventosOrdenadosPorFechaDescendente() {
        // Arrange
        AuditoriaSistema e1 = AuditoriaSistema.builder().id("A1").accion("Login").createdAt(LocalDateTime.now().minusHours(2)).build();
        AuditoriaSistema e2 = AuditoriaSistema.builder().id("A2").accion("CrearUsuario").createdAt(LocalDateTime.now()).build();

        when(auditoriaRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(e2, e1));

        // Act
        List<AuditoriaResponseDTO> resultado = auditoriaService.listarTodos();

        // Assert: El más reciente primero
        assertEquals(2, resultado.size());
        assertEquals("CrearUsuario", resultado.get(0).getAccion());
        assertEquals("Login", resultado.get(1).getAccion());
    }
}
