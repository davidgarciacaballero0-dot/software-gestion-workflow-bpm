package com.bpm.app.controllers;

import com.bpm.data.entities.NotificacionPush;
import com.bpm.data.repositories.NotificacionPushRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notificaciones")
public class NotificacionController {

    private final NotificacionPushRepository notificacionRepository;

    @Autowired
    public NotificacionController(NotificacionPushRepository notificacionRepository) {
        this.notificacionRepository = notificacionRepository;
    }

    /**
     * Obtiene todas las notificaciones de un usuario (ordenadas por fecha descendente).
     */
    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<NotificacionPush>> listarPorUsuario(@PathVariable String usuarioId) {
        List<NotificacionPush> notificaciones = notificacionRepository
                .findByIdUsuarioDestino(usuarioId, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(notificaciones);
    }

    /**
     * Obtiene solo las notificaciones no leídas de un usuario.
     */
    @GetMapping("/usuario/{usuarioId}/no-leidas")
    public ResponseEntity<List<NotificacionPush>> listarNoLeidas(@PathVariable String usuarioId) {
        return ResponseEntity.ok(
                notificacionRepository.findByIdUsuarioDestinoAndLeidaFalse(usuarioId));
    }

    /**
     * Marca una notificación como leída.
     */
    @PatchMapping("/{notificacionId}/leer")
    public ResponseEntity<Map<String, String>> marcarComoLeida(@PathVariable String notificacionId) {
        return notificacionRepository.findById(notificacionId)
                .map(notificacion -> {
                    notificacion.setLeida(true);
                    notificacionRepository.save(notificacion);
                    return ResponseEntity.ok(Map.of("status", "ok", "message", "Notificación marcada como leída"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
