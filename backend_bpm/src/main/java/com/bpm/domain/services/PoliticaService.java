package com.bpm.domain.services;

import com.bpm.app.dto.WorkflowRequestDTO;
import com.bpm.app.dto.WorkflowResponseDTO;
import com.bpm.app.exceptions.ResourceNotFoundException;
import com.bpm.data.entities.PoliticaWorkflow;
import com.bpm.data.repositories.OrganizacionRepository;
import com.bpm.data.repositories.PoliticaWorkflowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PoliticaService {

    private final PoliticaWorkflowRepository politicaRepository;
    private final OrganizacionRepository organizacionRepository;

    public WorkflowResponseDTO guardarPolitica(WorkflowRequestDTO dto) {
        if (!organizacionRepository.existsById(dto.getIdOrganizacion())) {
            throw new ResourceNotFoundException("La organización no existe.");
        }

        PoliticaWorkflow politica = PoliticaWorkflow.builder()
                .idOrganizacion(dto.getIdOrganizacion())
                .nombre(dto.getNombre())
                .description(dto.getDescription())
                .version(dto.getVersion() != null ? dto.getVersion() : "1.0")
                .status(dto.getStatus())
                .nodes(dto.getNodes())
                .edges(dto.getEdges())
                .createdAt(LocalDateTime.now())
                .build();

        PoliticaWorkflow guardada = politicaRepository.save(politica);
        return mapearDTO(guardada);
    }

    public List<WorkflowResponseDTO> listarPorOrganizacion(String idOrganizacion) {
        return politicaRepository.findByIdOrganizacion(idOrganizacion).stream()
                .map(this::mapearDTO)
                .collect(Collectors.toList());
    }

    public WorkflowResponseDTO obtenerPolitica(String id) {
        return politicaRepository.findById(id)
                .map(this::mapearDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada con ID: " + id));
    }

    private WorkflowResponseDTO mapearDTO(PoliticaWorkflow entidad) {
        WorkflowResponseDTO dto = new WorkflowResponseDTO();
        dto.setId(entidad.getId());
        dto.setIdOrganizacion(entidad.getIdOrganizacion());
        dto.setNombre(entidad.getNombre());
        dto.setDescription(entidad.getDescription());
        dto.setVersion(entidad.getVersion());
        dto.setStatus(entidad.getStatus());
        dto.setNodes(entidad.getNodes());
        dto.setEdges(entidad.getEdges());
        dto.setCreatedAt(entidad.getCreatedAt());
        dto.setUpdatedAt(entidad.getUpdatedAt());
        return dto;
    }
}
