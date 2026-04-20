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
load_dotenv(dotenv_path="../.env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("⚠️ ADVERTENCIA: GEMINI_API_KEY no encontrada")
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
    descripcion: str

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
   - Busca departamentos subutilizados (baja carga y bajo tiempo).
   - Genera una RECOMENDACIÓN de reasignación de personal cuantificable (ej: Mover X personas de Dept A a Dept B).
   - Proporciona una JUSTIFICACIÓN ESTADÍSTICA detallada.
   - Incluye un párrafo final con la explicación humana y profesional del caso.
   - FORMATO REQUERIDO: [RESUMEN], [MÉTRICAS_CRÍTICAS], [RECOMENDACIÓN], [JUSTIFICACIÓN].
"""

model_logic = genai.GenerativeModel(model_name="gemini-2.0-flash", system_instruction=SYSTEM_INSTRUCTION)
model_creative = genai.GenerativeModel(model_name="gemini-2.0-flash", system_instruction=SYSTEM_INSTRUCTION)

def extract_json(text: str) -> dict:
    """Intenta extraer un objeto JSON de un texto sucio (con markdown o texto extra)."""
    try:
        # Buscar el primer '{' y el último '}'
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
async def generar_flujo(req: FlowRequest):
    prompt = f"Genera un flujo de trabajo para: {req.descripcion}. Devuelve solo JSON."
    try:
        response = model_creative.generate_content(prompt)
        return extract_json(response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IA Error: {str(e)}")

@app.post("/ia/analizar-rendimiento")
async def analizar_rendimiento(req: AnalysisRequest):
    data_str = json.dumps([m.dict() for m in req.metricas])
    prompt = f"Analiza y genera recomendaciones para estas métricas: {data_str}"
    try:
        response = model_logic.generate_content(prompt)
        return {"reporte": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IA Analysis Error: {str(e)}")

def is_quota_error(exception):
    return "429" in str(exception) or "quota" in str(exception).lower()

@app.post("/ia/asistente")
@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception(is_quota_error),
    reraise=True
)
async def asistente_virtual(req: FlowRequest):
    """Responder consultas generales sobre el uso del sistema BPM."""
    prompt = f"Como asistente virtual del sistema BPM, responde de forma concisa (máx 2 párrafos). Evita datos sensibles: {req.descripcion}"
    try:
        response = model_logic.generate_content(prompt)
        return {"respuesta": response.text}
    except Exception as e:
        print(f"ERROR IA ASISTENTE: {str(e)}")
        if is_quota_error(e):
             raise HTTPException(status_code=429, detail="La cuota de la IA se ha agotado. Por favor, espera unos segundos.")
        raise HTTPException(status_code=500, detail=f"IA Assistant Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
