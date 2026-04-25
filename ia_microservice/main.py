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
    model_name="gemini-1.5-flash",
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
    Chatbot multinivel con detección de rango temporal para análisis.
    """
    rol = req.rol.upper()
    prompt_lower = req.prompt.lower()
    
    # Detección básica de rango temporal en el prompt
    dias = 30 # Default: último mes
    if "3 meses" in prompt_lower: dias = 90
    elif "6 meses" in prompt_lower: dias = 180
    elif "12 meses" in prompt_lower or "un año" in prompt_lower or "1 año" in prompt_lower: dias = 365
    elif "2 años" in prompt_lower: dias = 730
    elif "3 años" in prompt_lower: dias = 1095
    elif "siempre" in prompt_lower or "histórico" in prompt_lower: dias = 9999

    # 1. Definir la personalidad y contexto según el ROL
    if rol == "ADMIN" or rol == "GERENTE":
        stats = obtener_estadisticas_db(dias_atras=dias)
        persona_prompt = f"""
        Eres un Consultor Estratégico y Analista de Datos del sistema BPM. 
        Tu objetivo es ayudar al Administrador/Gerente a tomar decisiones basadas en datos.
        
        PERIODO ANALIZADO: Últimos {dias} días (o histórico total si es > 3000).
        
        DATOS REALES DEL SISTEMA (Contexto RAG):
        {json.dumps(stats, ensure_ascii=False, default=str)}
        
        INSTRUCCIONES: Responde de forma ejecutiva, destaca cuellos de botella si los ves en los datos y sugiere optimizaciones.
        Si el usuario pregunta por un tiempo específico, confirma que los datos mostrados corresponden a ese rango.
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
    try:
        response = model_logic.generate_content(full_prompt)
        return {"respuesta": response.text}
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            raise HTTPException(status_code=429, detail="Cuota de la API de Gemini excedida. Intente de nuevo en unos segundos.")
        raise HTTPException(status_code=503, detail=f"Error del servicio IA: {error_str[:200]}")


@app.post("/ia/asistente")
async def asistente_alias(req: ChatRequest):
    """Alias para compatibilidad con versiones anteriores del backend."""
    return await chat_interactivo(req)


@app.post("/ia/analizar-rendimiento")
async def analizar_rendimiento(req: AnalysisRequest):
    """
    Analiza métricas de departamentos para detectar cuellos de botella.
    """
    prompt = f"""
    Analiza las siguientes métricas de rendimiento del sistema BPM:
    {json.dumps([m.dict() for m in req.metricas], ensure_ascii=False)}
    
    Identifica cuellos de botella, departamentos sobrecargados y sugiere acciones correctivas.
    Responde en formato JSON con las llaves: 'analisis', 'recomendaciones', 'nivel_alerta'.
    """
    try:
        response = model_logic.generate_content(prompt)
        # Intentar extraer JSON si el modelo responde con texto enriquecido
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        # Si falla el parseo JSON, devolver texto plano estructurado
        return {"analisis": response.text, "status": "processed_as_text"}


@app.post("/ia/generar-flujo")
async def generar_flujo(req: FlowRequest):
    """
    Genera una estructura de flujo de trabajo a partir de una descripción.
    """
    prompt = f"""
    Diseña un flujo de trabajo BPM basado en esta descripción: {req.prompt}
    
    Responde en formato JSON con una lista de 'nodos' (id, nombre, tipo) y 'conexiones' (de, a).
    Usa tipos de nodo: 'START', 'TASK', 'EXCLUSIVE_GATEWAY', 'END'.
    """
    try:
        response = model_logic.generate_content(prompt)
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        return {"error": "No se pudo generar el JSON del flujo", "respuesta": response.text}


def obtener_estadisticas_db(dias_atras: int = 30) -> dict:
    """Conecta directamente a MongoDB y extrae estadísticas filtradas por tiempo."""
    from pymongo import MongoClient
    from datetime import datetime, timedelta
    
    # 1. Obtener URI con prioridad a Docker
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017/bpm_workflow"
    print(f"DEBUG IA: Intentando conectar a MongoDB en: {mongo_uri}")
    
    try:
        fecha_limite = datetime.now() - timedelta(days=dias_atras)
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000) # 5 seg timeout
        
        # 2. Seleccionar Base de Datos de forma robusta
        db_name = "bpm_workflow"
        if "/" in mongo_uri.split("://")[-1]:
            db_name = mongo_uri.split("/")[-1].split("?")[0]
        
        db = client[db_name]
        
        # Verificar conexión con un ping
        client.admin.command('ping')
        print(f"DEBUG IA: Conexión exitosa a la DB: {db_name}")

        # Filtro de tiempo para trámites y eventos
        filtro_tiempo = {"createdAt": {"$gte": fecha_limite}}

        # Estadísticas de departamentos con carga real
        departamentos_raw = list(db.departamentos.find({}, {"_id": 1, "nombre": 1}))
        usuarios_raw = list(db.usuarios.find({}, {"idDepartamento": 1}))
        
        # Trámites filtrados por tiempo
        tramites_raw = list(db.tramites_instancias.find(
            {"estadoActual": {"$in": ["EN_PROGRESO", "PENDIENTE"]}, **filtro_tiempo}, 
            {"departamentoActualId": 1}
        ))

        stats_deps = []
        for d in departamentos_raw:
            id_dep = str(d["_id"])
            nombre = d["nombre"]
            num_tramites = sum(1 for t in tramites_raw if t.get("departamentoActualId") == id_dep)
            num_personal = sum(1 for u in usuarios_raw if u.get("idDepartamento") == id_dep)
            
            stats_deps.append({
                "nombre": nombre,
                "tramites_activos": num_tramites,
                "personal_disponible": num_personal,
                "estado_carga": "ALTA" if num_tramites > (num_personal * 1.5) else "NORMAL"
            })

        # Estadísticas de políticas/workflows
        politicas = list(db.politicas_workflow.find({}, {"_id": 0, "nombre": 1, "status": 1, "version": 1}))
        total_politicas = len(politicas)

        # Estadísticas globales de trámites en el periodo
        total_tramites_periodo = db.tramites_instancias.count_documents(filtro_tiempo)
        tramites_activos = len(tramites_raw)

        # Estadísticas de SLA filtradas por tiempo
        filtro_sla = {"excedioSLA": True, **filtro_tiempo}
        sla_breaches = list(db.eventos_historial.find(filtro_sla, {"_id": 0, "nodoDestinoNombre": 1, "createdAt": 1}))
        total_sla_breaches = len(sla_breaches)

        # Estadísticas de usuarios
        total_usuarios = db.usuarios.count_documents({})

        client.close()

        return {
            "total_departamentos": len(stats_deps),
            "departamentos": stats_deps[:20],
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

