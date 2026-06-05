package com.bpm.data.repositories;

import com.bpm.data.entities.ArchivoAdjunto;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArchivoAdjuntoRepository extends MongoRepository<ArchivoAdjunto, String> {
    List<ArchivoAdjunto> findByIdTramiteInstancia(String idTramiteInstancia);
    List<ArchivoAdjunto> findByIdCliente(String idCliente);
    List<ArchivoAdjunto> findByIdPolitica(String idPolitica);
}
