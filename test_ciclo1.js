const BASE = 'http://localhost:8080/api/v1';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { }
    return { status: res.status, json, text, ok: res.ok };
  } catch (e) {
    return { status: 0, text: e.message, ok: false };
  }
}

async function testCiclo1() {
  console.log('--- [TEST] CICLO 1: IDENTIDAD Y SEGURIDAD ---');
  let token = null;

  // 1. Validar AUTH (CU-03)
  const loginRes = await req('POST', '/auth/login', { email: 'admin@bpm.com', password: 'password123' });
  if (loginRes.status === 200 && loginRes.json.token) {
    token = loginRes.json.token;
    console.log('✅ 1.1 Login Admin: EXITOSO');
  } else {
    console.log('❌ 1.1 Login Admin: FALLIDO', loginRes.status, loginRes.text);
    process.exit(1);
  }

  // 2. Validar Protección de Endpoints
  const protectedRes = await req('GET', '/organizaciones');
  if (protectedRes.status === 403 || protectedRes.status === 401) {
    console.log('✅ 1.2 Protección de Endpoints: EXITOSO (403 Prohibido sin Token)');
  } else {
    console.log('❌ 1.2 Protección de Endpoints: FALLIDO', protectedRes.status);
  }

  // 3. Validar Listado de Organizaciones (CU-01) con Token
  const orgsRes = await req('GET', '/organizaciones', null, token);
  if (orgsRes.ok && Array.isArray(orgsRes.json)) {
    console.log(`✅ 1.3 Listado de Organizaciones: EXITOSO (${orgsRes.json.length} encontradas)`);
  } else {
    console.log('❌ 1.3 Listado de Organizaciones: FALLIDO', orgsRes.status);
  }

  // 4. Validar Creación de Departamento (CU-01)
  const orgId = loginRes.json.idOrganizacion;
  const deptRes = await req('POST', '/departamentos', {
    nombre: 'Departamento QA Master',
    codigoArea: 'QA-M1',
    idOrganizacion: orgId
  }, token);

  if (deptRes.status === 201) {
    console.log('✅ 1.4 Creación de Departamento: EXITOSO');
  } else {
    console.log('❌ 1.4 Creación de Departamento: FALLIDO', deptRes.status, deptRes.text);
  }

  console.log('-------------------------------------------');
  console.log('RESULTADO FINAL CICLO 1: COMPLETADO');
}

testCiclo1();
