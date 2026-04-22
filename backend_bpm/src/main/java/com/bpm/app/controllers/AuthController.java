package com.bpm.app.controllers;

import com.bpm.app.config.JwtUtil;
import com.bpm.app.dto.AuthRequestDTO;
import com.bpm.app.dto.AuthResponseDTO;
import com.bpm.app.dto.RegisterRequestDTO;
import com.bpm.data.entities.Rol;
import com.bpm.data.entities.Usuario;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.RolRepository;
import com.bpm.data.repositories.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final DepartamentoRepository departamentoRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/auth/login — Autenticación para todos los roles
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequestDTO request) {
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail()).orElse(null);

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Credenciales incorrectas. Email no encontrado.\"}");
        }

        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Contraseña rechazada por incompatibilidad de hash.\"}");
        }

        return ResponseEntity.ok(buildAuthResponse(usuario));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/auth/register — Auto-registro público de Cliente Final
    // Homogéneo con DataInitializer: rol=CLIENTE, idOrganizacion=null, idDepartamento=null
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequestDTO request) {

        // 1. Verificar que el email no esté ya registrado
        if (usuarioRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("{\"error\": \"El email ya está registrado en el sistema.\"}");
        }

        // 2. Obtener el rol CLIENTE de la base de datos (consistente con DataInitializer)
        Rol clienteRol = rolRepository.findByNombre("CLIENTE").orElse(null);
        if (clienteRol == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"El rol CLIENTE no está configurado en el sistema.\"}");
        }

        // 3. Parsear fecha de nacimiento si viene en el request
        LocalDateTime fechaNac = null;
        if (request.getFechaNacimiento() != null && !request.getFechaNacimiento().isBlank()) {
            try {
                fechaNac = LocalDateTime.parse(request.getFechaNacimiento());
            } catch (Exception e) {
                fechaNac = LocalDateTime.now().minusYears(18);
            }
        }

        // 4. Crear y persistir el usuario con idOrganizacion=null, idDepartamento=null
        //    (idéntico al patrón de clientes del DataInitializer)
        Usuario nuevoCliente = Usuario.builder()
                .nombre(request.getNombre())
                .apellidos(request.getApellidos())
                .ci(request.getCi())
                .celular(request.getCelular())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .idRol(clienteRol.getId())
                .idOrganizacion(null)   // Cliente externo: sin organización
                .idDepartamento(null)   // Cliente externo: sin departamento
                .fechaNacimiento(fechaNac)
                .createdAt(LocalDateTime.now())
                .build();

        Usuario guardado = usuarioRepository.save(nuevoCliente);

        // 5. Devolver token JWT inmediatamente para login automático post-registro
        return ResponseEntity.status(HttpStatus.CREATED).body(buildAuthResponse(guardado));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER: Construye el AuthResponseDTO + JWT a partir de un Usuario
    // ─────────────────────────────────────────────────────────────────────────
    private AuthResponseDTO buildAuthResponse(Usuario usuario) {
        String token = jwtUtil.generateToken(
                usuario.getEmail(),
                usuario.getIdRol(),
                usuario.getId(),
                usuario.getIdOrganizacion());

        boolean esJefe = departamentoRepository.existsByIdJefe(usuario.getId());

        String nombreRol = "";
        if (usuario.getIdRol() != null) {
            Rol rol = rolRepository.findById(usuario.getIdRol()).orElse(null);
            if (rol != null) nombreRol = rol.getNombre();
        }

        return new AuthResponseDTO(
                usuario.getId(),
                token,
                usuario.getNombre(),
                usuario.getApellidos() != null ? usuario.getApellidos() : "",
                usuario.getEmail(),
                usuario.getCi() != null ? usuario.getCi() : "",
                usuario.getCelular() != null ? usuario.getCelular() : "",
                usuario.getFechaNacimiento() != null ? usuario.getFechaNacimiento().toString() : "",
                usuario.getCreatedAt() != null ? usuario.getCreatedAt().toString() : "",
                usuario.getIdRol(),
                usuario.getIdOrganizacion(),
                esJefe,
                nombreRol,
                usuario.getIdDepartamento());
    }
}

