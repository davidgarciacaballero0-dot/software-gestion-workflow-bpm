package com.bpm.app.config;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

public class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        // Inyectar valores que normalmente vienen de application.properties
        ReflectionTestUtils.setField(jwtUtil, "secretStr", "BPM_WORKFLOW_SECRET_KEY_2026_ULTRA_SECURE_256BIT");
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 86400000L); // 24h
    }

    @Test
    void debeGenerarTokenValido_YExtraerEmailCorrectamente() {
        // Act
        String token = jwtUtil.generateToken("admin@empresa.gob", "ROL_ADMIN", "USR_001", "ORG_001");

        // Assert
        assertNotNull(token);
        assertTrue(token.startsWith("eyJ")); // Los JWT siempre empiezan con eyJ (base64 del header)
        assertEquals("admin@empresa.gob", jwtUtil.extractEmail(token));
    }

    @Test
    void debeContenerClaimsPersonalizados_RolYOrganizacion() {
        // Act
        String token = jwtUtil.generateToken("director@ministerio.gob", "ROL_DIRECTOR", "USR_077", "ORG_FISCAL");
        Claims claims = jwtUtil.extractClaims(token);

        // Assert
        assertEquals("ROL_DIRECTOR", claims.get("rol"));
        assertEquals("USR_077", claims.get("userId"));
        assertEquals("ORG_FISCAL", claims.get("orgId"));
        assertEquals("director@ministerio.gob", claims.getSubject());
    }

    @Test
    void debeValidarTokenComoVerdadero_CuandoNoHaExpirado() {
        String token = jwtUtil.generateToken("test@test.com", "ROL_TEST", "USR_TEST", "ORG_TEST");
        assertTrue(jwtUtil.isTokenValid(token));
    }

    @Test
    void debeRechazarTokenManipulado_ProteccionContraFalsificacion() {
        String tokenReal = jwtUtil.generateToken("real@empresa.gob", "ROL_ADMIN", "USR_001", "ORG_001");
        
        // Simular ataque: Modificar el payload del token (cambiar un carácter)
        String tokenFalso = tokenReal.substring(0, tokenReal.length() - 5) + "XXXXX";

        // Assert: El motor debe rechazarlo completamente
        assertFalse(jwtUtil.isTokenValid(tokenFalso));
    }

    @Test
    void debeRechazarTokenExpirado() {
        // Crear un JwtUtil con expiración de 0ms (ya expirado al nacer)
        JwtUtil jwtExpired = new JwtUtil();
        ReflectionTestUtils.setField(jwtExpired, "secretStr", "BPM_WORKFLOW_SECRET_KEY_2026_ULTRA_SECURE_256BIT");
        ReflectionTestUtils.setField(jwtExpired, "expirationMs", 0L);

        String tokenExpirado = jwtExpired.generateToken("expirado@test.com", "ROL", "USR", "ORG");
        
        // El token nace ya muerto
        assertFalse(jwtExpired.isTokenValid(tokenExpirado));
    }
}
