import assert from 'node:assert/strict'

// Run only against the isolated fixture on 4321, never the authenticated app.
for (const status of [null, '401', '503', null]) {
  const response = await fetch('http://127.0.0.1:4321/', {
    headers: status ? { 'x-fcm-fixture-status': status } : {},
    signal: AbortSignal.timeout(20000),
  })
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.ok(html.includes('QA aislado'))
  assert.ok(html.includes('Operación de costos'))
  assert.ok(!html.includes('frame.join'))
  assert.equal((html.match(/role="alert"/g) ?? []).length, 5)
  assert.ok(html.includes('No se pudo consultar la actividad reciente.'))
  assert.ok(!html.includes('Cotizar primera ruta'))
  assert.ok(!html.includes('Crear la primera'))
  if (status === '401') assert.ok(html.includes('La sesión expiró.'))
  else {
    assert.ok(html.includes('El servicio de datos no está disponible.'))
    assert.ok(!html.includes('La sesión expiró.'))
  }
  console.log(JSON.stringify({ scenario: status ?? 'native-fetch-refused', http: response.status, alerts: 5, frameJoin: false }))
}
