package com.bpm.domain.services;

import java.io.InputStream;

/**
 * Interfaz de abstracción para el almacenamiento de archivos.
 * Permite cambiar entre GridFS, Local, AWS S3 o Azure sin afectar la lógica de negocio.
 */
public interface StorageService {

    /**
     * Sube un archivo al almacenamiento configurado.
     * @return El ID único del archivo en el sistema de almacenamiento.
     */
    String uploadFile(InputStream inputStream, String filename, String contentType);

    /**
     * Recupera el flujo de datos de un archivo.
     */
    InputStream downloadFile(String storageId);

    /**
     * Elimina un archivo del almacenamiento.
     */
    void deleteFile(String storageId);

    /**
     * Sube un archivo con estructura jerárquica (ej. organizacionId/politicaId/clienteId/tramiteId/filename)
     */
    default String uploadFileHierarchical(InputStream inputStream, String filename, String contentType, 
            String organizacionId, String politicaId, String clienteId, String tramiteId) {
        return uploadFile(inputStream, filename, contentType); // Fallback por defecto
    }
}
