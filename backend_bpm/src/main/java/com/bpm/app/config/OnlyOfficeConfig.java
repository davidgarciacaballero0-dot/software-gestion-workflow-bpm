package com.bpm.app.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OnlyOfficeConfig {

    @Value("${ONLYOFFICE_JWT_SECRET:super-secret-jwt-onlyoffice-2026-secure}")
    private String jwtSecret;

    @Value("${bpm.base.url:http://localhost:8080}")
    private String baseUrl;

    public String getJwtSecret() {
        return jwtSecret;
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}
