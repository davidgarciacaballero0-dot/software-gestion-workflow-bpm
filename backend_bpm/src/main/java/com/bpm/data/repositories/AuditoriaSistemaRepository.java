package com.bpm.data.repositories;

import com.bpm.data.entities.AuditoriaSistema;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditoriaSistemaRepository extends MongoRepository<AuditoriaSistema, String> {
    List<AuditoriaSistema> findByIdUsuarioActor(String idUsuarioActor);
    List<AuditoriaSistema> findByCreatedAtBetween(LocalDateTime desde, LocalDateTime hasta);
    List<AuditoriaSistema> findAllByOrderByCreatedAtDesc(); // Los más recientes primero
}
