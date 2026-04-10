package com.bpm.app.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret:BPM_WORKFLOW_SECRET_KEY_2026_ULTRA_SECURE_256BIT}")
    private String secretStr;

    @Value("${jwt.expiration:86400000}") // 24 horas por defecto
    private long expirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretStr.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Genera un JWT firmado con email como subject y rol como claim personalizado.
     */
    public String generateToken(String email, String rolId, String userId, String orgId) {
        return Jwts.builder()
                .subject(email)
                .claim("rol", rolId)
                .claim("userId", userId)
                .claim("orgId", orgId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Extrae todos los claims del token. Lanza excepción si el token es inválido o expirado.
     */
    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
