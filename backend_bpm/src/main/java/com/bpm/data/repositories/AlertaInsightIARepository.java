package com.bpm.data.repositories;

import com.bpm.data.entities.AlertaInsightIA;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertaInsightIARepository extends MongoRepository<AlertaInsightIA, String> {
    List<AlertaInsightIA> findByIdDepartamentoAfectado(String idDepartamentoAfectado);
}
