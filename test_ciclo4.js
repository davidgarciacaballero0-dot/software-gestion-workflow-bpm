const BASE = 'http://localhost:8080/api/v1';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    if (!res.ok && res.status !== 503) { // 503 is allowed because it might be IA being slow
       const text = await res.text();
       return { status: res.status, text, ok: false };
    }
    if (res.headers.get('content-type')?.includes('application/octet-stream') || 
        res.headers.get('content-type')?.includes('application/pdf')) {
        return { status: res.status, ok: true, isFile: true };
    }
    const json = await res.json().catch(() => null);
    return { status: res.status, json, ok: res.ok };
  } catch (e) {
    return { status: 0, text: e.message, ok: false };
  }
}

async function testCiclo4() {
  console.log('--- [TEST] CICLO 4: IA Y REPORTES ---');
  
  // 1. Logs
  const adminRes = await req('POST', '/auth/login', { email: 'admin@bpm.com', password: 'password123' });
  const token = adminRes.json.token;

  // 2. Probar Analítica de IA (CU-15)
  console.log('Probando análisis de cuellos de botella...');
  const analyzeRes = await req('POST', '/optimization/analyze', {}, token);
  if (analyzeRes.ok && (analyzeRes.json?.recomendaciones || analyzeRes.status === 200)) {
    console.log('✅ 4.1 Análisis de IA (Bottlenecks): EXITOSO');
  } else {
    console.log('❌ 4.1 Análisis de IA: FALLIDO o IA Lenta/Offline', analyzeRes.status);
  }

  // 3. Probar Generación de Flujo NLP (CU-14)
  console.log('Probando generación de flujo NLP...');
  const flowRes = await req('POST', '/optimization/analyze-flow', { descripcion: 'Proceso de compras corporativas' }, token);
  if (flowRes.ok && flowRes.json?.nodos) {
    console.log('✅ 4.2 Generación de Flujo IA: EXITOSO');
  } else {
    console.log('❌ 4.2 Generación de Flujo IA: FALLIDO', flowRes.status);
  }

  // 4. Probar Exportación Excel (CU-22)
  const excelRes = await req('GET', '/optimization/report/excel', null, token);
  if (excelRes.ok && excelRes.isFile) {
    console.log('✅ 4.3 Exportación Excel: EXITOSO');
  } else {
    console.log('❌ 4.3 Exportación Excel: FALLIDO', excelRes.status);
  }

  // 5. Probar Exportación PDF (CU-22)
  const pdfRes = await req('POST', '/optimization/report/pdf', { text: 'Analisis de prueba QA' }, token);
  if (pdfRes.ok && pdfRes.isFile) {
    console.log('✅ 4.4 Exportación PDF: EXITOSO');
  } else {
    console.log('❌ 4.4 Exportación PDF: FALLIDO', pdfRes.status);
  }

  console.log('-------------------------------------------');
  console.log('RESULTADO FINAL CICLO 4: COMPLETADO');
}

testCiclo4();
