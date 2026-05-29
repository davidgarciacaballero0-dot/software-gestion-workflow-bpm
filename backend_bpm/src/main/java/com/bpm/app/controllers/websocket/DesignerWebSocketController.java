package com.bpm.app.controllers.websocket;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class DesignerWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    public DesignerWebSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Recibe eventos de sincronización del diseñador BPM.
     * El payload debe contener 'idPolitica' para saber a qué diagrama pertenece la actualización.
     */
    @MessageMapping("/designer/sync")
    public void syncDesignerEvent(@Payload Map<String, Object> payload) {
        String idPolitica = (String) payload.get("idPolitica");

        if (idPolitica != null && !idPolitica.isEmpty()) {
            // Re-enviamos el payload solo a los usuarios suscritos a esta política en particular
            messagingTemplate.convertAndSend("/topic/designer/" + idPolitica, (Object) payload);
        }
    }
}
