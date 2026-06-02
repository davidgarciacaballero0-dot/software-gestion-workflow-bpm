package com.bpm.data.repositories;

import com.bpm.data.entities.BitacoraAcceso;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BitacoraAccesoRepository extends MongoRepository<BitacoraAcceso, String> {
    List<BitacoraAcceso> findByUsername(String username);
    List<BitacoraAcceso> findByResourceId(String resourceId);
    List<BitacoraAcceso> findAllByOrderByTimestampDesc();
}
