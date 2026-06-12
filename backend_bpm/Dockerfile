# ============================================================
# Dockerfile - Backend BPM (Spring Boot 4 / Java 17)
# ============================================================

# --- Etapa Única: Runtime ligero ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copiar JAR compilado localmente
COPY target/*.jar app.jar

# Puerto expuesto por Spring Boot
EXPOSE 8080

# Punto de entrada
ENTRYPOINT ["java", "-jar", "app.jar"]
