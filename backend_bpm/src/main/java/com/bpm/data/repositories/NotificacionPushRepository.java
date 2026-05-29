package com.bpm.data.repositories;

import com.bpm.data.entities.NotificacionPush;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificacionPushRepository extends MongoRepository<NotificacionPush, String> {
    List<NotificacionPush> findByIdUsuarioDestinoAndLeidaFalse(String idUsuarioDestino);
    List<NotificacionPush> findByIdUsuarioDestino(String idUsuarioDestino, org.springframework.data.domain.Sort sort);
    
    // <NEW> Buscar tanto personales como de departamento
    List<NotificacionPush> findByIdUsuarioDestinoOrIdDepartamentoDestino(String idUsuario, String idDepto, org.springframework.data.domain.Sort sort);
}
