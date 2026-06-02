package com.bpm.domain.services.impl;

import com.bpm.domain.services.StorageService;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.channels.Channels;
import java.util.UUID;

@Service
@Primary
public class GcsStorageService implements StorageService {

    @Value("${gcp.storage.bucket-name:bpm-documentos-adjuntos-798ae}")
    private String bucketName;

    private final Storage storage;
    private final GridFsStorageService gridFsStorageService;

    public GcsStorageService(Storage storage, GridFsStorageService gridFsStorageService) {
        this.storage = storage;
        this.gridFsStorageService = gridFsStorageService;
    }

    @Override
    public String uploadFile(InputStream inputStream, String filename, String contentType) {
        // Generamos un identificador único para evitar colisiones de nombres en el bucket
        String blobName = UUID.randomUUID().toString() + "-" + filename;
        BlobId blobId = BlobId.of(bucketName, blobName);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId).setContentType(contentType).build();

        try {
            storage.create(blobInfo, inputStream.readAllBytes());
            return blobName; // Retornamos el blobName, que se guardará en MongoDB 'gridFsId'
        } catch (IOException e) {
            throw new RuntimeException("Error al subir archivo a Google Cloud Storage", e);
        }
    }

    @Override
    public InputStream downloadFile(String storageId) {
        // ESTRATEGIA DE FALLBACK TRANSPARENTE:
        // Si el storageId es un ObjectId de MongoDB (24 caracteres hexadecimales),
        // es un archivo antiguo que reside en GridFS.
        if (storageId != null && storageId.length() == 24 && storageId.matches("^[0-9a-fA-F]{24}$")) {
            return gridFsStorageService.downloadFile(storageId);
        }

        try {
            Blob blob = storage.get(BlobId.of(bucketName, storageId));
            if (blob == null || !blob.exists()) {
                // Fallback de contingencia: si no se encuentra en GCS, probamos con GridFS
                return gridFsStorageService.downloadFile(storageId);
            }
            return Channels.newInputStream(blob.reader());
        } catch (Exception e) {
            // Si hay un error de conexión a GCS, reintentamos con GridFS antes de fallar
            try {
                return gridFsStorageService.downloadFile(storageId);
            } catch (Exception ex) {
                throw new RuntimeException("Error al descargar el archivo de GCS y GridFS", e);
            }
        }
    }

    @Override
    public void deleteFile(String storageId) {
        if (storageId != null && storageId.length() == 24 && storageId.matches("^[0-9a-fA-F]{24}$")) {
            gridFsStorageService.deleteFile(storageId);
            return;
        }

        try {
            storage.delete(BlobId.of(bucketName, storageId));
        } catch (Exception e) {
            // Intentamos borrar de GridFS como último recurso
            try {
                gridFsStorageService.deleteFile(storageId);
            } catch (Exception ex) {
                // Ignorar si tampoco existe
            }
        }
    }
}
