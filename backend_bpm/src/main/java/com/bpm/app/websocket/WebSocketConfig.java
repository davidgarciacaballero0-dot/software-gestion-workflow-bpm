package com.bpm.app.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration("yjsWebSocketConfig")
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final YjsWebSocketHandler yjsWebSocketHandler;

    public WebSocketConfig(YjsWebSocketHandler yjsWebSocketHandler) {
        this.yjsWebSocketHandler = yjsWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(yjsWebSocketHandler, "/api/v1/yjs/*")
                .setAllowedOrigins("*");
    }
}
