package com.bpm.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@SpringBootApplication(scanBasePackages = "com.bpm")
@EnableMongoRepositories(basePackages = "com.bpm.data.repositories")
@EnableMongoAuditing
public class BackendApplication {

	public static void main(String[] args) {
		// Forzado de configuración para entorno local/Docker
		if (System.getProperty("spring.data.mongodb.uri") == null && System.getenv("SPRING_DATA_MONGODB_URI") == null) {
			System.setProperty("spring.data.mongodb.uri", "mongodb://localhost:27017/bpm_workflow");
		}
		SpringApplication.run(BackendApplication.class, args);
	}

}
