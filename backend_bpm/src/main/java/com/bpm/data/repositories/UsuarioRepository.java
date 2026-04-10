package com.bpm.data.repositories;

import com.bpm.data.entities.Usuario;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UsuarioRepository extends MongoRepository<Usuario, String> {
    List<Usuario> findByIdDepartamento(String idDepartamento);
    Usuario findByEmail(String email); // Útil a futuro para el Login (CU-03)
}
