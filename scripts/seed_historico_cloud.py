import os
import sys
import random
import calendar
import argparse
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson.objectid import ObjectId

# Configuración de nombres y apellidos realistas para creación de clientes
NOMBRES = ["Alejandro", "Andres", "Carlos", "Christian", "Daniel", "David", "Diego", "Eduardo", "Fernando", "Gabriel", 
           "Gonzalo", "Gustavo", "Hugo", "Javier", "Jorge", "Jose", "Juan", "Luis", "Manuel", "Mauricio", "Oscar", 
           "Pablo", "Pedro", "Ramiro", "Roberto", "Rodrigo", "Santiago", "Sebastian", "Victor", "Camila", "Carolina", 
           "Daniela", "Gabriela", "Isabel", "Laura", "Lucia", "Maria", "Mariana", "Natalia", "Paola", "Patricia", 
           "Sofia", "Valeria", "Vanessa", "Andrea", "Alejandra", "Fernanda", "Clara", "Elena", "Claudia"]

APELLIDOS = ["Flores", "Gomez", "Gonzalez", "Gutierrez", "Hernandez", "Jimenez", "Lopez", "Martinez", "Mejia", "Mendoza", 
             "Morales", "Ortiz", "Perez", "Ramirez", "Ramos", "Rodriguez", "Ruiz", "Sanchez", "Suarez", "Torres", 
             "Vargas", "Vasquez", "Velásquez", "García", "Caballero", "Pinto", "Siles", "Copa", "Rojas", "Mamani", 
             "Quispe", "Condori", "Choque", "Molina", "Camacho", "Soliz", "Paz", "Mendez", "Castro", "Romero"]

POLICIES_MAPPING = {
    "Solicitud de Vacaciones Anuales": "VAC",
    "Instalación de Fibra Óptica (Residencial)": "FIB",
    "Prueba 2026": "PRU",
    "EJEMPLO: Flujo de Aprobación": "APR"
}

def get_random_date(start_date, end_date):
    delta = end_date - start_date
    int_delta = (delta.days * 24 * 60 * 60) + delta.seconds
    random_second = random.randrange(int_delta)
    return start_date + timedelta(seconds=random_second)

def generate_monthly_distribution(total_count):
    """
    Genera una lista de tuplas (year, month) ponderadas para simular crecimiento:
    - 2024: ~20%
    - 2025: ~50%
    - 2026 (Ene - Jun 10): ~30%
    Con picos estacionales en Junio (+30%) y Diciembre (+50%)
    """
    bins = []
    # 2024
    for m in range(1, 13):
        weight = 1.0
        if m == 6: weight = 1.3
        elif m == 12: weight = 1.5
        bins.append((2024, m, weight * 0.2))
    # 2025
    for m in range(1, 13):
        weight = 1.0
        if m == 6: weight = 1.3
        elif m == 12: weight = 1.5
        bins.append((2025, m, weight * 0.5))
    # 2026 (Ene - Jun)
    for m in range(1, 7):
        weight = 1.0
        if m == 6: 
            # Junio de 2026 solo tiene 10 días transcurridos
            weight = 1.3 * (10.0 / 30.0)
        bins.append((2026, m, weight * 0.3))
        
    choices = [b[:2] for b in bins]
    weights = [b[2] for b in bins]
    
    selected_months = random.choices(choices, weights=weights, k=total_count)
    return selected_months

def sync_database_schema(db):
    """
    Sincroniza los cambios del diseño local de base de datos con la nube.
    1. Asegura la existencia de colecciones nuevas.
    2. Actualiza los documentos existentes agregando los nuevos campos de diseño.
    """
    print("[INFO] Sincronizando diseno de base de datos con la nube...")
    
    # 1. Asegurar colecciones
    required_cols = ["alertas_insight_ia", "sugerencia_reasignacion"]
    for col in required_cols:
        if col not in db.list_collection_names():
            db.create_collection(col)
            print(f"  [NEW] Coleccion creada en la nube: '{col}'")
            
    # 2. Migración de documentos antiguos en tramites_instancias
    print("  [UPDATE] Actualizando documentos antiguos en 'tramites_instancias'...")
    filter_query = {
        "$or": [
            {"nodosActualesIds": {"$exists": False}},
            {"prioridad": {"$exists": False}},
            {"esAnomalo": {"$exists": False}},
            {"archivosAdjuntos": {"$exists": False}},
            {"version": {"$exists": False}}
        ]
    }
    
    cursor = db.tramites_instancias.find(filter_query)
    updated_count = 0
    for doc in cursor:
        update_fields = {}
        
        # Sincronizar listas de nodos/departamentos actuales (offline sync)
        if "nodosActualesIds" not in doc:
            update_fields["nodosActualesIds"] = [doc.get("nodoActualId")] if doc.get("nodoActualId") else []
        if "departamentosActualesIds" not in doc:
            update_fields["departamentosActualesIds"] = [doc.get("departamentoActualId")] if doc.get("departamentoActualId") else []
            
        # Sincronizar prioridad
        if "prioridad" not in doc:
            update_fields["prioridad"] = 3
        if "dynamicPriority" not in doc:
            update_fields["dynamicPriority"] = doc.get("prioridad", 3)
            
        # Sincronizar anomalías
        if "esAnomalo" not in doc:
            update_fields["esAnomalo"] = False
        if "anomaliaDetalle" not in doc:
            update_fields["anomaliaDetalle"] = ""
            
        # Sincronizar adjuntos y documentos requeridos
        if "archivosAdjuntos" not in doc:
            update_fields["archivosAdjuntos"] = {}
        if "documentosDinamicosRequeridos" not in doc:
            update_fields["documentosDinamicosRequeridos"] = []
            
        # Sincronizar optimisic locking version
        if "version" not in doc:
            update_fields["version"] = 1
            
        if update_fields:
            db.tramites_instancias.update_one({"_id": doc["_id"]}, {"$set": update_fields})
            updated_count += 1
            
    print(f"  [SUCCESS] Sincronizacion de diseno completada. {updated_count} documentos antiguos actualizados.")

def seed_clients(db, count=50):
    """
    Se asegura de que existan al menos 'count' clientes en la colección 'usuarios'.
    Si faltan, crea nuevos clientes usando datos ficticios realistas y un hash de password válido.
    """
    print("[INFO] Verificando catalogo de clientes...")
    
    # Encontrar rol de cliente
    cliente_rol = db.roles.find_one({"nombre": "CLIENTE"})
    if not cliente_rol:
        print("  [WARNING] Rol 'CLIENTE' no encontrado. Creando rol por defecto...")
        cliente_rol_id = db.roles.insert_one({
            "nombre": "CLIENTE",
            "permisos": ["START_TRAMITE"],
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "_class": "com.bpm.data.entities.Rol"
        }).inserted_id
    else:
        cliente_rol_id = cliente_rol["_id"]
        
    # Buscar un passwordHash válido de algún usuario existente para reutilizarlo
    sample_user = db.usuarios.find_one()
    password_hash = sample_user.get("passwordHash") if sample_user else "$2a$10$tZ9y4d1qU1u1u1u1u1u1u1u1u1u1u1u1u1u1u1u1u1u1u1u1u1u1u" # BCrypt hash genérico para password123
    
    existing_clients = list(db.usuarios.find({"idRol": str(cliente_rol_id)}))
    clients_needed = count - len(existing_clients)
    
    if clients_needed <= 0:
        print(f"  [SUCCESS] Hay suficientes clientes en la base de datos ({len(existing_clients)} encontrados).")
        return [str(c["_id"]) for c in existing_clients]
        
    print(f"  [INFO] Creando {clients_needed} nuevos clientes para simulacion...")
    new_clients = []
    for i in range(clients_needed):
        nombre = random.choice(NOMBRES)
        apellido = random.choice(APELLIDOS)
        ci = str(random.randint(4000000, 9999999))
        celular = str(random.randint(60000000, 79999999))
        email = f"cliente.{nombre.lower()}.{apellido.lower()}{i+1}@bpm.com"
        
        # Fecha de nacimiento aleatoria (entre 18 y 65 años antes de 2026)
        birth_date = datetime(2026, 6, 10) - timedelta(days=random.randint(18*365, 65*365))
        
        client_doc = {
            "nombre": nombre,
            "apellidos": apellido,
            "ci": ci,
            "celular": celular,
            "email": email,
            "passwordHash": password_hash,
            "idRol": str(cliente_rol_id),
            "idOrganizacion": None,
            "idDepartamento": None,
            "fechaNacimiento": birth_date,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "_class": "com.bpm.data.entities.Usuario"
        }
        
        inserted_id = db.usuarios.insert_one(client_doc).inserted_id
        new_clients.append(str(inserted_id))
        
    all_clients = [str(c["_id"]) for c in existing_clients] + new_clients
    print(f"  [SUCCESS] Catalogo listo con {len(all_clients)} clientes.")
    return all_clients

def build_workflow_maps(politicas):
    """
    Analiza las políticas de workflow y extrae mapas de nodos y transiciones para el simulador.
    """
    maps = {}
    for p in politicas:
        p_id = str(p["_id"])
        nodes = p.get("nodes", [])
        edges = p.get("edges", [])
        
        nodes_dict = {n.get("_id"): n for n in nodes}
        
        # Encontrar el nodo start
        start_node = next((n for n in nodes if n.get("type") == "START"), None)
        
        # Mapear transiciones salientes: sourceNodeId -> list of edges
        outgoing_edges = {}
        for e in edges:
            src = e.get("sourceNodeId")
            if src not in outgoing_edges:
                outgoing_edges[src] = []
            outgoing_edges[src].append(e)
            
        maps[p_id] = {
            "policy": p,
            "nodes": nodes_dict,
            "start_node": start_node,
            "outgoing": outgoing_edges
        }
    return maps

def simulate_procedure(clients_map, policy_id, client_id, created_at, workflow_map, funcionarios_by_dept, final_state, seq_num):
    """
    Simula el ciclo de vida completo de un trámite.
    Retorna la lista de documentos de EventoHistorial y el documento final de TramiteInstancia.
    """
    nodes = workflow_map["nodes"]
    outgoing = workflow_map["outgoing"]
    start_node = workflow_map["start_node"]
    policy = workflow_map["policy"]
    
    if not start_node:
        return None, None
        
    p_name = policy.get("nombre", "Trámite")
    p_prefix = POLICIES_MAPPING.get(p_name, "TRM")
    
    tramite_id = ObjectId()
    tramite_code = f"HST-{created_at.year}-{seq_num:05d}"
    
    events = []
    current_time = created_at
    
    # 1. Evento de Creación en el nodo start
    events.append({
        "idTramite": str(tramite_id),
        "nodoOrigenId": None,
        "nodoDestinoId": start_node["_id"],
        "nodoDestinoNombre": start_node.get("name", "Inicio"),
        "ejecutadoPorUsuarioId": client_id,
        "ejecutadoPorNombre": "Cliente Simulado",
        "tipoEvento": "CREACION",
        "createdAt": current_time,
        "_class": "com.bpm.data.entities.EventoHistorial"
    })
    
    current_node_id = start_node["_id"]
    current_dept_id = start_node.get("departmentId")
    
    # Caminar el grafo
    visited_nodes = [current_node_id]
    formulario_acumulado = {}
    
    active_state = "EN_PROGRESO"
    last_user_task_node = None
    
    # Límite absoluto: la fecha simulada actual es 10/06/2026 19:00:00
    SIMULATION_LIMIT = datetime(2026, 6, 10, 19, 0, 0)
    
    while True:
        edges = outgoing.get(current_node_id, [])
        if not edges:
            break
            
        # Elegir arista
        selected_edge = None
        if len(edges) == 1:
            selected_edge = edges[0]
        else:
            # Bifurcación (e.g. exclusive gateway o condiciones)
            # Buscamos si hay alguna condición. Si la hay, elegimos según el final_state deseado
            conditional_edges = [e for e in edges if e.get("condition")]
            default_edges = [e for e in edges if not e.get("condition")]
            
            if conditional_edges:
                cond = conditional_edges[0]["condition"]
                var_name = cond.get("variable")
                var_val = cond.get("value")
                
                if final_state == "RECHAZADO" and var_val in ["false", "no"]:
                    # Elegimos el camino del rechazo
                    selected_edge = conditional_edges[0]
                    formulario_acumulado[var_name] = False
                elif final_state == "FINALIZADO" and var_val in ["true", "si"]:
                    # Elegimos el camino exitoso
                    selected_edge = conditional_edges[0]
                    formulario_acumulado[var_name] = True
                else:
                    # En otro caso, elegimos al azar
                    selected_edge = random.choice(edges)
                    if selected_edge.get("condition"):
                        formulario_acumulado[var_name] = (selected_edge["condition"].get("value") in ["true", "si"])
            else:
                selected_edge = random.choice(edges)
                
        next_node_id = selected_edge["targetNodeId"]
        next_node = nodes.get(next_node_id)
        if not next_node:
            break
            
        # Procesar salto al nodo destino
        node_type = next_node.get("type")
        node_name = next_node.get("name", "Etapa")
        node_dept = next_node.get("departmentId")
        
        # Simular duración si es USER_TASK
        duration_hours = 0
        if node_type == "USER_TASK":
            last_user_task_node = next_node
            sla = next_node.get("slaHours", 24)
            if not sla: sla = 24
            
            # Simular Cuellos de Botella (IT y Finanzas lentos en 2024/2025, rápidos en 2026)
            is_bottleneck_dept = node_dept in ["69f223e5f7dbbed66a53362e", "69f223e5f7dbbed66a533630"] # IT or Finanzas
            is_old_year = current_time.year in [2024, 2025]
            
            if is_bottleneck_dept and is_old_year:
                # Retraso severo: Excede el SLA! 1.2x a 3.0x del SLA
                duration_hours = random.uniform(sla * 1.2, sla * 3.0)
            else:
                # Duración normal rápida: 15% a 60% del SLA
                duration_hours = random.uniform(sla * 0.15, sla * 0.6)
                
            # Agregar algo de ruido al azar
            current_time += timedelta(hours=duration_hours)
            
            # Si se excede el límite temporal y el trámite debe quedar EN_PROGRESO
            if final_state == "EN_PROGRESO" and current_time >= SIMULATION_LIMIT:
                # Cortar aquí: el trámite queda atascado en este nodo
                active_state = "EN_PROGRESO"
                current_time = SIMULATION_LIMIT - timedelta(minutes=random.randint(10, 200))
                break
                
        # Quién ejecuta este avance?
        executor_id = client_id
        executor_name = "Cliente Simulado"
        
        if node_type == "USER_TASK" and node_dept:
            funcs = funcionarios_by_dept.get(node_dept, [])
            if funcs:
                f = random.choice(funcs)
                executor_id = str(f["_id"])
                executor_name = f"{f.get('nombre')} {f.get('apellidos')}"
            else:
                executor_name = "Funcionario Asignado"
                
        # Calcular SLA consumido para registrar en el historial
        sla_hours_defined = next_node.get("slaHours", 24) if next_node.get("slaHours") else 24
        excedio_sla = False
        if node_type == "USER_TASK":
            excedio_sla = duration_hours > sla_hours_defined
            
        events.append({
            "idTramite": str(tramite_id),
            "nodoOrigenId": current_node_id,
            "nodoDestinoId": next_node_id,
            "nodoDestinoNombre": node_name,
            "ejecutadoPorUsuarioId": executor_id,
            "ejecutadoPorNombre": executor_name,
            "tipoEvento": "AVANCE" if node_type != "END" else ("RECHAZO" if "rechazo" in next_node_id.lower() or "no factible" in node_name.lower() else "FINALIZACION"),
            "tiempoSLAConsumidoMinutos": int(duration_hours * 60) if node_type == "USER_TASK" else None,
            "excedioSLA": excedio_sla if node_type == "USER_TASK" else None,
            "slaVencimientoEsperado": current_time + timedelta(hours=sla_hours_defined) if node_type == "USER_TASK" else None,
            "createdAt": current_time,
            "_class": "com.bpm.data.entities.EventoHistorial"
        })
        
        current_node_id = next_node_id
        current_dept_id = node_dept
        visited_nodes.append(current_node_id)
        
        if node_type == "END":
            active_state = "RECHAZADO" if "rechazo" in next_node_id.lower() or "no factible" in node_name.lower() else "FINALIZADO"
            break
            
    # Llenar datos acumulados del formulario con datos dummy realistas basados en la definición de la política
    # Para simular lo guardado
    for n in nodes.values():
        for f in n.get("formDefinition", []):
            fid = f.get("fieldId")
            ftype = f.get("type")
            if fid not in formulario_acumulado:
                if ftype == "BOOLEAN":
                    formulario_acumulado[fid] = random.choice([True, False])
                elif ftype == "NUMBER":
                    formulario_acumulado[fid] = random.randint(1, 100)
                elif ftype == "DATE":
                    formulario_acumulado[fid] = (current_time - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
                else:
                    formulario_acumulado[fid] = f"Dato simulado para {fid}"
                    
    # Crear registro final de trámite
    # Buscamos el nombre del solicitante
    client_user = clients_map.get(client_id)
    c_name = f"{client_user.get('nombre')} {client_user.get('apellidos')}" if client_user else "Cliente Simulado"
    c_ci = client_user.get("ci", "0000000") if client_user else "0000000"
    
    # Determinar si el trámite final quedará marcado como anómalo
    # Si excedió SLA en su último paso y está en progreso, es anómalo!
    es_anomalo = False
    anomalia_detalle = ""
    if active_state == "EN_PROGRESO" and last_user_task_node:
        time_at_node = (SIMULATION_LIMIT - current_time).total_seconds() / 3600.0
        sla_hours = last_user_task_node.get("slaHours", 24) if last_user_task_node.get("slaHours") else 24
        if time_at_node > sla_hours:
            es_anomalo = True
            anomalia_detalle = f"El tramite lleva {int(time_at_node)} horas en el nodo '{last_user_task_node.get('name')}', excediendo el SLA de {sla_hours} horas."
            
    # Configurar prioridades
    prioridad = random.choices([1, 2, 3, 4, 5], weights=[0.1, 0.4, 0.3, 0.15, 0.05])[0]
    
    tramite_doc = {
        "_id": tramite_id,
        "codigoTramite": tramite_code,
        "idPolitica": policy_id,
        "idUsuarioSolicitante": client_id,
        "estadoActual": active_state,
        "nodoActualId": current_node_id if active_state == "EN_PROGRESO" else None,
        "departamentoActualId": current_dept_id if active_state == "EN_PROGRESO" else None,
        "nodosActualesIds": [current_node_id] if active_state == "EN_PROGRESO" else [],
        "departamentosActualesIds": [current_dept_id] if active_state == "EN_PROGRESO" and current_dept_id else [],
        "ciSolicitante": c_ci,
        "nombreSolicitante": c_name,
        "funcionarioAsignadoId": None,
        "prioridad": prioridad,
        "dynamicPriority": prioridad,
        "esAnomalo": es_anomalo,
        "anomaliaDetalle": anomalia_detalle,
        "datosAcumuladosFormulario": formulario_acumulado,
        "archivosAdjuntos": {},
        "documentosDinamicosRequeridos": [],
        "fechaInicioNodoActual": current_time if active_state == "EN_PROGRESO" else None,
        "fechaVencimientoSla": current_time + timedelta(hours=24) if active_state == "EN_PROGRESO" else None,
        "createdAt": created_at,
        "updatedAt": current_time,
        "version": 1,
        "isSeeded": True,
        "_class": "com.bpm.data.entities.TramiteInstancia"
    }
    
    return tramite_doc, events

def main():
    parser = argparse.ArgumentParser(description="Inyección de Trámites Históricos en MongoDB Atlas")
    parser.add_argument("--clean", action="store_true", help="Elimina los datos inyectados previamente y finaliza")
    parser.add_argument("--count", type=int, default=1000, help="Cantidad de trámites a inyectar (def: 1000)")
    parser.add_argument("--dry-run", action="store_true", help="Simula el proceso y muestra estadísticas sin escribir en la DB")
    args = parser.parse_args()
    
    # Cargar variables del .env
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(dotenv_path=env_path)
    
    mongo_uri = os.getenv("SPRING_DATA_MONGODB_URI")
    if not mongo_uri:
        print("[ERROR] SPRING_DATA_MONGODB_URI no se encuentra en el archivo .env.")
        sys.exit(1)
        
    print(f"[INFO] Conectando a MongoDB Atlas en {mongo_uri[:50]}...")
    client = MongoClient(mongo_uri)
    db = client.get_default_database()
    
    # 1. Operación de limpieza
    if args.clean:
        print("[INFO] Iniciando limpieza de datos historicos inyectados anteriormente...")
        t_clean = db.tramites_instancias.delete_many({"isSeeded": True})
        e_clean = db.eventos_historial.delete_many({"idTramite": {"$in": [str(tid) for tid in db.tramites_instancias.distinct("_id", {"isSeeded": True})]}})
        print(f"  [INFO] Se eliminaron {t_clean.deleted_count} tramites y sus correspondientes eventos historicos de la nube.")
        client.close()
        return
        
    # 2. Sincronizar esquema
    if not args.dry_run:
        sync_database_schema(db)
        
    # 3. Preparar catálogos
    politicas = list(db.politicas_workflow.find({"status": "PUBLISHED"}))
    if not politicas:
        print("[ERROR] No se encontraron politicas publicadas en la nube. Por favor inicializa las politicas primero.")
        client.close()
        sys.exit(1)
        
    print(f"[INFO] Encontradas {len(politicas)} politicas publicadas.")
    
    # Sincronizar catálogo de clientes
    if args.dry_run:
        clientes_ids = [f"client-dummy-{i}" for i in range(50)]
        clients_map = {}
    else:
        clientes_ids = seed_clients(db, count=50)
        # Cargar todos los clientes en memoria para evitar consultas recurrentes en red
        cliente_rol = db.roles.find_one({"nombre": "CLIENTE"})
        cliente_rol_id = str(cliente_rol["_id"]) if cliente_rol else "69f223e5f7dbbed66a53362c"
        clients_map = {str(c["_id"]): c for c in db.usuarios.find({"idRol": cliente_rol_id})}
        
    # Agrupar funcionarios por departamento
    funcionarios_by_dept = {}
    if not args.dry_run:
        # Los funcionarios tienen el rol FUNCIONARIO (ID: 69f223e4f7dbbed66a53362b o el nombre de rol)
        func_rol = db.roles.find_one({"nombre": "FUNCIONARIO"})
        func_rol_id = str(func_rol["_id"]) if func_rol else "69f223e4f7dbbed66a53362b"
        
        all_funcs = list(db.usuarios.find({"idRol": func_rol_id}))
        for f in all_funcs:
            dept = f.get("idDepartamento")
            if dept:
                if dept not in funcionarios_by_dept:
                    funcionarios_by_dept[dept] = []
                funcionarios_by_dept[dept].append(f)
                
    # Construir mapa de aristas y nodos de los workflows
    workflow_maps = build_workflow_maps(politicas)
    
    # 4. Iniciar simulación masiva
    total_tramites = args.count
    print(f"[INFO] Simulando {total_tramites} tramites historicos...")
    
    selected_months = generate_monthly_distribution(total_tramites)
    
    tramites_a_insertar = []
    eventos_a_insertar = []
    
    # Contadores estadísticos
    stats_years = {2024: 0, 2025: 0, 2026: 0}
    stats_states = {"FINALIZADO": 0, "RECHAZADO": 0, "EN_PROGRESO": 0}
    stats_policies = {}
    
    global_seq = 1
    
    for idx, (year, month) in enumerate(selected_months):
        # Elegir política al azar
        pol = random.choice(politicas)
        pol_id = str(pol["_id"])
        pol_name = pol.get("nombre")
        stats_policies[pol_name] = stats_policies.get(pol_name, 0) + 1
        
        # Elegir solicitante al azar
        client_id = random.choice(clientes_ids)
        
        # Generar fecha de creación
        # Para 2026, limitar a Junio 10
        if year == 2026 and month == 6:
            start_date = datetime(2026, 6, 1)
            end_date = datetime(2026, 6, 10, 18, 0, 0)
        else:
            num_days = calendar.monthrange(year, month)[1]
            start_date = datetime(year, month, 1)
            end_date = datetime(year, month, num_days, 23, 59, 59)
            
        created_at = get_random_date(start_date, end_date)
        
        # Determinar estado final para este trámite
        # 80% FINALIZADO, 15% RECHAZADO, 5% EN_PROGRESO
        final_state = random.choices(["FINALIZADO", "RECHAZADO", "EN_PROGRESO"], weights=[0.8, 0.15, 0.05])[0]
        
        # Trámites más antiguos a 2026-05 no deberían estar "EN_PROGRESO" en la vida real,
        # así que si cae antes de mayo de 2026 y sale "EN_PROGRESO", lo forzamos a FINALIZADO
        if final_state == "EN_PROGRESO" and (year < 2026 or month < 5):
            final_state = "FINALIZADO"
            
        # Simular
        tramite_doc, events = simulate_procedure(
            clients_map=clients_map,
            policy_id=pol_id,
            client_id=client_id,
            created_at=created_at,
            workflow_map=workflow_maps[pol_id],
            funcionarios_by_dept=funcionarios_by_dept,
            final_state=final_state,
            seq_num=global_seq
        )
        
        if tramite_doc:
            tramites_a_insertar.append(tramite_doc)
            eventos_a_insertar.extend(events)
            
            stats_years[year] += 1
            stats_states[tramite_doc["estadoActual"]] += 1
            global_seq += 1
            
    # Mostrar estadísticas
    print("\n[INFO] Estadisticas de Datos Generados:")
    print("Por Ano:")
    for y, count in stats_years.items():
        print(f"  - {y}: {count} tramites ({count/total_tramites*100:.1f}%)")
    print("Por Estado Final:")
    for s, count in stats_states.items():
        print(f"  - {s}: {count} tramites ({count/total_tramites*100:.1f}%)")
    print("Por Politica de Workflow:")
    for p, count in stats_policies.items():
        print(f"  - {p}: {count} tramites")
        
    print(f"\nTotal Tramites: {len(tramites_a_insertar)}")
    print(f"Total Eventos Historial: {len(eventos_a_insertar)}")
    
    # 5. Inserción definitiva
    if args.dry_run:
        print("\n[INFO] Modo Simulacion (dry-run) activo. No se realizaron cambios en la base de datos.")
    else:
        print("\n[INFO] Inyectando datos en la base de datos de MongoDB Atlas...")
        
        # Limpieza previa de cualquier corrida fallida para evitar duplicados
        db.tramites_instancias.delete_many({"isSeeded": True})
        db.eventos_historial.delete_many({"isSeeded": True}) 
        
        # Añadir isSeeded=True a los eventos para limpiarlos fácil
        for ev in eventos_a_insertar:
            ev["isSeeded"] = True
            
        # Inserción masiva en chunks para evitar límites de tamaño de payload
        chunk_size = 500
        for i in range(0, len(tramites_a_insertar), chunk_size):
            db.tramites_instancias.insert_many(tramites_a_insertar[i:i+chunk_size])
        print(f"  [SUCCESS] {len(tramites_a_insertar)} documentos inyectados en 'tramites_instancias'.")
        
        for i in range(0, len(eventos_a_insertar), chunk_size):
            db.eventos_historial.insert_many(eventos_a_insertar[i:i+chunk_size])
        print(f"  [SUCCESS] {len(eventos_a_insertar)} documentos inyectados en 'eventos_historial'.")
        
        print("\n[SUCCESS] Datos historicos de 3 anos cargados de forma exitosa y coherente.")
        
    client.close()

if __name__ == "__main__":
    main()
