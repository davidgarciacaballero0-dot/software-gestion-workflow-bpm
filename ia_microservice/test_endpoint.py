"""
Test script: Simula exactamente la petición HTTP que hace el frontend Angular.
Prueba el flujo completo: localhost:4200 (Nginx) → ia-service:8000 → Gemini API
"""
import requests
import json

BASE_URL_NGINX = "http://localhost:4200"  # A través de Nginx (como el navegador)
BASE_URL_DIRECT = "http://localhost:8000" # Directo al microservicio

def test_chat(url, prompt, rol="ADMIN"):
    print(f"\n{'='*60}")
    print(f"  URL: {url}/ia/chat-interactivo")
    print(f"  Rol: {rol}")
    print(f"  Prompt: {prompt}")
    print(f"{'='*60}")
    
    payload = {"prompt": prompt, "rol": rol}
    try:
        response = requests.post(f"{url}/ia/chat-interactivo", json=payload, timeout=60)
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ ÉXITO - Respuesta IA:")
            print(f"  {data.get('respuesta', 'Sin respuesta')[:500]}")
        else:
            print(f"  ❌ ERROR - Body: {response.text[:300]}")
    except Exception as e:
        print(f"  ❌ EXCEPCIÓN: {e}")

if __name__ == "__main__":
    # Test 1: Directo al microservicio Python
    print("\n🔹 TEST 1: Petición DIRECTA al microservicio (puerto 8000)")
    test_chat(BASE_URL_DIRECT, "listame los 3 departamentos con mayor cuello de botella", "ADMIN")
    
    # Test 2: A través de Nginx (como lo haría el navegador)
    print("\n🔹 TEST 2: Petición via NGINX (puerto 4200, como el navegador)")
    test_chat(BASE_URL_NGINX, "listame los 3 departamentos con mayor cuello de botella", "ADMIN")
    
    # Test 3: Rol Funcionario
    print("\n🔹 TEST 3: Petición como FUNCIONARIO")
    test_chat(BASE_URL_DIRECT, "como puedo derivar una tarea a otro departamento?", "FUNCIONARIO")
    
    # Test 4: Rol Cliente
    print("\n🔹 TEST 4: Petición como CLIENTE")
    test_chat(BASE_URL_DIRECT, "cuanto tiempo tarda un tramite de credito?", "CLIENTE")

    print("\n\n✅ Pruebas finalizadas.")
