import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { benchmarkForm } from '../../../apps/api/src/modules/engine/benchmark-form.js'
import { calculateOwnedD2DScenarios } from '../../../apps/api/src/modules/engine/benchmark-owned-d2d.js'
import { ownedD2DFixture } from '../../../apps/api/tests/fixtures/benchmark-owned-d2d.js'
import { PARAMETER_DEFINITIONS } from '../../../apps/api/src/data/parameter-catalog.js'
import { createBenchmarkDossier, openBenchmarkDossier } from '../../../apps/web/lib/benchmark-dossier.js'

// Repository-local browser verification. Synthetic inputs and mocked transport/
// identity, REAL calculator on Node; never accesses live Auth, DB or external APIs.
const require = createRequire('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')
const { chromium } = require('playwright')
const root = resolve(import.meta.dirname, '../../..')
const out = resolve(root, 'tmp/b2-continuity')
await mkdir(out, { recursive: true })
const schema = benchmarkForm(), input = ownedD2DFixture()
const retreadKey = PARAMETER_DEFINITIONS.find(p => p.section === 'COST_TIRES' && p.field === 'Qty Recapeadas')!.key
for (const leg of [input.route.mx, input.route.us]) {
  const row = leg.parameters.parameters.find(p => p.key === retreadKey)!
  row.value = 0; row.derivation = 'QA ficticia sin recapeadas: no benchmark ni adopción'
}
const expected = calculateOwnedD2DScenarios(input)
assert.equal(expected.status, 'SCENARIO_ONLY')
const seed = await createBenchmarkDossier(input, schema)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
const errors: string[] = [], checks: string[] = []
let postCount = 0, mode = 200
page.on('pageerror', (error: Error) => errors.push(error.message))
await page.route('**/*', async (route: any) => {
  const request = route.request(), url = new URL(request.url())
  if (url.origin !== 'http://127.0.0.1:4331') return route.abort()
  if (!url.pathname.startsWith('/api/v1/')) return route.continue()
  if (mode !== 200) return route.fulfill({ status: mode, contentType: 'application/json', body: JSON.stringify({ error: 'QA permission/session error' }) })
  if (url.pathname.endsWith('/form')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schema) })
  if (request.method() !== 'POST' || !url.pathname.endsWith('/benchmark-owned-d2d')) return route.abort()
  postCount++
  try {
    const r = calculateOwnedD2DScenarios(request.postDataJSON())
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ policy: 'STATELESS_BENCHMARK_NO_ADOPTION',
      calibrated: false, sourceStatus: r.sourceStatus, status: r.status, issues: r.issues,
      scenarios: r.scenarios?.map(s => ({ id: s.id, result: { calibrated: false, costs: s.result.costs,
        sharedTrailer: { lineage: { evidence: s.result.sharedTrailer!.lineage.evidence } } } })) ?? null }) })
  } catch { return route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"QA Invalid input"}' }) }
})
const confirm = page.getByRole('button', { name: 'Reemplazar expediente', exact: true })
const choose = async (content: string) => {
  await page.getByLabel('Archivo de expediente D2D').setInputFiles({ name: 'qa-dossier.json', mimeType: 'application/json', buffer: Buffer.from(content) })
}
async function noOverflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
}
try {
  await page.goto('http://127.0.0.1:4331/continuity.html')
  await page.getByLabel('Fecha compartida del servicio').waitFor()
  await noOverflow()
  await page.getByRole('button', { name: 'Iniciar caso México–Fort Smith', exact: true }).click()
  await page.getByText('Caso México–Fort Smith iniciado:', { exact: false }).waitFor()
  assert.equal(await page.getByLabel('Fecha compartida del servicio').inputValue(), '')
  checks.push('confirmed_case_descriptive_only_no_exact_date')
  const presetDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Guardar expediente', exact: true }).click()
  const presetDownload = await presetDownloadPromise
  const presetText = await readFile(await presetDownload.path(), 'utf8')
  const preset = await openBenchmarkDossier(presetText, schema)
  assert.equal((preset.input.route as any).route.usEndpoint, 'Fort Smith, AR 72916')
  assert.equal((preset.input.fixed as any).capital.acquisitionCost.value, '')
  assert.equal(postCount, 0)
  assert.equal(await page.getByLabel('Resumen de ruta').innerText().then((text: string) => text.includes('Fort Smith, AR 72916')), true)
  checks.push('confirmed_case_archived_no_economics_seeded')
  await page.screenshot({ path: resolve(out, '01-confirmed-case-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await choose(seed); await confirm.waitFor(); await confirm.click()
  await page.getByLabel('Fecha compartida del servicio').waitFor()
  assert.equal(await page.getByLabel('Fecha compartida del servicio').inputValue(), '2026-09-29')
  assert.equal(postCount, 0)
  await page.getByRole('button', { name: 'Calcular escenarios', exact: true }).click()
  await page.getByText('Total calculado', { exact: false }).first().waitFor()
  assert.equal(postCount, 1)
  checks.push('synthetic_capture_recalculated_real_engine')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Guardar expediente', exact: true }).click()
  const download = await downloadPromise
  const exported = await readFile(await download.path(), 'utf8')
  assert.deepEqual((await openBenchmarkDossier(exported, schema)).input, input)
  assert.equal(exported.includes('"costs"'), false)
  checks.push('download_retains_inputs_not_totals')
  await page.reload(); await page.getByLabel('Fecha compartida del servicio').waitFor()
  assert.equal(await page.getByLabel('Fecha compartida del servicio').inputValue(), '')
  assert.equal(await page.getByText('Total calculado', { exact: false }).count(), 0)
  await choose(exported); await confirm.waitFor(); await confirm.click()
  assert.equal(await page.getByText('Total calculado', { exact: false }).count(), 0)
  await page.getByRole('button', { name: 'Calcular escenarios', exact: true }).click()
  await page.getByText('Total calculado', { exact: false }).first().waitFor()
  assert.equal(postCount, 2)
  checks.push('reload_reopen_recalculate_no_archived_result_trust')
  await choose(exported); await confirm.waitFor()
  await page.getByRole('button', { name: 'Cancelar apertura', exact: true }).click()
  assert.equal(await page.getByLabel('Fecha compartida del servicio').inputValue(), '2026-09-29')
  checks.push('cancel_preserves_current_capture')
  const corrupted = JSON.parse(exported); corrupted.payload.input.route.direction = 'US_TO_MX'
  await choose(JSON.stringify(corrupted))
  await page.getByRole('alert').filter({ hasText: 'No se abrió el archivo' }).waitFor()
  assert.equal(await confirm.count(), 0)
  checks.push('corrupted_file_rejected')
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow()
  const buttons = await page.getByRole('button', { name: 'Guardar expediente', exact: true }).boundingBox()
  assert.ok(buttons && buttons.height >= 44)
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await page.screenshot({ path: resolve(out, '02-mobile-recalculated.png'), fullPage: true })
  checks.push('mobile_390_no_overflow')
  checks.push('new_actions_44px_minimum_touch_target')
  await page.setViewportSize({ width: 768, height: 900 }); await noOverflow()
  checks.push('tablet_768_no_overflow')
  mode = 403
  await page.getByRole('button', { name: 'Guardar expediente', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'No tienes permiso para guardar' }).waitFor()
  checks.push('current_permission_rechecked_before_export')
  mode = 200
  await page.getByRole('button', { name: 'Simular vencimiento', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Sesión vencida' }).waitFor()
  assert.equal(await page.getByLabel('Archivo de expediente D2D').count(), 0)
  assert.equal(await page.getByText('Total calculado', { exact: false }).count(), 0)
  checks.push('session_expiration_wipes_inputs_staging_and_results')
  assert.deepEqual(errors, [])
  await writeFile(resolve(out, 'verification.json'), JSON.stringify({ verified: true, checks, pageErrors: errors,
    transport: 'PLAYWRIGHT_INTERCEPTION', identity: 'SIMULATED', data: 'SYNTHETIC', calculation: 'REAL_NODE_ENGINE',
    postCount, economicBenchmarkAccepted: false, b2Complete: false, dbWrites: 0 }, null, 2))
  console.log(JSON.stringify({ verified: true, checks: checks.length, postCount, output: out, identity: 'SIMULATED', b2Complete: false }))
} finally { await browser.close() }
