package com.bpm.domain.services.impl;

import com.bpm.domain.services.StorageService;
import com.mongodb.client.gridfs.model.GridFSFile;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

@Service
public class GridFsStorageService implements StorageService {

    private final GridFsTemplate gridFsTemplate;

    @Autowired
    public GridFsStorageService(GridFsTemplate gridFsTemplate) {
        this.gridFsTemplate = gridFsTemplate;
    }

    @Override
    public String uploadFile(InputStream inputStream, String filename, String contentType) {
        ObjectId fileId = gridFsTemplate.store(inputStream, filename, contentType);
        return fileId.toString();
    }

    @Override
    public InputStream downloadFile(String storageId) {
        GridFSFile gridFSFile = gridFsTemplate.findOne(new Query(Criteria.where("_id").is(storageId)));
        if (gridFSFile == null) {
            throw new RuntimeException("Archivo no encontrado en GridFS: " + storageId);
        }
        try {
            GridFsResource resource = gridFsTemplate.getResource(gridFSFile);
            return resource.getInputStream();
        } catch (IOException e) {
            throw new RuntimeException("Error al leer el archivo de GridFS", e);
        }
    }

    @Override
    public void deleteFile(String storageId) {
        gridFsTemplate.delete(new Query(Criteria.where("_id").is(storageId)));
    }
}
