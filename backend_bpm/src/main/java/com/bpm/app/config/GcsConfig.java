package com.bpm.app.config;

import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GcsConfig {

    @Bean
    public Storage googleCloudStorage() {
        // Inicializa el cliente de Storage buscando credenciales de entorno (ADC) automáticamente.
        return StorageOptions.getDefaultInstance().getService();
    }
}
