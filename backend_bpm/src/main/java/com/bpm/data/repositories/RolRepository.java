package com.bpm.data.repositories;

import com.bpm.data.entities.Rol;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RolRepository extends MongoRepository<Rol, String> {
    java.util.List<Rol> findByNombre(String nombre);
}
