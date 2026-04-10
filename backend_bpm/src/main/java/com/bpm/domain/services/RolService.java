package com.bpm.domain.services;

import com.bpm.app.dto.RolRequestDTO;
import com.bpm.app.dto.RolResponseDTO;
import com.bpm.app.exceptions.ResourceNotFoundException;
import com.bpm.data.entities.Rol;
import com.bpm.data.repositories.RolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RolService {

    private final RolRepository rolRepository;

    public RolResponseDTO crearRol(RolRequestDTO request) {
        Rol rol = Rol.builder()
                .nombre(request.getNombre())
                .permisos(request.getPermisos())
                .createdAt(LocalDateTime.now())
                .build();
        
        Rol guardado = rolRepository.save(rol);
        return mapToDTO(guardado);
    }

    public List<RolResponseDTO> listarRoles() {
        return rolRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public RolResponseDTO obtenerPorId(String id) {
        return rolRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no hallado en la Base de Datos con ID: " + id));
    }

    private RolResponseDTO mapToDTO(Rol r) {
        RolResponseDTO dto = new RolResponseDTO();
        dto.setId(r.getId());
        dto.setNombre(r.getNombre());
        dto.setPermisos(r.getPermisos());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
