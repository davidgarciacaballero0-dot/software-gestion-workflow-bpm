package com.bpm.domain.services;

import com.bpm.app.dto.OrganizacionRequestDTO;
import com.bpm.app.dto.OrganizacionResponseDTO;
import com.bpm.app.exceptions.ResourceNotFoundException;
import com.bpm.data.entities.Organizacion;
import com.bpm.data.repositories.OrganizacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizacionService {

    private final OrganizacionRepository organizacionRepository;

    public OrganizacionResponseDTO crearOrganizacion(OrganizacionRequestDTO dto) {
        Organizacion organizacion = Organizacion.builder()
                .nombre(dto.getNombre())
                .esquemaColores(dto.getEsquemaColores())
                // Usamos la fecha manual local temporalmente hasta enchufar MongoAuditing
                .createdAt(LocalDateTime.now()) 
                .build();
        
        Organizacion guardada = organizacionRepository.save(organizacion);
        return mapearDTO(guardada);
    }

    public OrganizacionResponseDTO obtenerPorId(String id) {
        Organizacion organizacion = organizacionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organización (Tenant) no encontrada con ID: " + id));
        return mapearDTO(organizacion);
    }

    public List<OrganizacionResponseDTO> listarTodas() {
        return organizacionRepository.findAll().stream()
                .map(this::mapearDTO)
                .collect(Collectors.toList());
    }

    // Mapeo puro (Idealmente a futuro usar MapStruct si crece la complejidad)
    private OrganizacionResponseDTO mapearDTO(Organizacion entidad) {
        OrganizacionResponseDTO dto = new OrganizacionResponseDTO();
        dto.setId(entidad.getId());
        dto.setNombre(entidad.getNombre());
        dto.setEsquemaColores(entidad.getEsquemaColores());
        dto.setCreatedAt(entidad.getCreatedAt());
        dto.setUpdatedAt(entidad.getUpdatedAt());
        return dto;
    }
}
