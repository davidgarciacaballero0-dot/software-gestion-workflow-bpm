package com.bpm.data.repositories;

import com.bpm.data.entities.Usuario;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UsuarioRepository extends MongoRepository<Usuario, String> {
    List<Usuario> findByIdDepartamento(String idDepartamento);
    java.util.Optional<Usuario> findByEmail(String email); // Útil para Login e idempotencia
}
