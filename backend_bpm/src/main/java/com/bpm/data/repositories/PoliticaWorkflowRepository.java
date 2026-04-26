package com.bpm.data.repositories;

import com.bpm.data.entities.PoliticaWorkflow;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PoliticaWorkflowRepository extends MongoRepository<PoliticaWorkflow, String> {
    List<PoliticaWorkflow> findByIdOrganizacion(String idOrganizacion);

    java.util.Optional<PoliticaWorkflow> findByNombre(String nombre);

    java.util.Optional<PoliticaWorkflow> findByNombreAndIdOrganizacion(String nombre, String idOrganizacion);

    // Para versionado en el futuro
    List<PoliticaWorkflow> findByIdOrganizacionAndNombre(String idOrganizacion, String nombre);
}
