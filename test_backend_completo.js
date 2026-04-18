/**
 * ================================================================
 * PRUEBAS E2E EXHAUSTIVAS - BACKEND BPM - CICLOS 1, 2 Y 3
 * ================================================================
 * Script Node.js que prueba cada endpoint y caso de uso documentado
 * en el PLAN_OPERATIVO_DE_DESARROLLO.md
 * ================================================================
 */

const BASE = 'http://localhost:8080/api/v1';
let PASS = 0, FAIL = 0;
const results = [];

function log(icon, msg) { console.log(`${icon} ${msg}`); }
function ok(test, detail = '') { PASS++; results.push({ s: 'PASS', test }); log('✅', `[PASS] ${test} ${detail}`); }
function fail(test, err) { FAIL++; results.push({ s: 'FAIL', test, err }); log('❌', `[FAIL] ${test}: ${err}`); }

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, json, text, ok: res.ok };
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('  PRUEBAS E2E EXHAUSTIVAS - BACKEND BPM');
  console.log('  Ciclos 1, 2 y 3 según PLAN_OPERATIVO_DE_DESARROLLO.md');
  console.log('='.repeat(70) + '\n');

  // State variables
  let adminToken, clienteToken, jefeToken;
  let orgId, adminUserId, clienteUserId, jefeUserId;
  let depRRHHId, depITId;
  let policyId, publishedPolicyId;
  let tramiteId, tramiteCodigo;
  let nuevoOrgId, nuevoDeptId, nuevoUserId, nuevoRolId;

  // ============================================================
  // FASE 1: AUTENTICACIÓN Y SEGURIDAD (CU-03)
  // ============================================================
  console.log('\n--- FASE 1: AUTENTICACIÓN Y SEGURIDAD (CU-03) ---\n');

  // 1.1 Login Admin
  try {
    const r = await req('POST', '/auth/login', { email: 'admin@bpm.com', password: 'password123' });
    if (r.status === 200 && r.json?.token) {
      adminToken = r.json.token;
      orgId = r.json.idOrganizacion;
      // Decode JWT to get userId
      const payload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString());
      adminUserId = payload.userId;
      ok('1.1 Login Admin', `Token: ${adminToken.substring(0, 30)}... OrgId: ${orgId}`);
    } else { fail('1.1 Login Admin', `Status: ${r.status} Body: ${r.text}`); }
  } catch (e) { fail('1.1 Login Admin', e.message); }

  // 1.2 Login Cliente
  try {
    const r = await req('POST', '/auth/login', { email: 'cliente1@bpm.com', password: 'password123' });
    if (r.status === 200 && r.json?.token) {
      clienteToken = r.json.token;
      const payload = JSON.parse(Buffer.from(clienteToken.split('.')[1], 'base64').toString());
      clienteUserId = payload.userId;
      ok('1.2 Login Cliente', `UserId: ${clienteUserId}`);
    } else { fail('1.2 Login Cliente', `Status: ${r.status}`); }
  } catch (e) { fail('1.2 Login Cliente', e.message); }

  // 1.3 Login Jefe
  try {
    const r = await req('POST', '/auth/login', { email: 'jefe.rrhh@bpm.com', password: 'password123' });
    if (r.status === 200 && r.json?.token) {
      jefeToken = r.json.token;
      const payload = JSON.parse(Buffer.from(jefeToken.split('.')[1], 'base64').toString());
      jefeUserId = payload.userId;
      ok('1.3 Login Jefe RRHH', `esJefe: ${r.json.esJefe}, UserId: ${jefeUserId}`);
      if (!r.json.esJefe) fail('1.3b Jefe flag', 'esJefe debería ser true');
    } else { fail('1.3 Login Jefe RRHH', `Status: ${r.status}`); }
  } catch (e) { fail('1.3 Login Jefe RRHH', e.message); }

  // 1.4 Login con credenciales inválidas
  try {
    const r = await req('POST', '/auth/login', { email: 'fake@test.com', password: 'wrong' });
    if (r.status === 401) { ok('1.4 Login Inválido → 401'); }
    else { fail('1.4 Login Inválido', `Esperaba 401, recibió ${r.status}`); }
  } catch (e) { fail('1.4 Login Inválido', e.message); }

  // 1.5 Endpoint protegido sin token
  try {
    const r = await req('GET', '/organizaciones');
    if (r.status === 403 || r.status === 401) { ok('1.5 Sin token → 403/401'); }
    else { fail('1.5 Sin token', `Esperaba 403, recibió ${r.status}`); }
  } catch (e) { fail('1.5 Sin token', e.message); }

  // ============================================================
  // FASE 2: GESTIÓN DE IDENTIDAD (CICLO 1)
  // ============================================================
  console.log('\n--- FASE 2: GESTIÓN DE IDENTIDAD (CU-01, CU-02, CU-17) ---\n');

  // 2.1 Listar Organizaciones (CU-01)
  try {
    const r = await req('GET', '/organizaciones', null, adminToken);
    if (r.ok && Array.isArray(r.json) && r.json.length >= 1) {
      ok('2.1 Listar Organizaciones', `${r.json.length} encontradas`);
    } else { fail('2.1 Listar Organizaciones', `Status: ${r.status}, Count: ${r.json?.length}`); }
  } catch (e) { fail('2.1 Listar Organizaciones', e.message); }

  // 2.2 Crear Nueva Organización
  try {
    const r = await req('POST', '/organizaciones', { nombre: 'Empresa Prueba QA E2E', esquemaColores: {} }, adminToken);
    if (r.status === 201 && r.json?.id) {
      nuevoOrgId = r.json.id;
      ok('2.2 Crear Organización', `ID: ${nuevoOrgId}`);
    } else { fail('2.2 Crear Organización', `Status: ${r.status} Body: ${r.text}`); }
  } catch (e) { fail('2.2 Crear Organización', e.message); }

  // 2.3 Obtener Organización por ID
  try {
    const r = await req('GET', `/organizaciones/${orgId}`, null, adminToken);
    if (r.ok && r.json?.nombre) {
      ok('2.3 Obtener Org por ID', `Nombre: ${r.json.nombre}`);
    } else { fail('2.3 Obtener Org por ID', `Status: ${r.status}`); }
  } catch (e) { fail('2.3 Obtener Org por ID', e.message); }

  // 2.4 Listar Departamentos (CU-01)
  try {
    const r = await req('GET', `/departamentos/organizacion/${orgId}`, null, adminToken);
    if (r.ok && Array.isArray(r.json) && r.json.length >= 3) {
      depRRHHId = r.json.find(d => d.nombre?.includes('Recursos'))?.id || r.json[0].id;
      depITId = r.json.find(d => d.nombre?.includes('Sistemas') || d.nombre?.includes('IT'))?.id || r.json[1].id;
      ok('2.4 Listar Departamentos', `${r.json.length} depts. RRHH: ${depRRHHId}, IT: ${depITId}`);
    } else { fail('2.4 Listar Departamentos', `Status: ${r.status}, Count: ${r.json?.length}`); }
  } catch (e) { fail('2.4 Listar Departamentos', e.message); }

  // 2.5 Crear Departamento (CU-17)
  try {
    const r = await req('POST', '/departamentos', { nombre: 'QA Testing Dept', codigoArea: 'QA-01', idOrganizacion: orgId }, adminToken);
    if (r.status === 201 && r.json?.id) {
      nuevoDeptId = r.json.id;
      ok('2.5 Crear Departamento', `ID: ${nuevoDeptId}`);
    } else { fail('2.5 Crear Departamento', `Status: ${r.status} Body: ${r.text}`); }
  } catch (e) { fail('2.5 Crear Departamento', e.message); }

  // 2.6 Listar Roles (CU-02)
  try {
    const r = await req('GET', '/roles', null, adminToken);
    if (r.ok && Array.isArray(r.json) && r.json.length >= 3) {
      ok('2.6 Listar Roles', `${r.json.length} roles: ${r.json.map(x=>x.nombre).join(', ')}`);
    } else { fail('2.6 Listar Roles', `Status: ${r.status}, Count: ${r.json?.length}`); }
  } catch (e) { fail('2.6 Listar Roles', e.message); }

  // 2.7 Crear Rol
  try {
    const r = await req('POST', '/roles', { nombre: 'AUDITOR_QA', permisos: ['VIEW_ALL', 'AUDIT'] }, adminToken);
    if (r.status === 201 && r.json?.id) {
      nuevoRolId = r.json.id;
      ok('2.7 Crear Rol', `ID: ${nuevoRolId}, Nombre: ${r.json.nombre}`);
    } else { fail('2.7 Crear Rol', `Status: ${r.status} Body: ${r.text}`); }
  } catch (e) { fail('2.7 Crear Rol', e.message); }

  // 2.8 Registrar Usuario (CU-02)
  try {
    const rolRes = await req('GET', '/roles', null, adminToken);
    const clienteRolId = rolRes.json?.find(r => r.nombre === 'CLIENTE')?.id;
    const r = await req('POST', '/usuarios', {
      nombre: 'Usuario QA Test E2E', email: 'qa.e2e.test@bpm.com',
      password: 'test123', idRol: clienteRolId || nuevoRolId,
      idOrganizacion: orgId, idDepartamento: nuevoDeptId
    }, adminToken);
    if (r.status === 201 && r.json?.id) {
      nuevoUserId = r.json.id;
      ok('2.8 Registrar Usuario', `ID: ${nuevoUserId}`);
    } else { fail('2.8 Registrar Usuario', `Status: ${r.status} Body: ${r.text}`); }
  } catch (e) { fail('2.8 Registrar Usuario', e.message); }

  // 2.9 Listar Usuarios por Departamento
  try {
    const r = await req('GET', `/usuarios/departamento/${depRRHHId}`, null, adminToken);
    if (r.ok && Array.isArray(r.json)) {
      ok('2.9 Listar Usuarios por Dept', `${r.json.length} usuarios en RRHH`);
    } else { fail('2.9 Listar Usuarios por Dept', `Status: ${r.status}`); }
  } catch (e) { fail('2.9 Listar Usuarios por Dept', e.message); }

  // ============================================================
  // FASE 3: MOTOR DE POLÍTICAS BPM (CICLO 2)
  // ============================================================
  console.log('\n--- FASE 3: MOTOR BPM - POLÍTICAS (CU-04, CU-05, CU-06, CU-18, CU-19) ---\n');

  // 3.1 Listar Políticas por Organización (CU-04)
  try {
    const r = await req('GET', `/policies/organization/${orgId}`, null, adminToken);
    if (r.ok && Array.isArray(r.json)) {
      const published = r.json.find(p => p.status === 'PUBLISHED');
      if (published) publishedPolicyId = published.id;
      ok('3.1 Listar Políticas', `${r.json.length} políticas. Published: ${publishedPolicyId ? 'SÍ' : 'NO'}`);
    } else { fail('3.1 Listar Políticas', `Status: ${r.status}`); }
  } catch (e) { fail('3.1 Listar Políticas', e.message); }

  // 3.2 Crear Nueva Política (CU-05 + CU-06 + CU-19)
  try {
    const r = await req('POST', '/policies', {
      idOrganizacion: orgId,
      nombre: 'Flujo QA E2E Prueba',
      description: 'Política creada automáticamente para pruebas E2E',
      version: '1.0',
      status: 'DRAFT',
      nodes: [
        { id: 'start_qa', type: 'START', name: 'Inicio QA', uiPosition: { x: 100, y: 200 } },
        { id: 'task_revision', type: 'USER_TASK', name: 'Revisión RRHH', departmentId: depRRHHId, slaHours: 24,
          formDefinition: [
            { fieldId: 'f_motivo', label: 'Motivo de la solicitud', type: 'TEXT', required: true },
            { fieldId: 'f_prioridad', label: 'Nivel de Prioridad', type: 'DROPDOWN', required: true, options: ['ALTA', 'MEDIA', 'BAJA'] }
          ],
          uiPosition: { x: 350, y: 200 }
        },
        { id: 'task_aprobacion', type: 'USER_TASK', name: 'Aprobación Final', departmentId: depITId, slaHours: 48,
          formDefinition: [
            { fieldId: 'f_comentario', label: 'Comentario de Aprobación', type: 'TEXT', required: false }
          ],
          uiPosition: { x: 600, y: 200 }
        },
        { id: 'end_qa', type: 'END', name: 'Fin QA', uiPosition: { x: 850, y: 200 } }
      ],
      edges: [
        { id: 'e_qa1', sourceNodeId: 'start_qa', targetNodeId: 'task_revision' },
        { id: 'e_qa2', sourceNodeId: 'task_revision', targetNodeId: 'task_aprobacion' },
        { id: 'e_qa3', sourceNodeId: 'task_aprobacion', targetNodeId: 'end_qa' }
      ]
    }, adminToken);
    if (r.status === 201 && r.json?.id) {
      policyId = r.json.id;
      ok('3.2 Crear Política (DRAFT)', `ID: ${policyId}, Version: ${r.json.version}, Status: ${r.json.status}`);
    } else { fail('3.2 Crear Política', `Status: ${r.status} Body: ${r.text}`); }
  } catch (e) { fail('3.2 Crear Política', e.message); }

  // 3.3 Obtener Política por ID (CU-04)
  if (policyId) {
    try {
      const r = await req('GET', `/policies/${policyId}`, null, adminToken);
      if (r.ok && r.json?.nodes?.length === 4 && r.json?.edges?.length === 3) {
        ok('3.3 Obtener Política por ID', `Nodos: ${r.json.nodes.length}, Aristas: ${r.json.edges.length}`);
      } else { fail('3.3 Obtener Política', `Nodos: ${r.json?.nodes?.length}, Aristas: ${r.json?.edges?.length}`); }
    } catch (e) { fail('3.3 Obtener Política', e.message); }
  }

  // 3.4 Publicar Política (CU-18)
  if (policyId) {
    try {
      const r = await req('PATCH', `/policies/${policyId}/publish`, null, adminToken);
      if (r.ok && r.json?.status === 'PUBLISHED') {
        publishedPolicyId = policyId;
        ok('3.4 Publicar Política', `Status: ${r.json.status}`);
      } else { fail('3.4 Publicar Política', `Status: ${r.status} Body: ${r.text}`); }
    } catch (e) { fail('3.4 Publicar Política', e.message); }
  }

  // 3.5 Crear Nueva Versión (CU-18)
  if (policyId) {
    try {
      const r = await req('POST', `/policies/${policyId}/new-version`, null, adminToken);
      if (r.status === 201 && r.json?.version && r.json?.status === 'DRAFT') {
        ok('3.5 Nueva Versión', `Version: ${r.json.version}, Status: ${r.json.status}`);
      } else { fail('3.5 Nueva Versión', `Status: ${r.status} Body: ${r.text}`); }
    } catch (e) { fail('3.5 Nueva Versión', e.message); }
  }

  // 3.6 Validar SLA requerido (CU-19) - Política sin SLA debe fallar
  try {
    const r = await req('POST', '/policies', {
      idOrganizacion: orgId, nombre: 'Flujo Sin SLA', description: 'Test',
      version: '1.0', status: 'DRAFT',
      nodes: [
        { id: 's', type: 'START', name: 'I', uiPosition: { x: 0, y: 0 } },
        { id: 't', type: 'USER_TASK', name: 'Task sin SLA', departmentId: depRRHHId, slaHours: 0, uiPosition: { x: 100, y: 0 } },
        { id: 'e', type: 'END', name: 'F', uiPosition: { x: 200, y: 0 } }
      ],
      edges: [{ id: 'e1', sourceNodeId: 's', targetNodeId: 't' }, { id: 'e2', sourceNodeId: 't', targetNodeId: 'e' }]
    }, adminToken);
    if (r.status >= 400) { ok('3.6 Validación SLA (slaHours=0 rechazado)'); }
    else { fail('3.6 Validación SLA', 'Debería rechazar SLA=0'); }
  } catch (e) { fail('3.6 Validación SLA', e.message); }

  // ============================================================
  // FASE 4: EJECUCIÓN DE TRÁMITES (CICLO 3)
  // ============================================================
  console.log('\n--- FASE 4: EJECUCIÓN DE TRÁMITES (CU-07, CU-08, CU-09, CU-10) ---\n');

  // 4.1 Iniciar Trámite (CU-07)
  if (publishedPolicyId && clienteUserId) {
    try {
      const r = await req('POST', '/tramites/iniciar', {
        idPolitica: publishedPolicyId,
        idUsuarioSolicitante: clienteUserId,
        datosIniciales: { f_motivo: 'Prueba E2E automatizada', f_prioridad: 'ALTA' }
      }, clienteToken);
      if (r.status === 201 && r.json?.id) {
        tramiteId = r.json.id;
        tramiteCodigo = r.json.codigoTramite;
        ok('4.1 Iniciar Trámite (CU-07)', `ID: ${tramiteId}, Código: ${tramiteCodigo}, Estado: ${r.json.estadoActual}, Nodo: ${r.json.nodoActualId}`);
      } else { fail('4.1 Iniciar Trámite', `Status: ${r.status} Body: ${r.text}`); }
    } catch (e) { fail('4.1 Iniciar Trámite', e.message); }
  }

  // 4.2 Bandeja Personal del Solicitante (CU-08)
  if (clienteUserId) {
    try {
      const r = await req('GET', `/tramites/solicitante/${clienteUserId}`, null, clienteToken);
      if (r.ok && Array.isArray(r.json) && r.json.length >= 1) {
        ok('4.2 Bandeja Personal (CU-08)', `${r.json.length} trámites del solicitante`);
      } else { fail('4.2 Bandeja Personal', `Status: ${r.status}, Count: ${r.json?.length}`); }
    } catch (e) { fail('4.2 Bandeja Personal', e.message); }
  }

  // 4.3 Bandeja Departamental (CU-08)
  if (depRRHHId) {
    try {
      const r = await req('GET', `/tramites/departamento/${depRRHHId}`, null, jefeToken);
      if (r.ok && Array.isArray(r.json)) {
        ok('4.3 Bandeja Departamental (CU-08)', `${r.json.length} trámites en RRHH`);
      } else { fail('4.3 Bandeja Departamental', `Status: ${r.status}`); }
    } catch (e) { fail('4.3 Bandeja Departamental', e.message); }
  }

  // 4.4 Ver Detalle del Trámite
  if (tramiteId) {
    try {
      const r = await req('GET', `/tramites/${tramiteId}`, null, adminToken);
      if (r.ok && r.json?.codigoTramite === tramiteCodigo) {
        ok('4.4 Detalle Trámite', `Código: ${r.json.codigoTramite}, DatosAcumulados: ${JSON.stringify(r.json.datosAcumuladosFormulario).substring(0,60)}`);
      } else { fail('4.4 Detalle Trámite', `Status: ${r.status}`); }
    } catch (e) { fail('4.4 Detalle Trámite', e.message); }
  }

  // 4.5 Avanzar Trámite – Paso 1 (CU-09)
  if (tramiteId && jefeUserId) {
    try {
      const r = await req('POST', '/tramites/avanzar', {
        idTramite: tramiteId,
        idUsuarioAccion: jefeUserId,
        datosFormulario: { f_motivo: 'Aprobado por RRHH - prueba E2E', f_prioridad: 'ALTA' }
      }, jefeToken);
      if (r.ok && r.json?.nodoActualId) {
        ok('4.5 Avanzar Trámite Paso 1 (CU-09)', `Nuevo nodo: ${r.json.nodoActualId}, Estado: ${r.json.estadoActual}`);
      } else { fail('4.5 Avanzar Paso 1', `Status: ${r.status} Body: ${r.text}`); }
    } catch (e) { fail('4.5 Avanzar Paso 1', e.message); }
  }

  // 4.6 Avanzar Trámite – Paso 2 → Finalización (CU-09)
  if (tramiteId && adminUserId) {
    try {
      const r = await req('POST', '/tramites/avanzar', {
        idTramite: tramiteId,
        idUsuarioAccion: adminUserId,
        datosFormulario: { f_comentario: 'Aprobación final por IT - E2E' }
      }, adminToken);
      if (r.ok && r.json?.estadoActual === 'FINALIZADO') {
        ok('4.6 Avanzar → FINALIZADO', `Estado: ${r.json.estadoActual}, Nodo: ${r.json.nodoActualId}`);
      } else { fail('4.6 Avanzar → FINALIZADO', `Estado: ${r.json?.estadoActual}, Status: ${r.status}`); }
    } catch (e) { fail('4.6 Avanzar → FINALIZADO', e.message); }
  }

  // 4.7 Rechazar avanzar trámite finalizado
  if (tramiteId) {
    try {
      const r = await req('POST', '/tramites/avanzar', {
        idTramite: tramiteId, idUsuarioAccion: adminUserId, datosFormulario: {}
      }, adminToken);
      if (r.status >= 400) { ok('4.7 Avanzar trámite finalizado → Error'); }
      else { fail('4.7 Avanzar finalizado', 'Debería dar error'); }
    } catch (e) { fail('4.7 Avanzar finalizado', e.message); }
  }

  // 4.8 Historial y Trazabilidad (CU-10)
  if (tramiteId) {
    try {
      const r = await req('GET', `/tramites/${tramiteId}/historial`, null, adminToken);
      if (r.ok && Array.isArray(r.json) && r.json.length >= 2) {
        const tipos = r.json.map(e => e.tipoEvento);
        ok('4.8 Historial Trazabilidad (CU-10)', `${r.json.length} eventos: ${tipos.join(' → ')}`);
      } else { fail('4.8 Historial', `Count: ${r.json?.length}`); }
    } catch (e) { fail('4.8 Historial', e.message); }
  }

  // ============================================================
  // FASE 5: SUPERVISIÓN E INTERVENCIÓN (CU-20, CU-21)
  // ============================================================
  console.log('\n--- FASE 5: SUPERVISIÓN E INTERVENCIÓN (CU-20, CU-21) ---\n');

  // 5.1 Supervisión Jefatura (CU-20)
  if (depRRHHId) {
    try {
      const r = await req('GET', `/tramites/supervision/${depRRHHId}`, null, jefeToken);
      if (r.ok && Array.isArray(r.json)) {
        ok('5.1 Supervisión Jefatura (CU-20)', `${r.json.length} trámites supervisados`);
      } else { fail('5.1 Supervisión', `Status: ${r.status}`); }
    } catch (e) { fail('5.1 Supervisión', e.message); }
  }

  // 5.2 Intervención: crear otro trámite para intervenir
  let tramiteParaIntervenir;
  if (publishedPolicyId && clienteUserId) {
    try {
      const r = await req('POST', '/tramites/iniciar', {
        idPolitica: publishedPolicyId,
        idUsuarioSolicitante: clienteUserId,
        datosIniciales: { f_motivo: 'Trámite para intervención QA' }
      }, clienteToken);
      if (r.status === 201) {
        tramiteParaIntervenir = r.json.id;
        ok('5.2 Crear trámite para Intervención', `ID: ${tramiteParaIntervenir}`);
      } else { fail('5.2 Crear trámite para intervención', `Status: ${r.status}`); }
    } catch (e) { fail('5.2 Crear trámite para intervención', e.message); }
  }

  // 5.3 Intervención Administrativa (CU-21)
  if (tramiteParaIntervenir && depITId && adminUserId) {
    try {
      const r = await req('POST', '/tramites/intervencion', {
        idTramite: tramiteParaIntervenir,
        nuevoNodoId: 'task_aprobacion',
        nuevoDepartamentoId: depITId,
        motivo: 'Reasignado por error de departamento - QA E2E Test',
        usuarioInterventorId: adminUserId
      }, adminToken);
      if (r.ok && r.json?.departamentoActualId) {
        ok('5.3 Intervención Administrativa (CU-21)', `Nuevo Dept: ${r.json.departamentoActualId}, Nodo: ${r.json.nodoActualId}`);
      } else { fail('5.3 Intervención', `Status: ${r.status} Body: ${r.text}`); }
    } catch (e) { fail('5.3 Intervención', e.message); }
  }

  // 5.4 Verificar historial de intervención
  if (tramiteParaIntervenir) {
    try {
      const r = await req('GET', `/tramites/${tramiteParaIntervenir}/historial`, null, adminToken);
      if (r.ok && r.json?.some(e => e.tipoEvento === 'INTERVENCION')) {
        ok('5.4 Historial de Intervención', `Evento INTERVENCION registrado`);
      } else { fail('5.4 Historial Intervención', `No se encontró evento INTERVENCION. Eventos: ${r.json?.map(e=>e.tipoEvento)}`); }
    } catch (e) { fail('5.4 Historial Intervención', e.message); }
  }

  // ============================================================
  // FASE 6: AUDITORÍA (CU-13)
  // ============================================================
  console.log('\n--- FASE 6: AUDITORÍA (CU-13) ---\n');

  try {
    const r = await req('GET', '/auditoria', null, adminToken);
    if (r.ok && Array.isArray(r.json)) {
      ok('6.1 Listar Auditoría', `${r.json.length} registros de auditoría`);
    } else { fail('6.1 Auditoria', `Status: ${r.status}`); }
  } catch (e) { fail('6.1 Auditoria', e.message); }

  // ============================================================
  // RESUMEN FINAL
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log(`  RESUMEN FINAL DE PRUEBAS`);
  console.log('='.repeat(70));
  console.log(`  ✅ PASARON: ${PASS}`);
  console.log(`  ❌ FALLARON: ${FAIL}`);
  console.log(`  📊 TOTAL:   ${PASS + FAIL}`);
  console.log(`  📈 TASA:    ${((PASS / (PASS + FAIL)) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  if (FAIL > 0) {
    console.log('\n  TESTS FALLIDOS:');
    results.filter(r => r.s === 'FAIL').forEach(r => console.log(`    ❌ ${r.test}: ${r.err}`));
  }

  console.log('\n  DATOS GUARDADOS EN MONGODB:');
  console.log(`    - Organización creada: ${nuevoOrgId || 'N/A'}`);
  console.log(`    - Departamento creado: ${nuevoDeptId || 'N/A'}`);
  console.log(`    - Rol creado: ${nuevoRolId || 'N/A'}`);
  console.log(`    - Usuario creado: ${nuevoUserId || 'N/A'}`);
  console.log(`    - Política creada: ${policyId || 'N/A'}`);
  console.log(`    - Trámite completo (FINALIZADO): ${tramiteId || 'N/A'}`);
  console.log(`    - Trámite intervenido: ${tramiteParaIntervenir || 'N/A'}`);
  console.log('='.repeat(70) + '\n');

  process.exit(FAIL > 0 ? 1 : 0);
}

runAllTests().catch(e => { console.error('Error fatal:', e); process.exit(1); });
