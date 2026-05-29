import os
import json
from datetime import datetime
from typing import List, Optional, Any
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import google.genai as genai
from google.genai import types
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = FastAPI(title="BPM AI Microservice (Vertex AI Agent Platform Edition)")

# Configuración de Google Vertex AI (New SDK 2026)
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "workflow-smart-ia")
GCP_LOCATION = "global"

try:
    client = genai.Client(
        vertexai=True, 
        project=GCP_PROJECT_ID, 
        location=GCP_LOCATION
    )
    print(f"INFO: Google Gen AI Client inicializado en {GCP_PROJECT_ID} ({GCP_LOCATION})")
except Exception as e:
    print(f"CRITICAL: Error al inicializar el cliente Gen AI: {str(e)}")

MODEL_PRO = "gemini-3.1-pro-preview"
MODEL_FLASH = "gemini-3-flash-preview"

def is_quota_error(e):
    error_msg = str(e).lower()
    return "429" in error_msg or "quota" in error_msg or "resource_exhausted" in error_msg

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
        
        response = client.models.generate_content(
            model=MODEL_FLASH,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
            contents=mensaje
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
        response = client.models.generate_content(model=MODEL_PRO, contents=prompt)
        text = response.text
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
            "- Tipos válidos: START, USER_TASK, EXCLUSIVE_GATEWAY, END\n"
            "- EXACTAMENTE UN NODO 'START' y EXACTAMENTE UN NODO 'END'. ¡NO agregues múltiples nodos de fin!\n"
            "- CONVERGENCIA: TODOS los caminos DEBEN terminar apuntando al MISMO nodo END.\n"
            "- Las USER_TASK deben tener departmentId asignado lógicamente según su función, y slaHours.\n"
            "- Los EXCLUSIVE_GATEWAY bifurcan con edges que tienen condition ({variable: '...', operator: 'EQUALS', value: 'true'/'false'}).\n"
            f"- Departamentos disponibles: {json.dumps(deptos, ensure_ascii=False)}\n"
            "- NO incluyas texto, explicaciones ni bloques ```json```. Solo el JSON puro.\n"
        )

        response = client.models.generate_content(
            model=MODEL_FLASH,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
            contents=f"Diseña este flujo BPM: {comando}"
        )
        
        text = response.text.strip()
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
        print(f"Error JSON: No se pudo parsear la respuesta de la IA: {text[:200]}")
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
        response = client.models.generate_content(
            model=MODEL_FLASH,
            contents=f"Proyecta la demanda de trámites para {meses} meses a partir de {fecha_actual} en JSON con proyeccion_mensual y analisis_predictivo."
        )
        text = response.text
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
