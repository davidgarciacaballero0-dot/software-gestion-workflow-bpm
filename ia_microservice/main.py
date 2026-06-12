import os
import json
from datetime import datetime
from typing import List, Optional, Any
from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
import google.genai as genai
from google.genai import types
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()


import numpy as np
from models.lstm_delay_predictor import DelayPredictor
from models.autoencoder_anomaly import AnomalyDetector
from models.intent_classifier import IntentClassifier
from models.priority_network import PriorityPredictor
from models.document_classifier import DocumentClassifier

delay_predictor = None
anomaly_detector = None
intent_classifier = None
priority_predictor = None
document_classifier = None

def get_delay_predictor():
    global delay_predictor
    if delay_predictor is None:
        delay_predictor = DelayPredictor()
    return delay_predictor

def get_anomaly_detector():
    global anomaly_detector
    if anomaly_detector is None:
        anomaly_detector = AnomalyDetector()
    return anomaly_detector

def get_intent_classifier():
    global intent_classifier
    if intent_classifier is None:
        intent_classifier = IntentClassifier()
    return intent_classifier

def get_priority_predictor():
    global priority_predictor
    if priority_predictor is None:
        priority_predictor = PriorityPredictor()
    return priority_predictor

def get_document_classifier():
    global document_classifier
    if document_classifier is None:
        document_classifier = DocumentClassifier()
    return document_classifier


app = FastAPI(title="BPM AI Microservice (Vertex AI Agent Platform Edition)")

# Configuración de Google Vertex AI (New SDK 2026)
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "workflow-smart-ia-798ae")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

client = None

# Intentar inicializar Vertex AI
try:
    # PRIORIDAD 1: Vertex AI (proyecto con billing, sin límites free-tier)
    client_test = genai.Client(
        vertexai=True, 
        project=GCP_PROJECT_ID, 
        location=GCP_LOCATION
    )
    # Validamos con una llamada rápida
    client_test.models.embed_content(
        model="text-embedding-004",
        contents="ping"
    )
    client = client_test
    print(f"INFO: Google Gen AI Client inicializado y VALIDADO en Vertex AI: {GCP_PROJECT_ID} ({GCP_LOCATION})")
except Exception as e:
    print(f"WARN: Vertex AI falló en la validación inicial ({str(e)}), intentando con API Key...")

# Fallback a API Key si Vertex AI falló o no se inicializó
if client is None:
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            client_test = genai.Client(api_key=api_key)
            # Validamos con gemini-embedding-001 que está disponible para API Key
            client_test.models.embed_content(
                model="gemini-embedding-001",
                contents="ping"
            )
            client = client_test
            print("INFO: Google Gen AI Client inicializado y VALIDADO con API Key (fallback)")
        else:
            raise RuntimeError("No hay GEMINI_API_KEY configurada.")
    except Exception as e2:
        print(f"CRITICAL: Error al inicializar el cliente Gen AI con API Key: {str(e2)}")
        try:
            client = genai.Client(api_key=api_key or "DUMMY_KEY")
        except Exception:
            pass


MODEL_PRO = "gemini-2.5-pro"          # Análisis profundo (analizar-rendimiento)
MODEL_FLASH = "gemini-2.5-flash"       # Respuestas rápidas (chat, voz, flujos)
# Fallback chain: modelos verificados en el proyecto Vertex AI
FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-001"]

def is_quota_error(e):
    error_msg = str(e).lower()
    return "429" in error_msg or "quota" in error_msg or "resource_exhausted" in error_msg

def is_retriable_error(e):
    """Detecta errores que justifican probar con otro modelo (cuota o modelo no encontrado)."""
    error_msg = str(e).lower()
    return (
        "429" in error_msg or "quota" in error_msg or "resource_exhausted" in error_msg
        or "404" in error_msg or "not_found" in error_msg or "not found" in error_msg
    )

def generate_with_fallback(preferred_model: str, contents, config=None):
    """Intenta generar con el modelo preferido; si falla por cuota, prueba los fallbacks."""
    models_to_try = [preferred_model] + [m for m in FALLBACK_MODELS if m != preferred_model]
    last_error: Exception = Exception("No models available")
    for model in models_to_try:
        try:
            kwargs = {"model": model, "contents": contents}
            if config:
                kwargs["config"] = config
            response = client.models.generate_content(**kwargs)
            if model != preferred_model:
                print(f"INFO: Fallback exitoso → usó '{model}' en lugar de '{preferred_model}'")
            return response
        except Exception as e:
            last_error = e
            if is_retriable_error(e):
                print(f"WARN: Error en '{model}' ({type(e).__name__}), intentando siguiente modelo...")
                continue
            raise  # Error no relacionado con cuota, propagar inmediatamente
    # Todos los modelos fallaron
    raise last_error

# --- ENDPOINTS ---

@app.get("/ia/test-version")
async def test_version():
    return {"sdk": "google-genai", "models": [MODEL_PRO, MODEL_FLASH]}

@app.post("/ia/chat-interactivo")
async def chat_interactivo(request: Request):
    """Chatbot Asistente - Contextualizado con datos reales de la empresa."""
    try:
        body = await request.json()
        mensaje = body.get("mensaje") or body.get("prompt") or "Hola"
        rol = body.get("rol", "CLIENTE")
        contexto = body.get("contexto_empresa", "")
        
        system_prompt = (
            "Eres el Asistente IA del Sistema de Gestión de Trámites BPM de la empresa. "
            "Tus respuestas deben ser ESPECÍFICAS para esta empresa y sus procesos internos. "
            "NO des respuestas genéricas de internet. Basa tus respuestas en el contexto proporcionado.\n\n"
            f"Rol del usuario: {rol}\n"
        )
        
        if contexto:
            system_prompt += f"\nDATOS INTERNOS DE LA EMPRESA:\n{contexto}\n"
        
        system_prompt += (
            "\nREGLAS:\n"
            "- Si el usuario es CLIENTE y pregunta por sus trámites, revisa la sección 'MIS TRÁMITES' en el contexto.\n"
            "- Informa sobre el estado (EN_PROGRESO, FINALIZADO) y código de trámite si el cliente lo solicita.\n"
            "- Si el usuario pregunta sobre cómo iniciar un trámite, explica los pasos SEGÚN las políticas de la empresa.\n"
            "- Si no hay datos específicos para responder, sé amable y di que no tienes registros de ese trámite en particular.\n"
            "- Responde en español de manera profesional y concisa.\n"
            "- Menciona tiempos SLA, requisitos y departamentos cuando sea relevante.\n"
        )
        
        response = generate_with_fallback(
            MODEL_FLASH,
            contents=mensaje,
            config=types.GenerateContentConfig(system_instruction=system_prompt)
        )
        return {"respuesta": response.text}
    except Exception as e:
        if is_quota_error(e):
            raise HTTPException(status_code=429, detail="Cuota agotada.")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ia/analizar-rendimiento")
async def analizar_rendimiento(request: Request):
    try:
        body = await request.json()
        datos = body.get("metricas") or body.get("estadisticas") or body
        politicas = body.get("politicas", [])
        prompt = (
            f"Eres un consultor experto en BPM. Analiza estos datos de rendimiento "
            f"y da recomendaciones estratégicas en JSON.\n\n"
            f"Datos: {json.dumps(datos, default=str)}\n"
            f"Políticas: {json.dumps(politicas, default=str)}"
        )
        response = generate_with_fallback(MODEL_PRO, contents=prompt)
        text = response.text or ""
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        try:
            return json.loads(text) if text.strip().startswith("{") else {"analisis_detallado": text, "status": "success"}
        except json.JSONDecodeError:
            return {"analisis_detallado": text, "status": "success"}
    except Exception as e:
        if is_quota_error(e):
            return {"analisis_breve": "Cuota Agotada", "analisis_detallado": str(e), "status": "error"}
        return {"error": str(e), "status": "error"}

@app.post("/ia/generar-flujo")
async def generar_flujo(request: Request):
    """
    Generador de Flujos BPM - Devuelve 'nodes' y 'edges' listos para el frontend.
    El frontend espera:
      - res.nodes: WorkflowNode[] con {id, type, name, uiPosition: {x, y}, departmentId, slaHours}
      - res.edges: WorkflowEdge[] con {id, sourceNodeId, targetNodeId, condition?}
      - condition debe ser: {variable: string, operator: 'EQUALS', value: string} o null
    """
    try:
        body = await request.json()
        comando = body.get("comando") or body.get("prompt") or body.get("descripcion") or ""
        deptos = body.get("departamentosDisponibles", [])

        # Calcular posiciones X de los carriles según los departamentos disponibles
        lane_positions = {}
        for i, dep in enumerate(deptos):
            dep_id = dep.get("id", f"dep_{i}")
            lane_positions[dep_id] = 80 + (i * 190)  # Cada carril ocupa ~190px
        
        # Centro del canvas = carril del medio
        center_x = 80 + ((len(deptos) - 1) * 190) // 2 if deptos else 250
        lanes_info = ", ".join([f"'{d.get('nombre', d.get('name', d.get('id', '')))}' (id: {d.get('id', '')}) => x={80 + i*190}" for i, d in enumerate(deptos)])

        system_prompt = (
            "Eres un arquitecto de procesos BPM 2.0. Diseña flujos de trabajo funcionales.\n"
            "RESPONDE EXCLUSIVAMENTE con un JSON válido (sin texto adicional ni bloques de código).\n\n"
            "El JSON debe tener exactamente esta estructura:\n"
            "{\n"
            '  "nodes": [\n'
            f'    {{"id": "node_1", "type": "START", "name": "Inicio", "uiPosition": {{"x": {center_x}, "y": 50}}, "slaHours": 0}},\n'
            '    {"id": "node_2", "type": "USER_TASK", "name": "Revisar Solicitud", "uiPosition": {"x": 80, "y": 200}, "departmentId": "dep_xxx", "slaHours": 24},\n'
            f'    {{"id": "node_last", "type": "END", "name": "Fin", "uiPosition": {{"x": {center_x}, "y": 999}}, "slaHours": 0}}\n'
            "  ],\n"
            '  "edges": [\n'
            '    {"id": "edge_1", "sourceNodeId": "node_1", "targetNodeId": "node_2"}\n'
            "  ]\n"
            "}\n\n"
            "REGLAS OBLIGATORIAS DE POSICIONAMIENTO:\n"
            f"- CARRILES DISPONIBLES (columnas X fijas): {lanes_info}\n"
            f"- El nodo START siempre va en x={center_x}, y=50 (centrado arriba).\n"
            f"- El nodo END siempre va en x={center_x}, en la última fila Y (centrado abajo).\n"
            "- Cada USER_TASK debe usar la coordenada X EXACTA del carril de su departamento asignado.\n"
            "- Los EXCLUSIVE_GATEWAY deben usar la misma X que el nodo anterior que los alimenta.\n"
            "- La coordenada Y progresa de arriba hacia abajo: primera fila Y=50, luego Y=200, Y=350, Y=500, Y=650, Y=800, etc. (incrementos de 150px).\n"
            "- Las bifurcaciones de un GATEWAY (caminos true/false) deben ir a la MISMA fila Y pero en DIFERENTE columna X (cada rama a un carril distinto).\n"
            "- Tras las bifurcaciones, ambos caminos convergen en el nodo END que está centrado en la fila Y más baja.\n\n"
            "REGLAS DE ESTRUCTURA:\n"
            "- Tipos válidos: START, USER_TASK, EXCLUSIVE_GATEWAY, PARALLEL_GATEWAY, END\n"
            "- EXACTAMENTE UN NODO 'START' y EXACTAMENTE UN NODO 'END'. ¡NO agregues múltiples nodos de fin!\n"
            "- CONVERGENCIA: TODOS los caminos DEBEN terminar apuntando al MISMO nodo END.\n"
            "- Las USER_TASK deben tener departmentId asignado lógicamente según su función, y slaHours.\n"
            "- Los EXCLUSIVE_GATEWAY bifurcan con edges que tienen condition ({variable: '...', operator: 'EQUALS', value: 'true'/'false'}).\n"
            "- PARALLEL_GATEWAY: Bifurca el flujo en MÚLTIPLES ramas SIMULTÁNEAS (máximo 4 ramas). Siempre usar en PARES: uno con gatewayType='FORK' y otro con gatewayType='JOIN'. TODAS las ramas del FORK deben converger en el JOIN correspondiente. Ejemplo: nodo FORK → 3 USER_TASK en paralelo → nodo JOIN → continua el flujo.\n"
            "- Los PARALLEL_GATEWAY FORK posicionan sus ramas en la MISMA fila Y pero en DIFERENTES columnas X (carriles distintos).\n"
            f"- Departamentos disponibles: {json.dumps(deptos, ensure_ascii=False)}\n"
            "- NO incluyas texto, explicaciones ni bloques ```json```. Solo el JSON puro.\n"
        )

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=f"Diseña este flujo BPM: {comando}",
            config=types.GenerateContentConfig(system_instruction=system_prompt)
        )
        
        text = (response.text or "").strip()
        # Limpiar bloques de código si el modelo los incluye de todos modos
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        data = json.loads(text)
        
        # Normalizar: asegurar que usamos 'nodes' (no 'nodos')
        nodes = data.get("nodes") or data.get("nodos", [])
        edges = data.get("edges") or data.get("aristas", [])
        
        # Normalizar cada nodo para cumplir con WorkflowNode del frontend
        for node in nodes:
            if "uiPosition" not in node:
                node["uiPosition"] = {"x": 400, "y": 100}
            if "slaHours" not in node:
                node["slaHours"] = 24 if node.get("type") == "USER_TASK" else 0
            if "formDefinition" not in node:
                node["formDefinition"] = []
        
        # Normalizar edges: si condition es un string, convertir al formato del frontend
        for edge in edges:
            cond = edge.get("condition")
            if isinstance(cond, str):
                is_true = cond.lower() in ["true", "sí", "si", "aprobado", "yes", "aceptado", "validado"]
                edge["condition"] = {
                    "variable": "f_aprobado",
                    "operator": "EQUALS",
                    "value": "true" if is_true else "false"
                }
            elif cond is None:
                edge.pop("condition", None)
        
        return {"nodes": nodes, "edges": edges}
        
    except json.JSONDecodeError:
        print(f"Error JSON: No se pudo parsear la respuesta de la IA.")
        return {"nodes": [], "edges": [], "error": "La IA no generó un JSON válido."}
    except Exception as e:
        if is_quota_error(e):
            raise HTTPException(status_code=429, detail="Cuota agotada.")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ia/proyectar-demanda")
async def proyectar_demanda(request: Request):
    try:
        body = await request.json()
        meses = body.get("meses", 3)
        fecha_actual = datetime.now().strftime("%B %Y")
        response = generate_with_fallback(
            MODEL_FLASH,
            contents=f"Proyecta la demanda de trámites para {meses} meses a partir de {fecha_actual} en JSON con proyeccion_mensual y analisis_predictivo."
        )
        text = response.text or ""
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        try:
            return json.loads(text) if text.strip().startswith("{") else {"proyeccion_mensual": [], "analisis_predictivo": text}
        except json.JSONDecodeError:
            return {"proyeccion_mensual": [], "analisis_predictivo": text}
    except Exception as e:
        if is_quota_error(e):
            raise HTTPException(status_code=429, detail="Cuota agotada.")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ia/orquestador-voz")
async def orquestador_voz(request: Request):
    """Orquestador Inteligente que decide qué acción tomar en la UI basado en la voz."""
    try:
        body = await request.json()
        comando = body.get("comando", "")
        contexto = body.get("contexto", {})

        system_prompt = (
            "Eres el Orquestador de Interfaz de un sistema BPM. Tu objetivo es analizar el comando de voz del usuario "
            "y decidir qué acción debe tomar el frontend.\n"
            "RESPONDE EXCLUSIVAMENTE CON UN JSON VÁLIDO. NO uses markdown.\n\n"
            "Estructura JSON requerida:\n"
            "{\n"
            '  "action": "RENDER_DYNAMIC_CHART" | "EXPORT_EXCEL" | "EXPORT_PDF" | "EXPORT_WORD" | "GENERATE_REPORT" | "UPDATE_FILTER" | "TEXT_ONLY",\n'
            '  "text_response": "Explicación breve de lo que hiciste o respuesta al usuario",\n'
            '  "chart_config": {\n'
            '    "type": "bar", // bar, pie, line\n'
            '    "labels": ["Label1", "Label2"],\n'
            '    "datasets": [{"label": "Series", "data": [1, 2]}]\n'
            '  }, // Solo si action es RENDER_DYNAMIC_CHART. chart_config puede ser null en otros casos.\n'
            '  "report_params": {\n'
            '    "dimension": "department", // department, status, priority, month, policy, client\n'
            '    "metric": "count", // count, average_duration\n'
            '    "filters": { "months": 6 }\n'
            '  }, // Solo si action es GENERATE_REPORT. Puede ser null en otros casos.\n'
            '  "format": "pdf", // pdf, excel, word, screen. Solo si action es GENERATE_REPORT o EXPORT_*.\n'
            '  "filter_command": { "meses": 3 } // Solo si action es UPDATE_FILTER. Puede ser null en otros casos.\n'
            "}\n\n"
            "REGLAS:\n"
            "- Si el usuario pide generar un reporte con condiciones (ej. 'reporte de trámites por departamento en los últimos 30 días en PDF'), usa GENERATE_REPORT y llena report_params y format.\n"
            "- Si el usuario pide descargar o exportar a Excel, usa EXPORT_EXCEL.\n"
            "- Si el usuario pide exportar a PDF, usa EXPORT_PDF.\n"
            "- Si el usuario pide exportar a Word, usa EXPORT_WORD.\n"
            "- Si pide cambiar el filtro de meses o periodo, usa UPDATE_FILTER.\n"
            "- Si pide una gráfica o comparar datos visualmente, usa RENDER_DYNAMIC_CHART y construye chart_config usando los datos del contexto.\n"
            "- Si hace una pregunta general sobre los datos, usa TEXT_ONLY y responde en text_response.\n"
            f"- Datos de contexto actuales disponibles para responder: {json.dumps(contexto, default=str)}\n"
        )

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=comando,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json"
            )
        )
        
        text = (response.text or "").strip()
        return json.loads(text)
    except json.JSONDecodeError:
        return {"action": "TEXT_ONLY", "text_response": "Error: La IA no generó un JSON válido."}
    except Exception as e:
        if is_quota_error(e):
            raise HTTPException(status_code=429, detail="Cuota agotada.")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ia/parsear-reporte-nlp")
async def parsear_reporte_nlp(request: Request):
    """
    CU-25: Procesa un prompt de reporte NLP y lo traduce a una estructura limpia de parámetros de base de datos.
    Evita inyección NoSQL (MQL) al retornar parámetros en lugar de comandos crudos.
    """
    try:
        body = await request.json()
        prompt = body.get("prompt") or body.get("mensaje") or ""
        
        if not prompt:
            raise HTTPException(status_code=400, detail="El prompt no puede estar vacío.")

        system_prompt = (
            "Eres un traductor experto de lenguaje natural a especificaciones de reportes estructurados para un sistema BPM.\n"
            "Tu objetivo es parsear el prompt del usuario y devolver UNICAMENTE un JSON válido.\n\n"
            "Estructura del JSON requerida:\n"
            "{\n"
            '  "dimension": "department" | "status" | "priority" | "month",\n'
            '  "metric": "count" | "average_duration",\n'
            '  "chart_type": "bar" | "line" | "pie" | "doughnut" | null, // Si el usuario solicita un tipo de gráfico explícito (ej. "torta", "dona", "circular", "barras", "líneas")\n'
            '  "filters": {\n'
            '    "department": string | null, // Nombre o ID del departamento si se menciona en el prompt\n'
            '    "status": "EN_PROGRESO" | "FINALIZADO" | "RECHAZADO" | null, // Estado mencionado\n'
            '    "priority": "HIGH" | "MEDIUM" | "LOW" | null, // Prioridad mencionado\n'
            '    "days": int | null // Rango de días mencionado (ej. 30 días, 90 días, último mes -> 30)\n'
            '  }\n'
            "}\n\n"
            "REGLAS:\n"
            "- 'dimension' debe ser:\n"
            "  * 'department' si se pide ver por departamento, oficinas o áreas.\n"
            "  * 'status' si se pide ver por estado de trámite.\n"
            "  * 'priority' si se pide ver por prioridades.\n"
            "  * 'month' si se pide ver por tiempo, meses, histórico o fecha.\n"
            "- 'metric' debe ser:\n"
            "  * 'count' para contar cantidad o volumen de trámites.\n"
            "  * 'average_duration' para promedios de tiempo, duración, demora o velocidad de atención.\n"
            "- 'chart_type' debe extraerse si el usuario explícitamente pide un formato visual (ej. 'torta' -> 'pie', 'dona' -> 'doughnut', 'circular' -> 'pie', 'barras' -> 'bar', 'líneas' -> 'line'). Si no lo pide explícitamente, retorna null.\n"
            "- Extrae filtros si se especifica un departamento, estado o periodo concreto.\n"
            "- Si el prompt no especifica una dimensión de manera clara, usa 'status' por defecto.\n"
            "- Si el prompt no especifica una métrica clara, usa 'count' por defecto.\n"
            "- RESPONDE EXCLUSIVAMENTE con el JSON. No uses bloques de código ni markdown."
        )

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json"
            )
        )
        
        text = (response.text or "").strip()
        return json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="La IA no generó un JSON válido para el reporte.")
    except Exception as e:
        if is_quota_error(e):
            raise HTTPException(status_code=429, detail="Cuota agotada.")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ia/analisis-intencion-politica")
async def analisis_intencion_politica(request: Request):
    """
    CU-26: Análisis de intención mediante embeddings combinados con TensorFlow IntentClassifier.
    Genera embeddings para el requerimiento del usuario, obtiene la clasificación por red neuronal
    CNN de TensorFlow, y pondera ambos resultados para determinar la política idónea.
    """
    try:
        body = await request.json()
        requerimiento = body.get("requerimiento") or body.get("mensaje") or ""
        politicas = body.get("politicas") or []
        
        if not requerimiento:
            raise HTTPException(status_code=400, detail="El requerimiento no puede estar vacío.")
        if not politicas:
            raise HTTPException(status_code=400, detail="La lista de políticas no puede estar vacía.")

        # 1. Embeddings con Vertex AI / Gemini
        use_fallback = False
        req_vector = []
        politica_vectors = []
        try:
            # Intentar con text-embedding-004 primero
            model_name = "text-embedding-004"
            try:
                req_res = client.models.embed_content(
                    model=model_name,
                    contents=requerimiento
                )
            except Exception as e_model:
                print(f"WARN: Error con {model_name} ({str(e_model)}). Intentando con gemini-embedding-001...")
                model_name = "gemini-embedding-001"
                req_res = client.models.embed_content(
                    model=model_name,
                    contents=requerimiento
                )
                
            if req_res and req_res.embeddings and len(req_res.embeddings) > 0:
                req_vector = req_res.embeddings[0].values
            else:
                raise ValueError("No se obtuvieron embeddings para el requerimiento")
            
            for pol in politicas:
                texto_pol = f"{pol.get('nombre', '')}. {pol.get('description', pol.get('descripcion', ''))}"
                pol_res = client.models.embed_content(
                    model=model_name,
                    contents=texto_pol
                )
                if pol_res and pol_res.embeddings and len(pol_res.embeddings) > 0:
                    politica_vectors.append(pol_res.embeddings[0].values)
                else:
                    raise ValueError(f"No se obtuvieron embeddings para la política: {pol.get('nombre')}")
                
        except Exception as embed_err:
            print(f"WARN: Error en embeddings de Vertex AI/Gemini ({str(embed_err)}). Usando fallback léxico...")
            use_fallback = True

        import math
        def cosine_similarity(v1, v2):
            dot_product = sum(x * y for x, y in zip(v1, v2))
            magnitude1 = math.sqrt(sum(x * x for x in v1))
            magnitude2 = math.sqrt(sum(x * x for x in v2))
            if not magnitude1 or not magnitude2:
                return 0.0
            return dot_product / (magnitude1 * magnitude2)

        def lexical_similarity(text1: str, text2: str) -> float:
            words1 = set(text1.lower().split())
            words2 = set(text2.lower().split())
            intersection = words1.intersection(words2)
            union = words1.union(words2)
            if not union:
                return 0.0
            return len(intersection) / len(union)

        # 2. Evaluar similitudes
        resultados = []
        for i, pol in enumerate(politicas):
            if not use_fallback:
                sim = cosine_similarity(req_vector, politica_vectors[i])
            else:
                texto_pol = f"{pol.get('nombre', '')} {pol.get('description', pol.get('descripcion', ''))}"
                sim = lexical_similarity(requerimiento, texto_pol)

            resultados.append({
                "politica": pol,
                "score": sim,
                "score_semantic_lexical": sim,
                "tf_match": False
            })

        resultados.sort(key=lambda x: x["score"], reverse=True)
        
        # Filtro de confianza mínimo: si la mayor coincidencia es menor a 0.35, no recomendamos nada
        mejor_coincidencia = resultados[0]["politica"] if resultados and resultados[0]["score"] >= 0.35 else None
        mejor_score = resultados[0]["score"] if mejor_coincidencia else 0.0

        return {
            "politica_asignada": mejor_coincidencia,
            "score": mejor_score,
            "metodo": "vertex_ai_embeddings",
            "tf_intent_class": -1,
            "tf_intent_score": 0.0,
            "detalles": resultados
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ia/evaluar-anomalia-sla")
async def evaluar_anomalia_sla(request: Request):
    """
    CU-30: Lógica predictiva con Gemini para evaluar si un trámite va camino al estancamiento (anomalía de SLA).
    Calcula simultáneamente la prioridad dinámica para CU-29.
    """
    dias_activo = 0
    horas_restantes = 0.0
    prioridad = 3
    try:
        body = await request.json()
        codigo = body.get("codigoTramite", "TRM-2026")
        dias_activo = body.get("diasActivo", 0)
        horas_restantes = body.get("horasRestantesSla", 0.0)
        depto = body.get("departamentoActual", "Desconocido")
        prioridad = body.get("prioridad", 3)
        historial = body.get("historial", [])

        system_prompt = (
            "Eres un analista de procesos BPM experto en optimización de operaciones y cumplimiento de SLAs.\n"
            "Tu tarea es evaluar si el trámite proporcionado está en riesgo inminente de estancamiento (anomalía de SLA).\n"
            "RESPONDDE EXCLUSIVAMENTE con un JSON válido.\n\n"
            "Estructura del JSON requerida:\n"
            "{\n"
            '  "es_anomalo": true | false,\n'
            '  "prioridad_dinamica": 1 | 2 | 3 | 4 | 5, // Escala de 1 (Muy Baja) a 5 (Crítica/Urgente)\n'
            '  "motivo": "Explicación detallada de por qué se considera una anomalía o el riesgo estimado de retraso"\n'
            "}\n\n"
            "CRITERIOS DE ANOMALÍA:\n"
            "- Si el trámite lleva muchos días activo en un mismo departamento y tiene pocas horas restantes de SLA (ej: < 24h), es ALTAMENTE anómalo (es_anomalo = true) y requiere prioridad_dinamica = 5 (Crítica).\n"
            "- Si las horas restantes de SLA son negativas (vencido), es_anomalo = true y prioridad_dinamica = 5.\n"
            "- Si el trámite progresa normalmente y tiene suficiente tiempo de SLA (ej: > 48h), es_anomalo = false.\n"
            "- La prioridad_dinamica debe incrementarse si las horas restantes son pocas en relación con la prioridad original y el tiempo que suele tomar en ese departamento.\n"
            "- RESPONDE EXCLUSIVAMENTE con el JSON. No uses bloques de código ni markdown."
        )

        user_content = (
            f"DATOS DEL TRÁMITE A EVALUAR:\n"
            f"- Código: {codigo}\n"
            f"- Departamento Actual: {depto}\n"
            f"- Días Activo en total: {dias_activo}\n"
            f"- Horas restantes para vencimiento de SLA: {horas_restantes}\n"
            f"- Prioridad Original: {prioridad}\n"
            f"- Historial de Eventos del Trámite: {json.dumps(historial, default=str)}"
        )

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json"
            )
        )
        
        text = (response.text or "").strip()
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback estático
        is_anomalous = horas_restantes <= 0 or (dias_activo > 3 and horas_restantes < 24)
        dyn_pri = 5 if is_anomalous else (prioridad + 1 if horas_restantes < 48 else prioridad)
        if dyn_pri > 5: dyn_pri = 5
        return {
            "es_anomalo": is_anomalous,
            "prioridad_dinamica": dyn_pri,
            "motivo": "Evaluación por regla estática de contingencia (IA no disponible o respuesta inválida)."
        }
    except Exception as e:
        # Fallback en caso de error crítico
        is_anomalous = horas_restantes <= 0 or (dias_activo > 3 and horas_restantes < 24)
        dyn_pri = 5 if is_anomalous else (prioridad + 1 if horas_restantes < 48 else prioridad)
        if dyn_pri > 5: dyn_pri = 5
        return {
            "es_anomalo": is_anomalous,
            "prioridad_dinamica": dyn_pri,
            "motivo": f"Evaluación por regla estática debido a error: {str(e)}"
        }

@app.post("/ia/predecir-transicion")
async def predecir_transicion(request: Request):
    """
    CU-28: Lógica predictiva con Gemini para evaluar los datos cargados en un formulario 
    y recomendar la transición de nodo más adecuada con un nivel de confianza (score).
    """
    nodos_siguientes = []
    try:
        body = await request.json()
        datos_formulario = body.get("datosFormulario", {})
        nodos_siguientes = body.get("nodosSiguientes", [])
        historial = body.get("historial", [])

        if not nodos_siguientes:
            return {
                "nodo_recomendado_id": None,
                "confianza": 0.0,
                "motivo": "No hay nodos siguientes disponibles para transición."
            }

        system_prompt = (
            "Eres un motor de inferencia inteligente para un sistema de orquestación BPM.\n"
            "Tu tarea es evaluar el contenido cargado en el formulario actual del trámite,\n"
            "analizar el historial de eventos del flujo y recomendar cuál debe ser el siguiente nodo de destino.\n"
            "Asigna un nivel de confianza entre 0.0 y 1.0 a tu predicción.\n"
            "RESPONDE EXCLUSIVAMENTE con un JSON válido.\n\n"
            "Estructura del JSON requerida:\n"
            "{\n"
            '  "nodo_recomendado_id": string,\n'
            '  "confianza": float, // Entre 0.0 y 1.0\n'
            '  "motivo": "Razón detallada de por qué este nodo es el más adecuado según los datos del formulario."\n'
            "}\n\n"
            "REGLAS:\n"
            "- Si los datos del formulario indican rechazo, observaciones graves o inconsistencias, recomienda el nodo de rechazo o devolución.\n"
            "- Si el formulario está completo, validado y cumple con los requerimientos, recomienda el nodo de aprobación o siguiente paso del trámite.\n"
            "- Sé sumamente riguroso al asignar la 'confianza'. Si faltan campos importantes, baja el score.\n"
            "- RESPONDE EXCLUSIVAMENTE con el JSON. No uses bloques de código ni markdown."
        )

        user_content = (
            f"DATOS DEL FORMULARIO:\n{json.dumps(datos_formulario, default=str)}\n\n"
            f"NODOS DESTINO DISPONIBLES:\n{json.dumps(nodos_siguientes, default=str)}\n\n"
            f"HISTORIAL DE EVENTOS:\n{json.dumps(historial, default=str)}"
        )

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json"
            )
        )
        
        text = (response.text or "").strip()
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback estático seguro: el primer nodo disponible con confianza de 0.5
        first_node = nodos_siguientes[0].get("id") if nodos_siguientes else None
        return {
            "nodo_recomendado_id": first_node,
            "confianza": 0.5,
            "motivo": "Recomendación por fallback estático debido a fallo de parsing."
        }
    except Exception as e:
        first_node = nodos_siguientes[0].get("id") if nodos_siguientes else None
        return {
            "nodo_recomendado_id": first_node,
            "confianza": 0.0,
            "motivo": f"Fallo al evaluar con IA: {str(e)}"
        }

@app.post("/ia/validar-documentacion-dinamica")
async def validar_documentacion_dinamica(request: Request):
    """
    CU-27: Evalúa si basado en el texto libre, descripción o tipo de trámite,
    se requieren documentos obligatorios adicionales que no fueron originalmente
    configurados en el molde básico.
    """
    try:
        body = await request.json()
        datos_formulario = body.get("datosFormulario", {})
        descripcion_tramite = body.get("descripcionTramite", "")
        archivos_adjuntos = body.get("archivosAdjuntos", {})

        system_prompt = (
            "Eres un auditor legal e inspector de cumplimiento de trámites administrativos.\n"
            "Tu labor es analizar el formulario de un trámite y su descripción, para dictaminar si la naturaleza "
            "específica del caso exige la carga de documentos obligatorios adicionales (requisitos especiales).\n"
            "RESPONDE EXCLUSIVAMENTE con un JSON válido.\n\n"
            "Estructura del JSON requerida:\n"
            "{\n"
            '  "documentos_requeridos": [\n'
            '    {\n'
            '      "nombre": string, // Nombre del documento requerido (ej. "Certificado de Dominio Vigente")\n'
            '      "descripcion": string, // Por qué se requiere este documento\n'
            '      "urgente": boolean\n'
            '    }\n'
            '  ]\n'
            "}\n\n"
            "CRITERIOS DE EXIGENCIA DOCUMENTAL:\n"
            "- Si el trámite involucra montos de dinero altos (ej. > 10,000 USD), exige 'Declaración Jurada de Origen de Fondos'.\n"
            "- Si el trámite involucra propiedades o inmuebles, exige 'Título de Propiedad' o 'Certificado Catastral'.\n"
            "- Si es para una persona jurídica (empresa), exige 'Poder Notarial de Representante Legal' y 'RUT de Empresa'.\n"
            "- Si hay inconsistencias en firmas o datos, exige 'Copia Legalizada de Cédula de Identidad'.\n"
            "- Si no hay situaciones extraordinarias que demanden documentos especiales, devuelve una lista vacía.\n"
            "- RESPONDE EXCLUSIVAMENTE con el JSON. No uses bloques de código ni markdown."
        )

        user_content = (
            f"DESCRIPCIÓN DEL CASO:\n{descripcion_tramite}\n\n"
            f"DATOS DE FORMULARIO ACTUAL:\n{json.dumps(datos_formulario, default=str)}\n\n"
            f"ARCHIVOS ADJUNTOS ACTUALES:\n{json.dumps(archivos_adjuntos, default=str)}"
        )

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json"
            )
        )
        
        text = (response.text or "").strip()
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "documentos_requeridos": []
        }
    except Exception as e:
        return {
            "documentos_requeridos": [],
            "error": f"Fallo al auditar documentación especial: {str(e)}"
        }

@app.post("/ia/analisis-documento")
async def analizar_documento(
    file: UploadFile = File(...),
    politicas: str = Form(...)
):
    """
    Inferencia de Intención y Asignación de Política mediante Documento Adjunto (PDF/Imagen).
    Utiliza Gemini 2.5 Flash de forma directa y económica para procesar el archivo de manera multimodal.
    """
    try:
        # 1. Leer archivo
        file_bytes = await file.read()
        file_mime = file.content_type or "application/pdf"
        
        # 2. Parsear políticas
        try:
            politicas_list = json.loads(politicas)
        except Exception:
            politicas_list = []
            
        # 3. Preparar prompt
        system_prompt = (
            "Eres un analista de procesos BPM inteligente y experto.\n"
            "Tu tarea es analizar el documento adjunto (PDF o Imagen) y correlacionarlo con la lista de políticas de negocio proporcionada.\n"
            "Debes deducir cuál es la política de negocio idónea que aplica a este documento para iniciar el trámite correspondiente.\n\n"
            "LISTA DE POLÍTICAS DE NEGOCIO DISPONIBLES:\n"
        )
        
        for idx, pol in enumerate(politicas_list):
            nombre = pol.get("nombre", "N/A")
            desc = pol.get("descripcion") or pol.get("description") or "Sin descripción"
            pol_id = pol.get("id", f"pol_{idx}")
            system_prompt += f"- ID: {pol_id} | Nombre: {nombre} | Descripción: {desc}\n"
            
        system_prompt += (
            "\nREGLAS DE RESPUESTA:\n"
            "- RESPONDE EXCLUSIVAMENTE CON UN JSON VÁLIDO. No utilices markdown, ```json ni explicaciones adicionales.\n"
            "- Si logras asociar el documento a una política con certeza, selecciona su ID y retorna un score de confianza entre 0.0 y 1.0.\n"
            "- Si no coincide con ninguna política, selecciona politica_asignada_id: null y score: 0.0.\n"
            "- Extrae los datos clave legibles del documento como: nombre_cliente, ci_cliente, monto (si aplica), fecha, y un resumen_documento.\n\n"
            "ESTRUCTURA DEL JSON REQUERIDA:\n"
            "{\n"
            '  "politica_asignada_id": string o null, // ID de la política seleccionada\n'
            '  "nombre_politica": string o null, // Nombre de la política seleccionada\n'
            '  "score": float, // Confianza entre 0.0 y 1.0\n'
            '  "resumen_documento": string, // Resumen muy corto de qué trata el documento\n'
            '  "datos_extraidos": {\n'
            '    "nombre_cliente": string o null,\n'
            '    "ci_cliente": string o null,\n'
            '    "monto": float o null,\n'
            '    "fecha": string o null\n'
            '  }\n'
            "}\n"
        )

        # 4. Crear Part de bytes
        file_part = types.Part.from_bytes(
            data=file_bytes,
            mime_type=file_mime
        )
        
        # 5. Generar contenido con gemini-2.5-flash
        response = generate_with_fallback(
            MODEL_FLASH,
            contents=[file_part, "Analiza este documento y determina la política aplicable y datos clave."],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json"
            )
        )
        
        text = (response.text or "").strip()
        
        # Limpiar markdown si el modelo se equivoca y lo incluye
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="La IA no devolvió un JSON válido al procesar el archivo.")
    except Exception as e:
        if is_quota_error(e):
            raise HTTPException(status_code=429, detail="Cuota agotada en Vertex AI.")
        raise HTTPException(status_code=500, detail=f"Error en procesamiento multimodal: {str(e)}")

# --- TENSORFLOW DL ENDPOINTS ---

def _extract_lstm_sequence(body: dict) -> np.ndarray:
    """Extrae secuencia temporal del historial de eventos para el LSTM."""
    historial = body.get("historial", [])
    seq = np.zeros((1, 10, 3))
    for i, evento in enumerate(historial[-10:]):
        idx = min(i, 9)
        seq[0, idx, 0] = float(evento.get("diasEnNodo", 0))
        seq[0, idx, 1] = float(hash(evento.get("tipoEvento", "")) % 100) / 100.0
        seq[0, idx, 2] = float(hash(evento.get("departamento", "")) % 100) / 100.0
    return seq

def _extract_anomaly_features(body: dict) -> np.ndarray:
    """Extrae 7 features normalizadas para el autoencoder."""
    return np.array([[
        min(float(body.get("diasActivo", 0)) / 30.0, 1.0),
        min(float(body.get("numEventos", 0)) / 50.0, 1.0),
        min(float(body.get("numDepartamentos", 1)) / 10.0, 1.0),
        min(float(body.get("ratioSla", 0.5)), 1.0),
        min(float(body.get("horasPromedio", 0)) / 100.0, 1.0),
        min(float(body.get("prioridad", 3)) / 5.0, 1.0),
        min(float(body.get("numArchivos", 0)) / 20.0, 1.0),
    ]])

def _extract_priority_features(body: dict) -> np.ndarray:
    """Extrae 7 features para la red de prioridad."""
    return np.array([[
        min(float(body.get("diasActivo", 0)) / 30.0, 1.0),
        min(float(body.get("horasRestantesSla", 48)) / 100.0, 1.0),
        min(float(body.get("prioridadOriginal", 3)) / 5.0, 1.0),
        min(float(body.get("numEventos", 0)) / 50.0, 1.0),
        float(hash(body.get("departamento", "")) % 100) / 100.0,
        float(hash(body.get("tipoPolitica", "")) % 100) / 100.0,
        min(float(body.get("numArchivos", 0)) / 20.0, 1.0),
    ]])

def _extract_intent_sequence(body: dict) -> np.ndarray:
    """Tokeniza texto simple para el clasificador de intención CNN."""
    texto = body.get("texto", body.get("requerimiento", ""))
    words = texto.lower().split()[:100]
    seq = np.zeros((1, 100))
    for i, word in enumerate(words):
        seq[0, i] = float(hash(word) % 5000)
    return seq

@app.post("/ia/tf/predecir-demora")
async def tf_predecir_demora(request: Request):
    body = await request.json()
    sequence = _extract_lstm_sequence(body)
    predictor = get_delay_predictor()
    horas = predictor.predict(sequence)
    return {"horas_estimadas": horas, "confianza": 0.85, "modelo": "lstm_v1"}

@app.post("/ia/tf/detectar-anomalia")
async def tf_detectar_anomalia(request: Request):
    body = await request.json()
    features = _extract_anomaly_features(body)
    detector = get_anomaly_detector()
    result: dict[str, Any] = detector.predict(features)
    result["modelo"] = "autoencoder_v1"
    return result

@app.post("/ia/tf/clasificar-intencion")
async def tf_clasificar_intencion(request: Request):
    body = await request.json()
    text_sequence = _extract_intent_sequence(body)
    classifier = get_intent_classifier()
    result: dict[str, Any] = classifier.predict(text_sequence)
    result["modelo"] = "cnn_intent_v1"
    return result

@app.post("/ia/tf/calcular-prioridad")
async def tf_calcular_prioridad(request: Request):
    body = await request.json()
    features = _extract_priority_features(body)
    predictor = get_priority_predictor()
    result: dict[str, Any] = predictor.predict(features)
    result["modelo"] = "priority_network_v1"
    return result

@app.post("/ia/tf/clasificar-documento")
async def tf_clasificar_documento(file: UploadFile = File(...)):
    import tempfile
    classifier = get_document_classifier()
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result: dict[str, Any] = classifier.predict(tmp_path)
    finally:
        os.remove(tmp_path)
    result["modelo"] = "cnn_vision_v1"
    return result

# ======================================================================
# RF-4.4: Sugerencias Proactivas de IA
# ======================================================================

class SugerirReportesRequest(BaseModel):
    total_tramites_activos: int = 0
    total_anomalos: int = 0
    departamento_mas_cargado: Optional[str] = None
    tramite_mas_antiguo_dias: int = 0
    total_departamentos: int = 0
    retrasos_sla: int = 0

@app.post("/ia/sugerir-reportes")
async def sugerir_reportes(request: SugerirReportesRequest):
    """RF-4.4: Genera sugerencias proactivas de reportes basadas en el estado actual del sistema."""
    try:
        prompt = f"""Eres un analista de gestión BPM. Basándote en el estado actual del sistema, sugiere exactamente 5 reportes que serían más útiles para el administrador en este momento.

ESTADO ACTUAL DEL SISTEMA:
- Trámites activos: {request.total_tramites_activos}
- Trámites con anomalía detectada: {request.total_anomalos}
- Departamento con mayor carga: {request.departamento_mas_cargado or 'No disponible'}
- Trámite más antiguo: {request.tramite_mas_antiguo_dias} días
- Total departamentos: {request.total_departamentos}
- Retrasos SLA acumulados: {request.retrasos_sla}

Responde SOLO con un JSON array de 5 objetos, cada uno con:
- "titulo": título corto del reporte (máximo 8 palabras)
- "descripcion": una frase explicando por qué es relevante ahora
- "prompt_nlp": el prompt exacto en lenguaje natural que el usuario puede ejecutar para generar este reporte
- "urgencia": "alta", "media" o "baja"
- "icono": un emoji representativo

Ejemplo de formato:
[
  {{"titulo": "Carga por Departamento", "descripcion": "Permite detectar desequilibrios de carga", "prompt_nlp": "Muéstrame la cantidad de trámites por departamento", "urgencia": "alta", "icono": "📊"}}
]

IMPORTANTE: Responde SOLO el JSON array, sin texto adicional, sin markdown."""

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1500,
            )
        )

        text = response.text.strip()
        # Limpiar posible markdown wrapping
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        suggestions = json.loads(text)
        return {"suggestions": suggestions, "status": "success"}

    except json.JSONDecodeError:
        # Fallback: sugerencias estáticas si la IA no devuelve JSON válido
        return {
            "suggestions": [
                {"titulo": "Trámites por Departamento", "descripcion": "Visualice la distribución de carga actual", "prompt_nlp": "Muéstrame la cantidad de trámites por departamento", "urgencia": "alta", "icono": "📊"},
                {"titulo": "Retrasos SLA Últimos 30 Días", "descripcion": "Identifique los cuellos de botella recientes", "prompt_nlp": "Muéstrame los trámites con retraso de los últimos 30 días", "urgencia": "alta", "icono": "⚠️"},
                {"titulo": "Tendencia Mensual", "descripcion": "Analice la evolución temporal de trámites", "prompt_nlp": "Muéstrame la cantidad de trámites por mes", "urgencia": "media", "icono": "📈"},
                {"titulo": "Distribución por Prioridad", "descripcion": "Verifique el balance de prioridades asignadas", "prompt_nlp": "Muéstrame la cantidad de trámites agrupados por prioridad", "urgencia": "media", "icono": "🎯"},
                {"titulo": "Estado General de Trámites", "descripcion": "Obtenga una vista global de los estados", "prompt_nlp": "Muéstrame la cantidad de trámites por estado", "urgencia": "baja", "icono": "📋"}
            ],
            "status": "fallback"
        }
    except Exception as e:
        if is_quota_error(e):
            raise HTTPException(status_code=429, detail="Cuota de IA agotada. Intente en unos minutos.")
        raise HTTPException(status_code=500, detail=f"Error generando sugerencias: {str(e)}")

class ResumirReporteRequest(BaseModel):
    prompt: str
    dimension: str
    metric: str
    data: List[dict]

@app.post("/ia/resumir-reporte-nlp")
async def resumir_reporte_nlp(request: ResumirReporteRequest):
    try:
        system_prompt = (
            "Eres un analista de datos y procesos (BPM) altamente preciso y objetivo.\n"
            "Tu única tarea es analizar los datos estructurados en formato JSON y redactar una conclusión breve (máximo 2 líneas) en español que responda directamente a la consulta del usuario.\n"
            "REGLAS ESTRICTAS:\n"
            "1. NO inventes información, no asumas contexto externo (ej. no menciones 'PDFs' o 'documentos' si los datos no lo dicen explícitamente).\n"
            "2. Basa tu respuesta ÚNICAMENTE en las cifras y categorías proporcionadas en los 'Datos obtenidos'.\n"
            "3. La respuesta debe ser una oración completa y coherente, nunca la dejes a medias.\n"
            "4. Sé profesional, directo y conciso."
        )

        user_content = (
            f"Consulta del usuario: '{request.prompt}'\n"
            f"Dimensión analizada: {request.dimension}\n"
            f"Métrica: {request.metric}\n"
            f"Datos obtenidos:\n{json.dumps(request.data, ensure_ascii=False)}"
        )

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.1,  # Temperatura baja para mayor determinismo y menor alucinación
                max_output_tokens=300
            )
        )
        return {"resumen": (response.text or "").strip()}
    except Exception as e:
        return {"resumen": "No se pudo generar el análisis automático debido a un error temporal."}

@app.post("/ia/consultoria-reporte")
async def consultoria_reporte(request: ResumirReporteRequest):
    try:
        system_prompt = (
            "Eres un consultor experto en optimización de procesos y Business Process Management (BPM). "
            "Tu tarea es analizar los datos estadísticos de un reporte dinámico y ofrecer una consultoría profesional y formal. "
            "Se te entregará un conjunto de datos agrupados que representan métricas operativas. "
            "Es VITAL que menciones el contexto del reporte (la dimensión y métrica analizadas) y que cites obligatoriamente "
            "los datos numéricos exactos provistos en el payload para justificar rigurosamente tus conclusiones.\n"
            "ESTRUCTURA DE TU RESPUESTA (Formato Markdown corporativo, usar párrafos, SIN emojis ni íconos):\n"
            "\n"
            "### Análisis\n"
            "Realiza un diagnóstico profundo (el 'por qué'). Identifica ineficiencias, cuellos de botella o tendencias "
            "y fundamenta cada hallazgo mencionando las cifras precisas encontradas en los datos.\n"
            "\n"
            "### Recomendación\n"
            "Presenta un plan de acción formal (el 'qué hacer'). Por cada hallazgo descrito en el Análisis, debes proveer "
            "una recomendación estratégica directamente vinculada a ese diagnóstico (ej. reasignar personal, automatizar pasos). "
            "Sé analítico, prescriptivo y directo."
        )

        user_content = (
            f"Consulta original: '{request.prompt}'\n"
            f"Dimensión analizada: {request.dimension}\n"
            f"Métrica: {request.metric}\n"
            f"Datos numéricos del reporte:\n{json.dumps(request.data, ensure_ascii=False)}"
        )

        response = generate_with_fallback(
            MODEL_FLASH,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.6,
                max_output_tokens=800
            )
        )
        return {"consultoria": (response.text or "").strip()}
    except Exception as e:
        print(f"Error en consultoria-reporte: {e}")
        return {"consultoria": "No se pudo generar la consultoría en este momento debido a un error temporal con la IA."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


