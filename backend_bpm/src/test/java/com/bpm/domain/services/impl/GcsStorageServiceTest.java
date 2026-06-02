package com.bpm.domain.services.impl;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import com.google.cloud.ReadChannel;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GcsStorageServiceTest {

    @Mock
    private Storage storage;

    @Mock
    private GridFsStorageService gridFsStorageService;

    @InjectMocks
    private GcsStorageService gcsStorageService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(gcsStorageService, "bucketName", "test-bucket");
    }

    @Test
    void debeSubirArchivoAGcsExitosamente() throws IOException {
        // Arrange
        InputStream is = new ByteArrayInputStream("contenido gcs".getBytes());
        Blob mockBlob = mock(Blob.class);
        when(storage.create(any(BlobInfo.class), any(byte[].class))).thenReturn(mockBlob);

        // Act
        String storageId = gcsStorageService.uploadFile(is, "documento.pdf", "application/pdf");

        // Assert
        assertNotNull(storageId);
        assertTrue(storageId.contains("-documento.pdf"));
        verify(storage, times(1)).create(any(BlobInfo.class), any(byte[].class));
    }

    @Test
    void debeDescargarDeGridFsSiElIdEsObjectIdDeMongoDB() {
        // Arrange
        String gridFsId = new ObjectId().toString(); // ID de 24 caracteres hex
        InputStream expectedStream = new ByteArrayInputStream("contenido antiguo".getBytes());
        when(gridFsStorageService.downloadFile(gridFsId)).thenReturn(expectedStream);

        // Act
        InputStream resultStream = gcsStorageService.downloadFile(gridFsId);

        // Assert
        assertSame(expectedStream, resultStream);
        verify(gridFsStorageService, times(1)).downloadFile(gridFsId);
        verifyNoInteractions(storage);
    }

    @Test
    void debeDescargarDeGcsSiExisteElBlob() throws IOException {
        // Arrange
        String gcsId = "uuid-documento.pdf";
        Blob mockBlob = mock(Blob.class);
        ReadChannel mockReader = mock(ReadChannel.class);
        
        when(storage.get(any(BlobId.class))).thenReturn(mockBlob);
        when(mockBlob.exists()).thenReturn(true);
        when(mockBlob.reader()).thenReturn(mockReader);

        // Act
        InputStream resultStream = gcsStorageService.downloadFile(gcsId);

        // Assert
        assertNotNull(resultStream);
        verify(storage, times(1)).get(eq(BlobId.of("test-bucket", gcsId)));
        verifyNoInteractions(gridFsStorageService);
    }

    @Test
    void debeHacerFallbackAGridFsSiElBlobNoExisteEnGcs() {
        // Arrange
        String gcsId = "uuid-inexistente.pdf";
        InputStream expectedStream = new ByteArrayInputStream("fallback content".getBytes());
        
        when(storage.get(any(BlobId.class))).thenReturn(null);
        when(gridFsStorageService.downloadFile(gcsId)).thenReturn(expectedStream);

        // Act
        InputStream resultStream = gcsStorageService.downloadFile(gcsId);

        // Assert
        assertSame(expectedStream, resultStream);
        verify(storage, times(1)).get(eq(BlobId.of("test-bucket", gcsId)));
        verify(gridFsStorageService, times(1)).downloadFile(gcsId);
    }

    @Test
    void debeEliminarDeGridFsSiElIdEsObjectIdDeMongoDB() {
        // Arrange
        String gridFsId = new ObjectId().toString();

        // Act
        gcsStorageService.deleteFile(gridFsId);

        // Assert
        verify(gridFsStorageService, times(1)).deleteFile(gridFsId);
        verifyNoInteractions(storage);
    }

    @Test
    void debeEliminarDeGcsExitosamente() {
        // Arrange
        String gcsId = "uuid-documento.pdf";
        when(storage.delete(any(BlobId.class))).thenReturn(true);

        // Act
        gcsStorageService.deleteFile(gcsId);

        // Assert
        verify(storage, times(1)).delete(eq(BlobId.of("test-bucket", gcsId)));
    }
}
