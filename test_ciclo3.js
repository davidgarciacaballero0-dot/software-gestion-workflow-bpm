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

async function testCiclo3() {
  console.log('--- [TEST] CICLO 3: OPERACIÓN Y TRÁMITES ---');
  
  // 1. Logs
  const adminRes = await req('POST', '/auth/login', { email: 'admin@bpm.com', password: 'password123' });
  const adminToken = adminRes.json.token;
  const adminUserId = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString()).userId;

  const clientRes = await req('POST', '/auth/login', { email: 'cliente1@bpm.com', password: 'password123' });
  const clientToken = clientRes.json.token;
  const clientUserId = JSON.parse(Buffer.from(clientToken.split('.')[1], 'base64').toString()).userId;

  // 2. Iniciar Trámite (CU-07)
  // Primero necesitamos una política publicada (la org es la de Admin, ya que el cliente es externo)
  const pols = await req('GET', '/policies/organization/' + adminRes.json.idOrganizacion, null, adminToken);
  const publishedPol = (pols.json && pols.json.length > 0) 
    ? (pols.json.find(p => p.status === 'PUBLISHED') || pols.json[0])
    : null;

  if (!publishedPol) {
    console.log('❌ 3.1 Error: No se encontraron políticas para iniciar trámites.');
    process.exit(1);
  }

  const iniciarRes = await req('POST', '/tramites/iniciar', {
    idPolitica: publishedPol.id,
    idUsuarioSolicitante: clientUserId,
    datosIniciales: { f_prioridad: 'ALTA', f_motivo: 'Test Master QA Ciclo 3' }
  }, clientToken);

  let tramiteId = null;
  if (iniciarRes.status === 201) {
    tramiteId = iniciarRes.json.id;
    console.log(`✅ 3.1 Inicio de Trámite: EXITOSO (ID: ${tramiteId}, Código: ${iniciarRes.json.codigoTramite})`);
  } else {
    console.log('❌ 3.1 Inicio de Trámite: FALLIDO', iniciarRes.status, iniciarRes.text);
    process.exit(1);
  }

  // 3. Avanzar Trámite (CU-09)
  const avanzarRes = await req('POST', '/tramites/avanzar', {
    idTramite: tramiteId,
    idUsuarioAccion: adminUserId,
    datosFormulario: { f_aprobado: true, f_comentario: 'Aviso por QA automático' }
  }, adminToken);

  if (avanzarRes.ok) {
    console.log(`✅ 3.2 Avance de Trámite: EXITOSO (Nuevo Nodo: ${avanzarRes.json.nodoActualId})`);
  } else {
    console.log('❌ 3.2 Avance de Trámite: FALLIDO', avanzarRes.status, avanzarRes.text);
  }

  // 4. Intervención Administrativa (CU-21)
  const interRes = await req('POST', '/tramites/intervencion', {
    idTramite: tramiteId,
    nuevoNodoId: publishedPol.nodes[0].id, // Forzar retorno al inicio
    nuevoDepartamentoId: publishedPol.nodes[0].departmentId,
    motivo: 'Reinicio forzado por prueba de auditoría',
    usuarioInterventorId: adminUserId
  }, adminToken);

  if (interRes.ok) {
    console.log('✅ 3.3 Intervención Administrativa: EXITOSO');
  } else {
    console.log('❌ 3.3 Intervención: FALLIDO', interRes.status);
  }

  // 5. Validar Historial/Trazabilidad (CU-10)
  const histRes = await req('GET', `/tramites/${tramiteId}/historial`, null, adminToken);
  if (histRes.ok && histRes.json.some(e => e.tipoEvento === 'INTERVENCION')) {
    console.log(`✅ 3.4 Historial de Auditoría: EXITOSO (${histRes.json.length} eventos registrados)`);
  } else {
    console.log('❌ 3.4 Historial de Auditoría: FALLIDO');
  }

  console.log('-------------------------------------------');
  console.log('RESULTADO FINAL CICLO 3: COMPLETADO');
}

testCiclo3();
