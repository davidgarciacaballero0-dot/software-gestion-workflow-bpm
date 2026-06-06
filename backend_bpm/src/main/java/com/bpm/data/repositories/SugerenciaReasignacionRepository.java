package com.bpm.data.repositories;

import com.bpm.data.entities.SugerenciaReasignacion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * RF-3.4: Repositorio para sugerencias de reasignación semi-automática.
 */
@Repository
public interface SugerenciaReasignacionRepository extends MongoRepository<SugerenciaReasignacion, String> {
    List<SugerenciaReasignacion> findByEstado(String estado);
    List<SugerenciaReasignacion> findByDepartamentoOrigenId(String departamentoOrigenId);
    List<SugerenciaReasignacion> findByEstadoOrderByCreatedAtDesc(String estado);
}
