package com.bpm.app.controllers;

import com.bpm.app.dto.DesignerEventDTO;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class DesignerCollaborationController {

    /**
     * Recibe actualizaciones del diseñador y las retransmite a todos los suscritos
     * al tópico de la política específica.
     */
    @MessageMapping("/designer/sync")
    @SendTo("/topic/designer")
    public DesignerEventDTO synchronizeDesigner(@Payload DesignerEventDTO event) {
        // En una implementación más robusta podríamos persistir cambios temporales aquí
        // Por ahora, simplemente actuamos como un relay en tiempo real
        return event;
    }
}
