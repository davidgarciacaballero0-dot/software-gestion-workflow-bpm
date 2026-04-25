package com.bpm.app.config;

import com.bpm.domain.services.AuditoriaService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Aspecto AOP que intercepta automáticamente cada operación de negocio
 * y registra un evento de auditoría sin modificar los servicios existentes.
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditoriaAspect {

    private final AuditoriaService auditoriaService;

    /**
     * Intercepta TODOS los métodos públicos dentro del paquete de servicios de
     * dominio.
     * Se ejecuta DESPUÉS de que el método retorne exitosamente.
     */
    @AfterReturning(pointcut = "execution(* com.bpm.domain.services.*.*(..))", returning = "result")
    public void auditarOperacion(JoinPoint joinPoint, Object result) {
        try {
            // Extraer el usuario autenticado del SecurityContext (JWT parseado por el
            // filtro)
            String emailUsuario = "ANONIMO";
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                emailUsuario = auth.getName();
            }

            // Extraer IP de origen de la petición HTTP
            String ipOrigen = "N/A";
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                ipOrigen = request.getRemoteAddr();
            }

            // Construir descripción de la acción
            String claseServicio = joinPoint.getTarget().getClass().getSimpleName();
            String metodo = joinPoint.getSignature().getName();
            String accion = claseServicio + "." + metodo + "()";

            // Evitar recursión infinita: NO auditar las operaciones del propio
            // AuditoriaService
            if (claseServicio.equals("AuditoriaService")) {
                return;
            }

            auditoriaService.registrarEvento(emailUsuario, accion, claseServicio, ipOrigen);
            log.debug("[AUDITORIA] {} ejecutó {} desde IP {}", emailUsuario, accion, ipOrigen);

        } catch (Exception e) {
            // La auditoría JAMÁS debe bloquear una operación de negocio
            log.warn("[AUDITORIA] Error silencioso al registrar evento: {}", e.getMessage());
        }
    }
}
