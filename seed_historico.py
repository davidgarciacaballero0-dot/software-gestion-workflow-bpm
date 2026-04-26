import os
import random
from datetime import datetime, timedelta
import calendar
from pymongo import MongoClient
from bson.objectid import ObjectId

# Configuración de Conexión a MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/bpm_workflow")

def get_random_date_in_month(year, month):
    num_days = calendar.monthrange(year, month)[1]
    # Limitar a abril 25 en 2026
    if year == 2026 and month == 4:
        num_days = min(num_days, 25)
    
    day = random.randint(1, num_days)
    hour = random.randint(8, 17) # Horario laboral
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return datetime(year, month, day, hour, minute, second)

def generate_base_volume(year, month):
    """
    Simula una curva de crecimiento real:
    - 2024: Volumen base bajo (10-15)
    - 2025: Volumen medio (20-30)
    - 2026: Volumen alto (35-50)
    - Estacionalidad: Picos en junio (+30%) y diciembre (+50%)
    """
    base_volume = 10
    
    # Crecimiento anual
    if year == 2024:
        base_volume += random.randint(0, 5)
    elif year == 2025:
        base_volume += random.randint(10, 20)
    elif year == 2026:
        base_volume += random.randint(25, 40)
        
    # Estacionalidad
    if month == 6: # Junio
        base_volume = int(base_volume * 1.3)
    elif month == 12: # Diciembre
        base_volume = int(base_volume * 1.5)
        
    # Ruido aleatorio mensual +/- 10%
    base_volume = int(base_volume * random.uniform(0.9, 1.1))
    return base_volume

def seed_database():
    print(f"🔌 Conectando a MongoDB en {MONGO_URI}...")
    client = MongoClient(MONGO_URI)
    try:
        db = client.get_default_database()
    except Exception:
        db = client["bpm_workflow"]
    
    # 1. Limpieza segura: Borrar solo los datos inyectados previamente
    result = db.tramites_instancias.delete_many({"isSeeded": True})
    print(f"🧹 Limpieza: {result.deleted_count} trámites inyectados anteriormente fueron eliminados.")
    
    # 2. Obtener catálogos reales
    politicas = list(db.politicas_workflow.find({"status": "PUBLISHED"}))
    if not politicas:
        print("❌ Error: No hay políticas publicadas en la base de datos.")
        print("Por favor, entra al sistema, crea una política y publícala antes de correr el script.")
        return
        
    usuarios = list(db.usuarios.find())
    if not usuarios:
        print("⚠️ Advertencia: No hay usuarios. Creando un usuario dummy para los trámites.")
        dummy_user_id = db.usuarios.insert_one({
            "nombre": "Usuario",
            "apellidos": "Simulado",
            "ci": "0000000",
            "email": "dummy@bpm.com",
            "createdAt": datetime.now()
        }).inserted_id
        usuarios = [{"_id": dummy_user_id}]
        
    # 3. Generar Historial
    print("📈 Iniciando generación de historial (Ene 2024 - Abr 2026)...")
    
    tramites_a_insertar = []
    secuencia_global = 1
    
    # Rango de meses
    meses_rango = []
    for y in [2024, 2025]:
        for m in range(1, 13):
            meses_rango.append((y, m))
    for m in range(1, 5): # Enero a Abril 2026
        meses_rango.append((2026, m))
        
    for politica in politicas:
        pol_id = str(politica["_id"])
        
        # Encontrar el nodo final y un departamento (si lo hay)
        nodo_final = next((n for n in politica.get("nodes", []) if n.get("type") == "END"), None)
        nodo_final_id = nodo_final.get("id", nodo_final.get("_id", "node-end-dummy")) if nodo_final else "node-end-dummy"
        
        print(f"  -> Generando para política: {politica.get('nombre', 'Desconocida')} (ID: {pol_id})")
        
        for year, month in meses_rango:
            volumen = generate_base_volume(year, month)
            
            for _ in range(volumen):
                # Generar fecha de creación aleatoria en ese mes
                created_at = get_random_date_in_month(year, month)
                
                # Asignar a un usuario aleatorio
                usuario = random.choice(usuarios)
                user_id = str(usuario["_id"])
                
                # Simular tiempo de resolución (SLA)
                horas_resolucion = random.randint(12, 120) # Entre medio día y 5 días
                updated_at = created_at + timedelta(hours=horas_resolucion)
                
                codigo = f"TRM-{year}-{secuencia_global:04d}"
                secuencia_global += 1
                
                tramite = {
                    "codigoTramite": codigo,
                    "idPolitica": pol_id,
                    "idUsuarioSolicitante": user_id,
                    "estadoActual": "FINALIZADO",
                    "nodoActualId": nodo_final_id,
                    "departamentoActualId": None,
                    "prioridad": random.choices([1, 2, 3, 4, 5], weights=[0.1, 0.4, 0.3, 0.15, 0.05])[0],
                    "datosAcumuladosFormulario": {"nota": "Inyectado por Seed Script"},
                    "fechaInicioNodoActual": updated_at,
                    "createdAt": created_at,
                    "updatedAt": updated_at,
                    "isSeeded": True # Flag crucial para limpieza y control
                }
                tramites_a_insertar.append(tramite)

    # 4. Inserción Masiva
    if tramites_a_insertar:
        db.tramites_instancias.insert_many(tramites_a_insertar)
        print(f"✅ ¡Éxito! Se insertaron {len(tramites_a_insertar)} trámites históricos.")
        print("📊 Ahora la Inteligencia Artificial tiene datos reales para calcular estacionalidad y proyectar.")
    else:
        print("⚠️ No se generaron trámites.")
        
    client.close()

if __name__ == "__main__":
    seed_database()
