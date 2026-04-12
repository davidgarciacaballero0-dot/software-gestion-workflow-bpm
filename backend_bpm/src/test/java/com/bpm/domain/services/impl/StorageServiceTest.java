package com.bpm.domain.services.impl;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StorageServiceTest {

    @Mock
    private GridFsTemplate gridFsTemplate;

    @InjectMocks
    private GridFsStorageService storageService;

    @Test
    void debeSubirArchivoYRetornarObjectIdAsString() {
        // Arrange
        InputStream is = new ByteArrayInputStream("contenido de prueba".getBytes());
        ObjectId mockId = new ObjectId();

        when(gridFsTemplate.store(any(InputStream.class), anyString(), anyString())).thenReturn(mockId);

        // Act
        String resultId = storageService.uploadFile(is, "test.txt", "text/plain");

        // Assert
        assertEquals(mockId.toString(), resultId);
        verify(gridFsTemplate, times(1)).store(any(), eq("test.txt"), eq("text/plain"));
    }

    @Test
    void debeLlamarDeleteEnTemplate_AlBorrarArchivo() {
        // Act
        storageService.deleteFile("some_id");

        // Assert
        verify(gridFsTemplate, times(1)).delete(any(Query.class));
    }
}
