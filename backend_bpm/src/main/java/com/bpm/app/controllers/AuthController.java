package com.bpm.app.controllers;

import com.bpm.app.config.JwtUtil;
import com.bpm.app.dto.AuthRequestDTO;
import com.bpm.app.dto.AuthResponseDTO;
import com.bpm.data.entities.Usuario;
import com.bpm.data.repositories.UsuarioRepository;
import com.bpm.data.repositories.DepartamentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final DepartamentoRepository departamentoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequestDTO request) {
        // 1. Buscar usuario por email en MongoDB
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail());

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Credenciales incorrectas. Email no encontrado.\"}");
        }

        // 2. Comparar password plano del request con el hash BCrypt almacenado
        if (!passwordEncoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("{\"error\": \"Contraseña rechazada por incompatibilidad de hash.\"}");
        }

        // 3. Generar JWT firmado con claims del usuario autenticado
        String token = jwtUtil.generateToken(
                usuario.getEmail(),
                usuario.getIdRol(),
                usuario.getId(),
                usuario.getIdOrganizacion());

        // 3.5 Verificar si es Jefe estructural
        boolean esJefe = departamentoRepository.existsByIdJefe(usuario.getId());

        // 4. Devolver token + metadata segura (sin password)
        AuthResponseDTO response = new AuthResponseDTO(
                token,
                usuario.getNombre(),
                usuario.getIdRol(),
                usuario.getIdOrganizacion(),
                esJefe);

        return ResponseEntity.ok(response);
    }
}
