package com.bpm.data.repositories;

import com.bpm.data.entities.Organizacion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrganizacionRepository extends MongoRepository<Organizacion, String> {
    java.util.List<Organizacion> findByNombre(String nombre);
}
