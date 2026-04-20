package com.bpm.data.repositories;

import com.bpm.data.entities.TramiteInstancia;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TramiteInstanciaRepository extends MongoRepository<TramiteInstancia, String> {
    
    // Método crítico para consultar con máxima velocidad las Entradas de un Departamento específico
    List<TramiteInstancia> findByDepartamentoActualId(String departamentoActualId);

    // Consulta de la Bandeja Personal (Trámites iniciados por un usuario)
    List<TramiteInstancia> findByIdUsuarioSolicitante(String idUsuarioSolicitante);

    // Búsqueda por Carnet de Identidad (CI) - REQ FASE 4
    List<TramiteInstancia> findByCiSolicitanteContaining(String ci);
    List<TramiteInstancia> findByCiSolicitante(String ci);
}
