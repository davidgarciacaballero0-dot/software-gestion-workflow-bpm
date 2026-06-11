package com.bpm.domain.services.impl;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AwsS3StorageServiceTest {

    @Mock
    private S3Client s3Client;

    @Mock
    private GridFsStorageService gridFsStorageService;

    @InjectMocks
    private AwsS3StorageService awsS3StorageService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(awsS3StorageService, "bucketName", "test-bucket");
    }

    @Test
    void debeSubirArchivoAAwsS3Exitosamente() {
        // Arrange
        InputStream is = new ByteArrayInputStream("contenido s3".getBytes());
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        // Act
        String storageId = awsS3StorageService.uploadFile(is, "documento.pdf", "application/pdf");

        // Assert
        assertNotNull(storageId);
        assertTrue(storageId.contains("-documento.pdf"));
        verify(s3Client, times(1)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void debeDescargarDeGridFsSiElIdEsObjectIdDeMongoDB() {
        // Arrange
        String gridFsId = new ObjectId().toString(); // ID de 24 caracteres hex
        InputStream expectedStream = new ByteArrayInputStream("contenido antiguo".getBytes());
        when(gridFsStorageService.downloadFile(gridFsId)).thenReturn(expectedStream);

        // Act
        InputStream resultStream = awsS3StorageService.downloadFile(gridFsId);

        // Assert
        assertSame(expectedStream, resultStream);
        verify(gridFsStorageService, times(1)).downloadFile(gridFsId);
        verifyNoInteractions(s3Client);
    }

    @Test
    @SuppressWarnings("unchecked")
    void debeDescargarDeAwsS3SiExisteElObjeto() {
        // Arrange
        String s3Id = "uuid-documento.pdf";
        ResponseInputStream<GetObjectResponse> mockS3Object = mock(ResponseInputStream.class);
        
        when(s3Client.getObject(any(GetObjectRequest.class))).thenReturn(mockS3Object);

        // Act
        InputStream resultStream = awsS3StorageService.downloadFile(s3Id);

        // Assert
        assertNotNull(resultStream);
        verify(s3Client, times(1)).getObject(any(GetObjectRequest.class));
        verifyNoInteractions(gridFsStorageService);
    }

    @Test
    void debeHacerFallbackAGridFsSiElObjetoNoExisteEnS3() {
        // Arrange
        String s3Id = "uuid-inexistente.pdf";
        InputStream expectedStream = new ByteArrayInputStream("fallback content".getBytes());
        
        when(s3Client.getObject(any(GetObjectRequest.class))).thenThrow(NoSuchKeyException.builder().build());
        when(gridFsStorageService.downloadFile(s3Id)).thenReturn(expectedStream);

        // Act
        InputStream resultStream = awsS3StorageService.downloadFile(s3Id);

        // Assert
        assertSame(expectedStream, resultStream);
        verify(s3Client, times(1)).getObject(any(GetObjectRequest.class));
        verify(gridFsStorageService, times(1)).downloadFile(s3Id);
    }

    @Test
    void debeEliminarDeGridFsSiElIdEsObjectIdDeMongoDB() {
        // Arrange
        String gridFsId = new ObjectId().toString();

        // Act
        awsS3StorageService.deleteFile(gridFsId);

        // Assert
        verify(gridFsStorageService, times(1)).deleteFile(gridFsId);
        verifyNoInteractions(s3Client);
    }

    @Test
    void debeEliminarDeS3Exitosamente() {
        // Arrange
        String s3Id = "uuid-documento.pdf";
        when(s3Client.deleteObject(any(DeleteObjectRequest.class)))
                .thenReturn(DeleteObjectResponse.builder().build());

        // Act
        awsS3StorageService.deleteFile(s3Id);

        // Assert
        verify(s3Client, times(1)).deleteObject(any(DeleteObjectRequest.class));
    }
}
