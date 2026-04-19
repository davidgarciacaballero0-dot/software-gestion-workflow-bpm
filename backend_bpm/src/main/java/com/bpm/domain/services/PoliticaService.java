package com.bpm.domain.services;

import com.bpm.app.dto.WorkflowRequestDTO;
import com.bpm.app.dto.WorkflowResponseDTO;
import com.bpm.app.exceptions.ResourceNotFoundException;
import com.bpm.app.exceptions.WorkflowValidationException;
import com.bpm.data.entities.PoliticaWorkflow;
import com.bpm.data.entities.embedded.WorkflowNode;
import com.bpm.data.entities.enums.NodeType;
import com.bpm.data.entities.enums.PolicyStatus;
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

        // CU-19: Validación de SLA en nodos tipo USER_TASK
        validarSlas(dto.getNodes());

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

    public List<WorkflowResponseDTO> listarCatalogoPublico() {
        return politicaRepository.findAll().stream()
                .filter(p -> PolicyStatus.PUBLISHED.equals(p.getStatus()))
                .map(this::mapearDTO)
                .collect(Collectors.toList());
    }

    public WorkflowResponseDTO obtenerPolitica(String id) {
        return politicaRepository.findById(id)
                .map(this::mapearDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada con ID: " + id));
    }

    public WorkflowResponseDTO publicarPolitica(String id) {
        PoliticaWorkflow politica = politicaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada con ID: " + id));

        // 1. Validar estructura: START, END (CU-18)
        validarEstructuraParaPublicacion(politica.getNodes());
        // 2. Validar SLAs (CU-19)
        validarSlas(politica.getNodes());

        // 3. Archivar versiones previas
        List<PoliticaWorkflow> previas = politicaRepository.findByIdOrganizacionAndNombre(politica.getIdOrganizacion(), politica.getNombre());
        for (PoliticaWorkflow previa : previas) {
            if (PolicyStatus.PUBLISHED.equals(previa.getStatus()) && !previa.getId().equals(id)) {
                previa.setStatus(PolicyStatus.ARCHIVED);
                politicaRepository.save(previa);
            }
        }

        // 4. Publicar actual
        politica.setStatus(PolicyStatus.PUBLISHED);
        PoliticaWorkflow guardada = politicaRepository.save(politica);
        return mapearDTO(guardada);
    }

    public WorkflowResponseDTO crearNuevaVersion(String id) {
        PoliticaWorkflow politica = politicaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada con ID: " + id));

        String currentVersion = politica.getVersion();
        String nuevaVersion = "1.0";
        try {
            double v = Double.parseDouble(currentVersion);
            nuevaVersion = String.format(java.util.Locale.US, "%.1f", v + 0.1);
        } catch (Exception e) {
            nuevaVersion = currentVersion + "-new";
        }

        PoliticaWorkflow nuevaPolitica = PoliticaWorkflow.builder()
                .idOrganizacion(politica.getIdOrganizacion())
                .nombre(politica.getNombre())
                .description(politica.getDescription())
                .version(nuevaVersion)
                .status(PolicyStatus.DRAFT)
                .nodes(politica.getNodes())
                .edges(politica.getEdges())
                .createdAt(LocalDateTime.now())
                .build();

        PoliticaWorkflow guardada = politicaRepository.save(nuevaPolitica);
        return mapearDTO(guardada);
    }

    private void validarSlas(List<WorkflowNode> nodos) {
        if (nodos == null) return;
        for (WorkflowNode nodo : nodos) {
            if (NodeType.USER_TASK.equals(nodo.getType())) {
                if (nodo.getSlaHours() == null || nodo.getSlaHours() <= 0) {
                    throw new WorkflowValidationException("El nodo '" + nodo.getName() + "' (USER_TASK) debe tener un SLA mayor a 0 horas.");
                }
            }
        }
    }

    private void validarEstructuraParaPublicacion(List<WorkflowNode> nodos) {
        if (nodos == null || nodos.isEmpty()) {
            throw new WorkflowValidationException("La política no tiene nodos. No puede ser publicada.");
        }
        boolean hasStart = false;
        boolean hasEnd = false;
        for (WorkflowNode nodo : nodos) {
            if (NodeType.START.equals(nodo.getType())) hasStart = true;
            if (NodeType.END.equals(nodo.getType())) hasEnd = true;
        }
        if (!hasStart) {
            throw new WorkflowValidationException("La política debe tener al menos un nodo de inicio (START).");
        }
        if (!hasEnd) {
            throw new WorkflowValidationException("La política debe tener al menos un nodo de fin (END).");
        }
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
