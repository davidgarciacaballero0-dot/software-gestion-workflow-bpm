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
    retrasosSla: Optional[int] = 0

class AnalysisRequest(BaseModel):
    metricas: List[MetricData]

class ChatRequest(BaseModel):
    prompt: str
    rol: str # CLIENTE, FUNCIONARIO, ADMIN, etc.

# --- Configuración de Instrucción de Sistema e Instancia del Modelo ---
SYSTEM_INSTRUCTION = """Eres un asistente inteligente del sistema de Gestión de Procesos de Negocio (BPM Workflow). 
Responde siempre en español. Sé conciso y profesional."""

model_logic = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=SYSTEM_INSTRUCTION
)

@app.post("/ia/chat-interactivo")
@retry(
    wait=wait_exponential(multiplier=1, min=2, max=15),
    stop=stop_after_attempt(5),
    retry=retry_if_exception(is_quota_error),
    reraise=True
)
async def chat_interactivo(req: ChatRequest):
    """
    Chatbot multinivel: Adapta su comportamiento y acceso a datos según el rol del usuario.
    """
    rol = req.rol.upper()
    
    # 1. Definir la personalidad y contexto según el ROL
    if rol == "ADMIN" or rol == "GERENTE":
        # Patrón RAG para el Administrador: Consulta datos reales
        stats = obtener_estadisticas_db()
        persona_prompt = f"""
        Eres un Consultor Estratégico y Analista de Datos del sistema BPM. 
        Tu objetivo es ayudar al Administrador/Gerente a tomar decisiones basadas en datos.
        
        DATOS REALES DEL SISTEMA (Contexto RAG):
        {json.dumps(stats, ensure_ascii=False, default=str)}
        
        INSTRUCCIONES: Responde de forma ejecutiva, destaca cuellos de botella si los ves en los datos y sugiere optimizaciones.
        """
    elif rol == "FUNCIONARIO" or rol == "JEFE_DEP":
        persona_prompt = """
        Eres el Soporte Operativo Interno del sistema BPM. 
        Ayuda al funcionario a entender cómo usar la plataforma, cómo derivar tareas, 
        qué significan los estados y cómo cumplir con los SLAs. Sé técnico y preciso.
        """
    else: # CLIENTE
        persona_prompt = """
        Eres el Asistente de Atención al Cliente del sistema BPM. 
        Tu objetivo es ayudar a los ciudadanos/clientes con sus trámites. 
        Explica requisitos, pasos a seguir y tiempos estimados de forma amable y sencilla. 
        No reveles datos técnicos internos del sistema.
        """

    # 2. Construir el prompt final
    full_prompt = f"{persona_prompt}\n\nUsuario pregunta: {req.prompt}"
    
    # 3. Generar respuesta
    response = model_logic.generate_content(full_prompt)
    return {"respuesta": response.text}


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

        # Estadísticas de SLA (Cuellos de botella históricos)
        sla_breaches = list(db.evento_historial.find({"excedioSLA": True}, {"_id": 0, "nodoDestinoNombre": 1, "createdAt": 1}))
        total_sla_breaches = len(sla_breaches)

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
            "total_sla_breaches": total_sla_breaches,
            "sla_breaches_por_nodo": sla_breaches[:50],
            "total_usuarios": total_usuarios,
        }
    except Exception as e:
        return {"error_db": str(e), "nota": "No se pudo conectar a MongoDB. Datos no disponibles."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

