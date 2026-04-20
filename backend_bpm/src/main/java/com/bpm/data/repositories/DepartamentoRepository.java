package com.bpm.data.repositories;

import com.bpm.data.entities.Departamento;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartamentoRepository extends MongoRepository<Departamento, String> {
    List<Departamento> findByIdOrganizacion(String idOrganizacion);
    java.util.Optional<Departamento> findByNombre(String nombre);
    boolean existsByIdJefe(String idJefe); // Verificar si un usuario es jefe de algún departamento
}
