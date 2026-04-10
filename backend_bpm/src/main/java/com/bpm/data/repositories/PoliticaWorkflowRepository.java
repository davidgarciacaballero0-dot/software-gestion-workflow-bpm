package com.bpm.data.repositories;

import com.bpm.data.entities.PoliticaWorkflow;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PoliticaWorkflowRepository extends MongoRepository<PoliticaWorkflow, String> {
    List<PoliticaWorkflow> findByIdOrganizacion(String idOrganizacion);
}
