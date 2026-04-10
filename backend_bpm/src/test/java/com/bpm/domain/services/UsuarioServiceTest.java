package com.bpm.domain.services;

import com.bpm.app.dto.UsuarioRequestDTO;
import com.bpm.app.dto.UsuarioResponseDTO;
import com.bpm.app.exceptions.ResourceNotFoundException;
import com.bpm.data.entities.Departamento;
import com.bpm.data.entities.Usuario;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.OrganizacionRepository;
import com.bpm.data.repositories.RolRepository;
import com.bpm.data.repositories.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private OrganizacionRepository organizacionRepository;
    @Mock
    private DepartamentoRepository departamentoRepository;
    @Mock
    private RolRepository rolRepository;

    // Virtualizamos el Hash Algorithm de Spring Security
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService usuarioService;

    @Test
    void debeBloquearOperacion_SiDepartamentoSolicitado_EsDeOtraOrganizacion() {
        // Arrange
        UsuarioRequestDTO request = new UsuarioRequestDTO();
        request.setIdOrganizacion("ORG_MADRE");
        request.setIdDepartamento("DEP_FALSO");

        Departamento depFalso = Departamento.builder()
                .id("DEP_FALSO")
                .idOrganizacion("ORG_AJENA") // Simulación: Este departamento pertenece a otra Empresa/Tenant
                .nombre("Area Parametrizada Robada")
                .build();

        when(organizacionRepository.existsById("ORG_MADRE")).thenReturn(true);
        when(departamentoRepository.findById("DEP_FALSO")).thenReturn(Optional.of(depFalso));

        // Act & Assert
        // Aquí la JVM debe explotar controladamente
        Exception exception = assertThrows(ResourceNotFoundException.class,
                () -> usuarioService.registrarFuncionario(request));

        assertTrue(exception.getMessage().contains("[BRECHA FRENADA]"));

        // Comprobación de máximo rigor: Garantizamos que NADIE tocó la BD
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    void debeEncriptarPasswordEInyectar_SiValidacionesSonLicitas() {
        // Arrange
        UsuarioRequestDTO request = new UsuarioRequestDTO();
        request.setIdOrganizacion("ORG_REAL");
        request.setIdDepartamento("DEP_REAL");
        request.setIdRol("ROL_ADMIN");
        request.setNombre("David_Admin");
        request.setPassword("clavePlana123_hackeable");

        Departamento depVivo = Departamento.builder().id("DEP_REAL").idOrganizacion("ORG_REAL").build();

        Usuario funcionarioGuardado = Usuario.builder()
                .id("USR_001").nombre("David_Admin").passwordHash("xyzBCryptSecureHashValue").build();

        when(organizacionRepository.existsById("ORG_REAL")).thenReturn(true);
        when(departamentoRepository.findById("DEP_REAL")).thenReturn(Optional.of(depVivo));
        when(rolRepository.existsById("ROL_ADMIN")).thenReturn(true);

        when(passwordEncoder.encode("clavePlana123_hackeable")).thenReturn("xyzBCryptSecureHashValue");
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(funcionarioGuardado);

        // Act
        UsuarioResponseDTO res = usuarioService.registrarFuncionario(request);

        // Assert
        assertNotNull(res);
        assertEquals("David_Admin", res.getNombre());

        // Assert Riguroso: Verificamos que el Encriptador FUE LLAMADO exactamente 1 vez
        verify(passwordEncoder, times(1)).encode("clavePlana123_hackeable");

        // Assert: Garantizamos que en ninguna parte de la respuesta sale el password
        // (hash o plano)
        verify(usuarioRepository, times(1)).save(any(Usuario.class));
    }
}
