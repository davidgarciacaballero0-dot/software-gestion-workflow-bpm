package com.bpm.app.config;

import com.bpm.data.entities.BitacoraAcceso;
import com.bpm.data.entities.ArchivoAdjunto;
import com.bpm.app.dto.TramiteResponseDTO;
import com.bpm.data.repositories.BitacoraAccesoRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.stream.Collectors;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class BitacoraAccesoAspect {

    private final BitacoraAccesoRepository bitacoraRepository;

    @AfterReturning(pointcut = "execution(* com.bpm.app.controllers.ArchivoController.*(..))", returning = "result")
    public void auditarArchivo(JoinPoint joinPoint, Object result) {
        try {
            String methodName = joinPoint.getSignature().getName();
            String action = "LECTURA";
            String details = "";
            String resourceId = "N/A";

            if (methodName.equals("uploadFile")) {
                action = "CREACION";
                details = "Archivo subido correctamente";
                resourceId = getResourceIdFromResult(result);
            } else if (methodName.equals("downloadFile")) {
                action = "LECTURA";
                details = "Descarga de archivo";
                resourceId = getArgValue(joinPoint, 0);
            } else if (methodName.equals("iniciarEdicionColaborativa")) {
                action = "MODIFICACION";
                details = "Inicio de edición colaborativa en Google Drive";
                resourceId = getArgValue(joinPoint, 0);
            } else if (methodName.equals("finalizarEdicionColaborativa")) {
                action = "MODIFICACION";
                details = "Finalización y guardado de edición colaborativa en Google Drive";
                resourceId = getArgValue(joinPoint, 1);
            } else if (methodName.equals("listarPorTramite")) {
                action = "LECTURA";
                details = "Listar archivos asociados al trámite";
                resourceId = getArgValue(joinPoint, 0);
            } else {
                return; // No auditar otros métodos
            }

            registrarAcceso(action, "ArchivoAdjunto", resourceId, details);

        } catch (Exception e) {
            log.warn("[BITACORA ACCESO] Error registrando bitácora para archivos: {}", e.getMessage());
        }
    }

    @AfterReturning(pointcut = "execution(* com.bpm.app.controllers.TramiteController.*(..))", returning = "result")
    public void auditarTramite(JoinPoint joinPoint, Object result) {
        try {
            String methodName = joinPoint.getSignature().getName();
            String action = "LECTURA";
            String details = "";
            String resourceId = "N/A";

            if (methodName.equals("iniciarTramite")) {
                action = "CREACION";
                details = "Trámite iniciado";
                resourceId = getResourceIdFromResult(result);
            } else if (methodName.equals("avanzarTramite")) {
                action = "MODIFICACION";
                details = "Trámite avanzado al siguiente nodo";
                resourceId = getResourceIdFromResult(result);
            } else if (methodName.equals("obtenerTramite")) {
                action = "LECTURA";
                details = "Lectura de detalles del trámite";
                resourceId = getArgValue(joinPoint, 0);
            } else if (methodName.equals("listarHistorial")) {
                action = "LECTURA";
                details = "Consulta de historial de trazabilidad";
                resourceId = getArgValue(joinPoint, 0);
            } else if (methodName.equals("intervenirTramite")) {
                action = "MODIFICACION";
                details = "Intervención de trámite por Jefatura";
                resourceId = getResourceIdFromResult(result);
            } else if (methodName.equals("asignarFuncionario")) {
                action = "MODIFICACION";
                details = "Reasignación de funcionario";
                resourceId = getArgValue(joinPoint, 0);
            } else {
                return; // No auditar otros métodos
            }

            registrarAcceso(action, "TramiteInstancia", resourceId, details);

        } catch (Exception e) {
            log.warn("[BITACORA ACCESO] Error registrando bitácora para trámites: {}", e.getMessage());
        }
    }

    @AfterReturning(pointcut = "execution(* com.bpm.app.controllers.OnlyOfficeController.*(..))", returning = "result")
    public void auditarOnlyOffice(JoinPoint joinPoint, Object result) {
        try {
            String methodName = joinPoint.getSignature().getName();
            String action = "LECTURA";
            String details = "";
            String resourceId = "N/A";
            String explicitUsername = null;

            if (methodName.equals("getConfig")) {
                action = "LECTURA";
                details = "Apertura del editor colaborativo OnlyOffice";
                resourceId = getArgValue(joinPoint, 0); // archivoId
                explicitUsername = getArgValue(joinPoint, 1); // idUsuario
            } else if (methodName.equals("downloadForOnlyOffice")) {
                action = "LECTURA";
                details = "Descarga de archivo por OnlyOffice Document Server";
                resourceId = getArgValue(joinPoint, 0); // archivoId
            } else if (methodName.equals("callback")) {
                action = "MODIFICACION";
                details = "Edición y guardado colaborativo en OnlyOffice";
                
                // Extraer del body del callback
                Object[] args = joinPoint.getArgs();
                if (args != null && args.length > 1 && args[1] instanceof java.util.Map) {
                    java.util.Map<?, ?> body = (java.util.Map<?, ?>) args[1];
                    int status = body.containsKey("status") ? (Integer) body.get("status") : 0;
                    if (status == 2 || status == 3) {
                        String keyStr = (String) body.get("key");
                        if (keyStr != null && keyStr.contains("-")) {
                            resourceId = keyStr.split("-")[0];
                        }
                        
                        // Extraer usuarios que participaron en la edición
                        if (body.containsKey("users")) {
                            Object usersObj = body.get("users");
                            if (usersObj instanceof java.util.List) {
                                java.util.List<?> usersList = (java.util.List<?>) usersObj;
                                explicitUsername = usersList.stream()
                                        .map(Object::toString)
                                        .collect(Collectors.joining(", "));
                                details = "Edición colaborativa por los usuarios: " + explicitUsername;
                            }
                        }
                    } else {
                        return; // No auditar otros estados
                    }
                } else {
                    return;
                }
            } else if (methodName.equals("createBlankDocument")) {
                action = "CREACION";
                details = "Creación de documento en blanco desde plantilla";
                if (result instanceof ResponseEntity) {
                    Object body = ((ResponseEntity<?>) result).getBody();
                    if (body instanceof ArchivoAdjunto) {
                        resourceId = ((ArchivoAdjunto) body).getId();
                        explicitUsername = ((ArchivoAdjunto) body).getIdUsuarioSubida();
                    }
                }
            } else {
                return;
            }

            registrarAcceso(action, "ArchivoAdjunto", resourceId, details, explicitUsername);

        } catch (Exception e) {
            log.warn("[BITACORA ACCESO] Error registrando bitácora para OnlyOffice: {}", e.getMessage());
        }
    }

    private void registrarAcceso(String action, String resource, String resourceId, String details) {
        registrarAcceso(action, resource, resourceId, details, null);
    }

    private void registrarAcceso(String action, String resource, String resourceId, String details, String explicitUsername) {
        String username = explicitUsername;
        String role = "N/A";
        
        if (username == null || username.isEmpty() || username.equals("ANONIMO")) {
            username = "ANONIMO";
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                username = auth.getName();
                Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
                if (authorities != null && !authorities.isEmpty()) {
                    role = authorities.stream()
                            .map(GrantedAuthority::getAuthority)
                            .collect(Collectors.joining(","));
                }
            }
        } else {
            role = "USUARIO/COLABORADOR";
        }

        String ipAddress = "N/A";
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            ipAddress = request.getRemoteAddr();
        }

        BitacoraAcceso bitacora = BitacoraAcceso.builder()
                .username(username)
                .role(role)
                .action(action)
                .resource(resource)
                .resourceId(resourceId)
                .details(details)
                .ipAddress(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();

        bitacoraRepository.save(bitacora);
        log.info("[BITACORA ACCESO GRANULAR] Registrada acción: {} sobre recurso: {} (ID: {}) por usuario: {}", 
                action, resource, resourceId, username);
    }

    private String getResourceIdFromResult(Object result) {
        if (result == null) return "N/A";
        if (result instanceof ResponseEntity) {
            Object body = ((ResponseEntity<?>) result).getBody();
            if (body == null) return "N/A";
            if (body instanceof ArchivoAdjunto) {
                return ((ArchivoAdjunto) body).getId();
            } else if (body instanceof TramiteResponseDTO) {
                return ((TramiteResponseDTO) body).getId();
            }
        }
        return "N/A";
    }

    private String getArgValue(JoinPoint joinPoint, int index) {
        Object[] args = joinPoint.getArgs();
        if (args != null && args.length > index && args[index] != null) {
            return args[index].toString();
        }
        return "N/A";
    }
}
