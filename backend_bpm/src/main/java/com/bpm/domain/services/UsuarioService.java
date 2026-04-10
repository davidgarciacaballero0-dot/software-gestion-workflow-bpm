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
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final OrganizacionRepository organizacionRepository;
    private final DepartamentoRepository departamentoRepository;
    private final RolRepository rolRepository;
    
    // Inyección del motor de encriptación
    private final PasswordEncoder passwordEncoder;

    public UsuarioResponseDTO registrarFuncionario(UsuarioRequestDTO request) {
        
        // --- 1. THE TRIPLE VALIDATION RING --- //
        if (!organizacionRepository.existsById(request.getIdOrganizacion())) {
            throw new ResourceNotFoundException("[BLOQUEADO] Organización no válida: " + request.getIdOrganizacion());
        }
        
        Departamento depto = departamentoRepository.findById(request.getIdDepartamento())
            .orElseThrow(() -> new ResourceNotFoundException("[BLOQUEADO] Departamento Inexistente en los registros."));
            
        // Regla de Seguridad: Cross-Tenant Injection.
        // Impedir que se una a un departamento robando referencias de otra Organización.
        if (!depto.getIdOrganizacion().equals(request.getIdOrganizacion())) {
            throw new ResourceNotFoundException("[BRECHA FRENADA] El departamento proporcionado no pertenece a la Organización del Usuario.");
        }

        if (!rolRepository.existsById(request.getIdRol())) {
            throw new ResourceNotFoundException("[BLOQUEADO] Esquema de jerarquía (Rol) ficticio o no registrado.");
        }

        // --- 2. TRANSMUTACIÓN SEGURA (PASSWORD BINDING) --- //
        Usuario usuario = Usuario.builder()
                .idOrganizacion(request.getIdOrganizacion())
                .idDepartamento(request.getIdDepartamento())
                .idRol(request.getIdRol())
                .nombre(request.getNombre())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword())) // ENCRIPTACIÓN BCrypt en vuelo
                .createdAt(LocalDateTime.now())
                .build();

        Usuario adminGuardado = usuarioRepository.save(usuario);
        return mapToDTO(adminGuardado);
    }
    
    public List<UsuarioResponseDTO> listarPorDepartamento(String idDepartamento) {
        // En Spring Data el 'findByData' viene autogenerado, lo referenciamos en el repositorio.
        return usuarioRepository.findByIdDepartamento(idDepartamento).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private UsuarioResponseDTO mapToDTO(Usuario u) {
        UsuarioResponseDTO dto = new UsuarioResponseDTO();
        dto.setId(u.getId());
        dto.setIdOrganizacion(u.getIdOrganizacion());
        dto.setIdDepartamento(u.getIdDepartamento());
        dto.setIdRol(u.getIdRol());
        dto.setNombre(u.getNombre());
        dto.setEmail(u.getEmail());
        dto.setCreatedAt(u.getCreatedAt());
        // EL HASH NO SE MAPEA AL DTO: Seguridad total de tráfico de redes
        return dto;
    }
}
