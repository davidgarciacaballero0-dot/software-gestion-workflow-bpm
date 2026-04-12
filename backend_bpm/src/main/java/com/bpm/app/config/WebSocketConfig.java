package com.bpm.app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilitamos un broker simple en memoria para los prefijos /topic
        config.enableSimpleBroker("/topic");
        // Los mensajes que el cliente envíe al servidor deben empezar con /app
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint de conexión para el cliente (Angular)
        // SetAllowedOriginPatterns("*") permite conexiones desde cualquier origen (ajustar en prod)
        registry.addEndpoint("/ws-bpm")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
