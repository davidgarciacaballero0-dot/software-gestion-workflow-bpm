import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = FastAPI(title="BPM AI Microservice (Vertex AI Agent Platform Edition)")

# Configuración de Google Vertex AI (New SDK 2026)
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "workflow-smart-ia")
GCP_LOCATION = "global" # Obligatorio para Agent Platform / Gemini 3.1 Preview

try:
    client = genai.Client(
        vertexai=True, 
        project=GCP_PROJECT_ID, 
        location=GCP_LOCATION
    )
    print(f"INFO: Google Gen AI Client inicializado en {GCP_PROJECT_ID} ({GCP_LOCATION})")
except Exception as e:
    print(f"CRITICAL: Error al inicializar el cliente Gen AI: {str(e)}")

# --- MODELOS (IDs EXACTOS 2026) ---
MODEL_PRO = "gemini-3.1-pro-preview"
MODEL_FLASH = "gemini-3-flash-preview" # Basado en la nomenclatura preview

def is_quota_error(e):
    error_msg = str(e).lower()
    return "429" in error_msg or "quota" in error_msg or "resource_exhausted" in error_msg

# --- MODELOS DE DATOS ---
class ChatRequest(BaseModel):
    mensaje: str
    historial: Optional[List[dict]] = []

class ConsultoriaRequest(BaseModel):
    estadisticas: dict
    politicas: List[dict]

class FlowRequest(BaseModel):
    comando: str

class ProjectionRequest(BaseModel):
    meses: int = 3

# --- ENDPOINTS ---

@app.get("/ia/test-version")
async def test_version():
    return {
        "sdk": "google-genai", 
        "models": [MODEL_PRO, MODEL_FLASH],
        "project": GCP_PROJECT_ID
    }

@app.post("/ia/chat-interactivo")
async def chat_interactivo(req: ChatRequest):
    try:
        response = client.models.generate_content(
            model=MODEL_FLASH,
            contents=req.mensaje
        )
        return {"respuesta": response.text}
    except Exception as e:
        if is_quota_error(e):
            raise HTTPException(status_code=429, detail="Cuota agotada en Gemini 3 Flash.")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ia/analizar-rendimiento")
async def analizar_rendimiento(req: ConsultoriaRequest):
    try:
        prompt = f"Analiza estos procesos BPM y da recomendaciones estratégicas en JSON: {json.dumps(req.estadisticas)}"
        response = client.models.generate_content(
            model=MODEL_PRO,
            contents=prompt
        )
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        
        if not text.startswith("{"):
            return {"analisis_breve": "Resumen", "analisis_detallado": text, "status": "success"}
            
        return json.loads(text)
    except Exception as e:
        if is_quota_error(e):
            return {"analisis_breve": "⚠️ Cuota Agotada en Gemini 3.1 Pro", "analisis_detallado": str(e), "status": "error"}
        return {"error": str(e), "status": "error"}

@app.post("/ia/generar-flujo")
async def generar_flujo(req: FlowRequest):
    try:
        response = client.models.generate_content(
            model=MODEL_FLASH,
            contents=f"Crea un flujo BPM para: {req.comando}. Responde en JSON."
        )
        return {"nodos": [], "edges": [], "respuesta": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ia/proyectar-demanda")
async def proyectar_demanda(req: ProjectionRequest):
    try:
        response = client.models.generate_content(
            model=MODEL_FLASH,
            contents=f"Proyecta la demanda para los próximos {req.meses} meses. Responde en JSON."
        )
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        if not text.startswith("{"):
            return {"proyeccion_mensual": [], "analisis_predictivo": text}
        return json.loads(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
