package com.bpm.domain.services;

import com.bpm.app.dto.AuditoriaResponseDTO;
import com.bpm.data.entities.AuditoriaSistema;
import com.bpm.data.repositories.AuditoriaSistemaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final AuditoriaSistemaRepository auditoriaRepository;

    /**
     * Registra un evento de auditoría en MongoDB (usado internamente por el Aspecto AOP).
     */
    public void registrarEvento(String idUsuario, String accion, String entidadAfectada, String ipOrigen) {
        AuditoriaSistema evento = AuditoriaSistema.builder()
                .idUsuarioActor(idUsuario != null ? idUsuario : "SISTEMA")
                .accion(accion)
                .entidadAfectada(entidadAfectada)
                .ipOrigen(ipOrigen != null ? ipOrigen : "N/A")
                .createdAt(LocalDateTime.now())
                .build();

        auditoriaRepository.save(evento);
    }

    /**
     * Consulta todos los eventos ordenados por fecha descendente.
     */
    public List<AuditoriaResponseDTO> listarTodos() {
        return auditoriaRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Filtra eventos por usuario actor.
     */
    public List<AuditoriaResponseDTO> listarPorUsuario(String idUsuario) {
        return auditoriaRepository.findByIdUsuarioActor(idUsuario).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private AuditoriaResponseDTO mapToDTO(AuditoriaSistema a) {
        AuditoriaResponseDTO dto = new AuditoriaResponseDTO();
        dto.setId(a.getId());
        dto.setIdUsuarioActor(a.getIdUsuarioActor());
        dto.setAccion(a.getAccion());
        dto.setEntidadAfectada(a.getEntidadAfectada());
        dto.setIpOrigen(a.getIpOrigen());
        dto.setCreatedAt(a.getCreatedAt());
        return dto;
    }
}
