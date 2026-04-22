import os
import json
import re
from typing import List, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv() # Cargar desde CWD
api_key = os.getenv("GEMINI_API_KEY")

def is_quota_error(exception):
    return "429" in str(exception) or "quota" in str(exception).lower()

if not api_key:
    print("ADVERTENCIA: GEMINI_API_KEY no encontrada")
else:
    genai.configure(api_key=api_key)

app = FastAPI(title="Cerebro IA - BPM Workflow", version="1.2.0")

# --- Configuración de CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos de Datos ---

class FlowRequest(BaseModel):
    prompt: str

class MetricData(BaseModel):
    departamentoId: str
    nombreDepartamento: str
    tiempoPromedioHoras: float
    cantidadTramites: int
    capacidadPersonal: int

class AnalysisRequest(BaseModel):
    metricas: List[MetricData]

# --- Configuración de Instrucción de Sistema ---

SYSTEM_INSTRUCTION = """
Tu objetivo es actuar como el cerebro analítico de un sistema de gestión de flujos de trabajo (BPM).
Eres un Consultor Senior de BPM y Especialista en Optimización Operativa.

REGLAS DE OPERACIÓN:

1. GENERACIÓN DE FLUJOS:
   - Devuelve un JSON estrictamente válido según el esquema PoliticaWorkflow.
   - Incluye nodos, conexiones y definiciones de formulario detalladas.
   - Responde ÚNICAMENTE con el objeto JSON.

2. ANÁLISIS DE CUELLOS DE BOTELLA Y REOPTIMIZACIÓN:
   - Recibirás una lista de métricas por departamento.
   - Identifica el departamento con mayor latencia (tiempo promedio alto) y alta carga (muchos trámites).
   - Genera una RECOMENDACIÓN de reasignación de personal cuantificable.
   - **IMPORTANTE**: Al final del texto, incluye una sección llamada [DATA_PROJECTION] con un JSON que contenga:
     `{"departamentos": ["NombreA", "NombreB"], "mejora_tiempo": [20, 15], "carga_final": [10, 12]}`.
   - Proporciona una JUSTIFICACIÓN ESTADÍSTICA detallada.
   - FORMATO REQUERIDO: [RESUMEN], [MÉTRICAS_CRÍTICAS], [RECOMENDACIÓN], [JUSTIFICACIÓN], [DATA_PROJECTION].
"""

model_logic = genai.GenerativeModel(model_name="models/gemini-1.5-flash", system_instruction=SYSTEM_INSTRUCTION)
model_creative = genai.GenerativeModel(model_name="models/gemini-1.5-flash", system_instruction=SYSTEM_INSTRUCTION)

def extract_json(text: str) -> dict:
    """Intenta extraer un objeto JSON de un texto sucio (con markdown o texto extra)."""
    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return json.loads(text)
    except:
        raise ValueError("No se pudo extraer un JSON válido de la respuesta de la IA.")

@app.get("/")
def read_root():
    return {"status": "online", "key_configured": bool(api_key)}

@app.post("/ia/generar-flujo")
@retry(
    wait=wait_exponential(multiplier=1, min=2, max=15),
    stop=stop_after_attempt(5),
    retry=retry_if_exception(is_quota_error),
    reraise=True
)
async def generar_flujo(req: FlowRequest):
    prompt = f"Genera un flujo de trabajo para: {req.prompt}. Devuelve solo JSON."
    response = model_creative.generate_content(prompt)
    return extract_json(response.text)

@app.post("/ia/analizar-rendimiento")
@retry(
    wait=wait_exponential(multiplier=1, min=2, max=15),
    stop=stop_after_attempt(5),
    retry=retry_if_exception(is_quota_error),
    reraise=True
)
async def analizar_rendimiento(req: AnalysisRequest):
    data_str = json.dumps([m.dict() for m in req.metricas])
    prompt = f"Analiza y genera recomendaciones para estas métricas: {data_str}"
    response = model_logic.generate_content(prompt)
    return {"reporte": response.text}

@app.post("/ia/asistente")
@retry(
    wait=wait_exponential(multiplier=1, min=2, max=15),
    stop=stop_after_attempt(5),
    retry=retry_if_exception(is_quota_error),
    reraise=True
)
async def asistente_virtual(req: FlowRequest):
    """Responder consultas generales sobre el uso del sistema BPM."""
    prompt = f"Como asistente virtual del sistema BPM, responde de forma concisa (máx 2 párrafos). Evita datos sensibles: {req.prompt}"
    response = model_logic.generate_content(prompt)
    return {"respuesta": response.text}

# ============================================================
# ENDPOINT RAG: Reporte por Comando de Voz (CU-15 + CU-16)
# ============================================================

@app.post("/ia/generar-reporte")
@retry(
    wait=wait_exponential(multiplier=1, min=2, max=15),
    stop=stop_after_attempt(5),
    retry=retry_if_exception(is_quota_error),
    reraise=True
)
async def generar_reporte_voz(req: FlowRequest):
    """
    Patrón RAG: Recupera datos reales de MongoDB, los empaqueta con la
    consulta de voz del usuario y genera un reporte analítico con Gemini.
    """
    # 1. Obtener datos crudos de MongoDB
    datos_crudos = obtener_estadisticas_db()

    # 2. Construir el prompt RAG con contexto real
    prompt = f"""
    El usuario ha solicitado (posiblemente por voz): '{req.prompt}'.

    A continuación tienes los datos estadísticos REALES extraídos de la base de datos MongoDB del sistema BPM:
    {json.dumps(datos_crudos, ensure_ascii=False, default=str)}

    Con base en estos datos reales, genera un reporte analítico que incluya:
    1. [RESUMEN]: Un resumen ejecutivo de la situación actual.
    2. [MÉTRICAS_CRÍTICAS]: Los departamentos con mayor carga y riesgo de cuello de botella.
    3. [RECOMENDACIÓN]: Acciones concretas de optimización con justificación estadística.
    4. [PROYECCIÓN]: Qué mejoras se esperarían si se aplican las recomendaciones.

    Sé preciso, usa los datos reales proporcionados, no inventes cifras.
    """

    response = model_logic.generate_content(prompt)
    return {"reporte": response.text}


def obtener_estadisticas_db() -> dict:
    """Conecta directamente a MongoDB y extrae estadísticas crudas."""
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/bpm_workflow")
    try:
        from pymongo import MongoClient
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
        db = client.get_default_database() if "/" in mongo_uri.split("://")[-1] else client["bpm_workflow"]

        # Estadísticas de departamentos
        departamentos = list(db.departamentos.find({}, {"_id": 0, "nombre": 1}))

        # Estadísticas de políticas/workflows
        politicas = list(db.politicas_workflow.find({}, {"_id": 0, "nombre": 1, "status": 1, "version": 1}))
        total_politicas = len(politicas)

        # Estadísticas de trámites
        tramites = list(db.tramite_instancias.find({}, {"_id": 0, "estado": 1, "departamentoActualId": 1}))
        total_tramites = len(tramites)
        tramites_activos = sum(1 for t in tramites if t.get("estado") in ["EN_PROGRESO", "PENDIENTE"])

        # Estadísticas de usuarios
        total_usuarios = db.usuarios.count_documents({})

        client.close()

        return {
            "total_departamentos": len(departamentos),
            "departamentos": departamentos[:20],
            "total_politicas": total_politicas,
            "politicas": politicas[:10],
            "total_tramites": total_tramites,
            "tramites_activos": tramites_activos,
            "total_usuarios": total_usuarios,
        }
    except Exception as e:
        return {"error_db": str(e), "nota": "No se pudo conectar a MongoDB. Datos no disponibles."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

