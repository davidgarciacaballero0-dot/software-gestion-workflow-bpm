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
    try { json = JSON.parse(text); } catch (e) {}
    return { status: res.status, json, text, ok: res.ok };
  } catch (e) {
    return { status: 0, text: e.message, ok: false };
  }
}

async function testCiclo2() {
  console.log('--- [TEST] CICLO 2: MOTOR CORE Y DISEÑO DE PROCESOS ---');
  
  // 1. Obtener Token de Admin
  const loginRes = await req('POST', '/auth/login', { email: 'admin@bpm.com', password: 'password123' });
  const token = loginRes.json.token;
  const orgId = loginRes.json.idOrganizacion;

  // 2. Crear una Política con Diseño de Flujo (CU-04, CU-05, CU-06)
  const policyData = {
    idOrganizacion: orgId,
    nombre: 'Flujo de Vacaciones v1',
    description: 'Proceso de aprobación de vacaciones con SLA',
    version: '1.0',
    status: 'DRAFT',
    nodes: [
      { id: 'start', type: 'START', name: 'Inicio', uiPosition: { x: 0, y: 0 } },
      { id: 'task1', type: 'USER_TASK', name: 'Aprobación Jefe', slaHours: 24, departmentId: '69e3ae7d116741365db8477d', // Asumiendo un ID de depto IT/RRHH
        formDefinition: [{ fieldId: 'f_dias', label: 'Días', type: 'NUMBER', required: true }],
        uiPosition: { x: 200, y: 0 } },
      { id: 'end', type: 'END', name: 'Fin', uiPosition: { x: 400, y: 0 } }
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'start', targetNodeId: 'task1' },
      { id: 'e2', sourceNodeId: 'task1', targetNodeId: 'end' }
    ]
  };

  const createRes = await req('POST', '/policies', policyData, token);
  let policyId = null;
  if (createRes.status === 201) {
    policyId = createRes.json.id;
    console.log('✅ 2.1 Creación de Política (JSON): EXITOSO');
  } else {
    console.log('❌ 2.1 Creación de Política: FALLIDO', createRes.status, createRes.text);
    process.exit(1);
  }

  // 3. Validar Versionamiento (CU-18)
  const versionRes = await req('POST', `/policies/${policyId}/new-version`, null, token);
  if (versionRes.status === 201 && versionRes.json.version === '1.1') {
    console.log('✅ 2.2 Versionado Automático (1.0 -> 1.1): EXITOSO');
  } else {
    console.log('❌ 2.2 Versionado: FALLIDO', versionRes.status);
  }

  // 4. Validar SLAs (CU-19) - Intentar crear una sin SLA
  const invalidSlaData = { ...policyData, nombre: 'Flujo Inválido', nodes: [{ id: 's', type: 'USER_TASK', slaHours: -1 }] };
  const invalidRes = await req('POST', '/policies', invalidSlaData, token);
  if (invalidRes.status >= 400) {
    console.log('✅ 2.3 Validación de SLAs (Rechazo Negativo): EXITOSO');
  } else {
    console.log('❌ 2.3 Validación de SLAs: FALLIDO (Aceptó valor inválido)');
  }

  console.log('-------------------------------------------');
  console.log('RESULTADO FINAL CICLO 2: COMPLETADO');
}

testCiclo2();
