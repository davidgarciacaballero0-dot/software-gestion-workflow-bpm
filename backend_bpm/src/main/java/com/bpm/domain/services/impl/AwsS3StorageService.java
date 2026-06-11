package com.bpm.domain.services.impl;

import com.bpm.domain.services.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

@Service
@Primary
public class AwsS3StorageService implements StorageService {

    @Value("${aws.s3.bucket}")
    private String bucketName;

    private final S3Client s3Client;
    private final GridFsStorageService gridFsStorageService;

    public AwsS3StorageService(S3Client s3Client, GridFsStorageService gridFsStorageService) {
        this.s3Client = s3Client;
        this.gridFsStorageService = gridFsStorageService;
    }

    @Override
    public String uploadFile(InputStream inputStream, String filename, String contentType) {
        String objectKey = UUID.randomUUID().toString() + "-" + filename;
        
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .contentType(contentType)
                    .build();
            
            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, inputStream.available()));
            return objectKey;
        } catch (IOException e) {
            throw new RuntimeException("Error al leer el archivo para subirlo a AWS S3", e);
        } catch (S3Exception e) {
            throw new RuntimeException("Error al subir archivo a AWS S3: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    @Override
    public String uploadFileHierarchical(InputStream inputStream, String filename, String contentType, 
            String organizacionId, String politicaId, String clienteId, String tramiteId) {
        
        String org = (organizacionId != null && !organizacionId.isEmpty()) ? organizacionId : "default_org";
        String pol = (politicaId != null && !politicaId.isEmpty()) ? politicaId : "default_pol";
        String cli = (clienteId != null && !clienteId.isEmpty()) ? clienteId : "default_cli";
        String tra = (tramiteId != null && !tramiteId.isEmpty()) ? tramiteId : "default_tra";
        
        String objectKey = String.format("%s/%s/%s/%s/%s-%s", 
            org, pol, cli, tra, UUID.randomUUID().toString(), filename);
            
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .contentType(contentType)
                    .build();
            
            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, inputStream.available()));
            return objectKey;
        } catch (IOException e) {
            throw new RuntimeException("Error al leer el archivo jerárquico para subirlo a AWS S3", e);
        } catch (S3Exception e) {
            throw new RuntimeException("Error al subir archivo jerárquico a AWS S3", e);
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
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(storageId)
                    .build();
            
            ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(getObjectRequest);
            return s3Object;
        } catch (NoSuchKeyException e) {
            // Fallback de contingencia: si no se encuentra en S3, probamos con GridFS
            return gridFsStorageService.downloadFile(storageId);
        } catch (S3Exception e) {
            // Si hay un error de conexión a S3, reintentamos con GridFS antes de fallar
            try {
                return gridFsStorageService.downloadFile(storageId);
            } catch (Exception ex) {
                throw new RuntimeException("Error al descargar el archivo de S3 y GridFS", e);
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
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(storageId)
                    .build();
            
            s3Client.deleteObject(deleteObjectRequest);
        } catch (S3Exception e) {
            // Intentamos borrar de GridFS como último recurso
            try {
                gridFsStorageService.deleteFile(storageId);
            } catch (Exception ex) {
                // Ignorar si tampoco existe
            }
        }
    }
}
