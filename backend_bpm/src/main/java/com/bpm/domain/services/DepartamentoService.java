package com.bpm.domain.services;

import com.bpm.app.dto.DepartamentoRequestDTO;
import com.bpm.app.dto.DepartamentoResponseDTO;
import com.bpm.app.exceptions.ResourceNotFoundException;
import com.bpm.data.entities.Departamento;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.OrganizacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartamentoService {

    private final DepartamentoRepository departamentoRepository;
    private final OrganizacionRepository organizacionRepository; 

    public DepartamentoResponseDTO crearDepartamento(DepartamentoRequestDTO dto) {
        // Regla de Negocio: Validar Integridad Jerárquica 
        if (!organizacionRepository.existsById(dto.getIdOrganizacion())) {
            throw new ResourceNotFoundException("Denegado: La Organización (Tenant) con ID " + dto.getIdOrganizacion() + " no existe.");
        }

        Departamento dep = Departamento.builder()
                .idOrganizacion(dto.getIdOrganizacion())
                .idDepartamentoPadre(dto.getIdDepartamentoPadre())
                .nombre(dto.getNombre())
                .codigoArea(dto.getCodigoArea())
                .createdAt(LocalDateTime.now())
                .build();

        Departamento guardado = departamentoRepository.save(dep);
        return mapearDTO(guardado);
    }

    public List<DepartamentoResponseDTO> listarPorOrganizacion(String idOrganizacion) {
        // Regla: Extraer ramas corporativas de la organización actual
        return departamentoRepository.findByIdOrganizacion(idOrganizacion).stream()
                .map(this::mapearDTO)
                .collect(Collectors.toList());
    }

    private DepartamentoResponseDTO mapearDTO(Departamento entidad) {
        DepartamentoResponseDTO dto = new DepartamentoResponseDTO();
        dto.setId(entidad.getId());
        dto.setIdOrganizacion(entidad.getIdOrganizacion());
        dto.setIdDepartamentoPadre(entidad.getIdDepartamentoPadre());
        dto.setNombre(entidad.getNombre());
        dto.setCodigoArea(entidad.getCodigoArea());
        dto.setCreatedAt(entidad.getCreatedAt());
        dto.setUpdatedAt(entidad.getUpdatedAt());
        return dto;
    }
}
