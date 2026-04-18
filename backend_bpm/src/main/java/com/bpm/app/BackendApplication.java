package com.bpm.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication(scanBasePackages = "com.bpm")
@EnableMongoRepositories(basePackages = "com.bpm.data.repositories")
public class BackendApplication {

	public static void main(String[] args) {
		// Forzado de configuración para entorno Docker si no se detecta la propiedad
		if (System.getProperty("spring.data.mongodb.uri") == null && System.getenv("SPRING_DATA_MONGODB_URI") == null) {
			System.setProperty("spring.data.mongodb.uri", "mongodb://mongodb_bpm:27017/bpm_workflow");
		}
		SpringApplication.run(BackendApplication.class, args);
	}

}
