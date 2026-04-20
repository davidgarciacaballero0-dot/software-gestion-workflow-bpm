const BASE = 'http://localhost:8080/api/v1';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const text = await res.text();
    if (!res.ok) {
       console.error(`Error ${res.status} en ${path}:`, text);
       return { status: res.status, text, ok: false };
    }
    let json = null;
    try { json = JSON.parse(text); } catch (e) { console.error('Error parseando JSON:', text); }
    return { status: res.status, json, ok: res.ok };
  } catch (e) {
    return { status: 0, text: e.message, ok: false };
  }
}

async function runTest() {
  console.log('--- [TEST] NUEVAS FUNCIONALIDADES ---');

  // 1. Login
  const loginRes = await req('POST', '/auth/login', { email: 'admin@bpm.com', password: 'password123' });
  if (!loginRes.ok || !loginRes.json?.token) {
      console.error('❌ Error de Autenticación:', loginRes.status, loginRes.text);
      return;
  }
  const token = loginRes.json.token;
  console.log('Autenticación: OK');

  // 2. Probar Priorización (REQ-06)
  console.log('Probando priorización de trámite...');
  const policiesRes = await req('GET', '/policies/catalog', null, token);
  if (!policiesRes.ok || policiesRes.json.length === 0) {
      console.log('❌ No hay políticas publicadas para probar la creación de trámites.');
  } else {
      const policyId = policiesRes.json[0].id;
      const startRes = await req('POST', '/tramites/iniciar', { 
          idPolitica: policyId,
          idUsuarioSolicitante: 'admin_id',
          prioridad: 5 // URGENTE
      }, token);

      if (startRes.ok && startRes.json.prioridad === 5) {
          console.log('✅ REQ-06 Priorización: EXITOSO (Prioridad 5 detectada)');
      } else {
          console.log('❌ REQ-06 Priorización: FALLIDO', startRes.status, startRes.json);
      }
  }

  // 3. Probar Asistente Virtual IA (REQ-13)
  console.log('Probando Asistente Virtual (IA Chat)...');
  const assistRes = await req('POST', '/optimization/asistente', { descripcion: '¿Cómo puedo crear una nueva política?' }, token);
  if (assistRes.ok && assistRes.json.respuesta) {
      console.log('✅ REQ-13 Asistente Virtual: EXITOSO');
      console.log('IA Respuesta:', assistRes.json.respuesta.substring(0, 50) + '...');
  } else {
      console.log('❌ REQ-13 Asistente Virtual: FALLIDO', assistRes.status, assistRes.text);
  }

  console.log('-----------------------------------------');
}

runTest();
