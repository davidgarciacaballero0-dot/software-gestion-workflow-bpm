import requests, json, time

BASE = "http://localhost:8000"

print("=" * 60)
print("PRUEBA COMPLETA DE LOS 4 ENDPOINTS IA")
print("=" * 60)

# 1. CHATBOT
print("\n--- 1. CHATBOT (gemini-3-flash) ---")
s = time.time()
r = requests.post(f"{BASE}/ia/chat-interactivo", json={"mensaje": "Que es un proceso BPM?"})
print(f"Status: {r.status_code} | Tiempo: {round(time.time()-s, 2)}s")
print(f"Respuesta: {r.json().get('respuesta', '')[:200]}...")

# 2. ANALISIS
print("\n--- 2. ANALISIS (gemini-3.1-pro) ---")
s = time.time()
r = requests.post(f"{BASE}/ia/analizar-rendimiento", json={
    "metricas": [{"nombreDepartamento": "Legal", "cantidadTramites": 45, "tiempoPromedioHoras": 72.5}],
    "politicas": [{"nombre": "Creditos"}]
}, timeout=120)
print(f"Status: {r.status_code} | Tiempo: {round(time.time()-s, 2)}s")
print(f"Respuesta: {json.dumps(r.json(), ensure_ascii=False)[:300]}...")

# 3. PROYECCIONES
print("\n--- 3. PROYECCIONES (gemini-3-flash) ---")
s = time.time()
r = requests.post(f"{BASE}/ia/proyectar-demanda", json={"meses": 6}, timeout=60)
print(f"Status: {r.status_code} | Tiempo: {round(time.time()-s, 2)}s")
print(f"Respuesta: {json.dumps(r.json(), ensure_ascii=False)[:300]}...")

# 4. GENERADOR DE FLUJOS (AUTOGRAFICADO)
print("\n--- 4. GENERADOR DE FLUJOS (gemini-3-flash) ---")
s = time.time()
r = requests.post(f"{BASE}/ia/generar-flujo", json={
    "prompt": "Proceso de solicitud de vacaciones: empleado llena formulario, jefe aprueba o rechaza, RRHH valida y notifica",
    "departamentosDisponibles": [
        {"id": "dep_001", "nombre": "Recursos Humanos"},
        {"id": "dep_002", "nombre": "Gerencia"}
    ]
}, timeout=60)
t = round(time.time()-s, 2)
data = r.json()
print(f"Status: {r.status_code} | Tiempo: {t}s")
print(f"Tiene 'nodes': {'nodes' in data}")
print(f"Tiene 'edges': {'edges' in data}")

nodes = data.get("nodes", [])
edges = data.get("edges", [])
print(f"Cantidad nodos: {len(nodes)}")
print(f"Cantidad edges: {len(edges)}")

print("\nNODOS:")
for n in nodes:
    print(f"  {n['id']}: type={n['type']}, name={n['name']}, pos={n.get('uiPosition')}, dept={n.get('departmentId','')}, sla={n.get('slaHours',0)}")

print("\nEDGES:")
for e in edges:
    cond = e.get("condition")
    print(f"  {e['id']}: {e['sourceNodeId']} -> {e['targetNodeId']}, condition={cond}")
    if cond and isinstance(cond, dict):
        print(f"    OK: condition es un objeto con variable={cond.get('variable')}, operator={cond.get('operator')}, value={cond.get('value')}")
    elif cond:
        print(f"    PROBLEMA: condition es {type(cond).__name__}, deberia ser dict!")
