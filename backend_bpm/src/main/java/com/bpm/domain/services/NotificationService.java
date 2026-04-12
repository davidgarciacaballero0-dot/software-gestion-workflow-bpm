package com.bpm.domain.services;

import com.bpm.data.entities.NotificacionPush;
import com.bpm.data.repositories.NotificacionPushRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificacionPushRepository notificacionRepository;

    @Autowired
    public NotificationService(SimpMessagingTemplate messagingTemplate, 
                               NotificacionPushRepository notificacionRepository) {
        this.messagingTemplate = messagingTemplate;
        this.notificacionRepository = notificacionRepository;
    }

    /**
     * Envía una notificación en tiempo real a un departamento específico.
     */
    public void notificarDepartamento(String departamentoId, String titulo, String mensaje) {
        String topic = "/topic/department/" + departamentoId;
        
        NotificacionPush notification = NotificacionPush.builder()
                .titulo(titulo)
                .mensaje(mensaje)
                .leida(false)
                .createdAt(LocalDateTime.now())
                .build();

        // Enviamos por WebSocket
        messagingTemplate.convertAndSend(topic, notification);
    }

    /**
     * Envía una notificación en tiempo real a un usuario específico.
     */
    public void notificarUsuario(String usuarioId, String titulo, String mensaje) {
        String topic = "/topic/user/" + usuarioId;
        
        NotificacionPush notification = NotificacionPush.builder()
                .idUsuarioDestino(usuarioId)
                .titulo(titulo)
                .mensaje(mensaje)
                .leida(false)
                .createdAt(LocalDateTime.now())
                .build();

        // 1. Persistimos la notificación en BD
        notificacionRepository.save(notification);
        
        // 2. Enviamos por WebSocket
        messagingTemplate.convertAndSend(topic, notification);
    }
}
