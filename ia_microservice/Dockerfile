# ============================================================
# Dockerfile - IA Microservice (FastAPI / Python 3.11)
# ============================================================

FROM python:3.11-slim
WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Puerto expuesto
EXPOSE 8000

# Ejecutar con Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
