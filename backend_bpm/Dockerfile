# ============================================================
# Dockerfile - Backend BPM (Spring Boot 4 / Java 17)
# Multi-stage build para imagen ligera de producción
# ============================================================

# --- Etapa 1: Build con Maven ---
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Copiar archivos de dependencias primero (cache de capas Docker)
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw && ./mvnw dependency:resolve -B

# Copiar código fuente y compilar
COPY src ./src
RUN ./mvnw package -DskipTests -B

# --- Etapa 2: Runtime ligero ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copiar JAR compilado desde la etapa builder
COPY --from=builder /app/target/*.jar app.jar

# Puerto expuesto por Spring Boot
EXPOSE 8080

# Punto de entrada
ENTRYPOINT ["java", "-jar", "app.jar"]
