package com.bpm.data.repositories;

import com.bpm.data.entities.EventoHistorial;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventoHistorialRepository extends MongoRepository<EventoHistorial, String> {
    List<EventoHistorial> findByIdTramite(String idTramite);
}
