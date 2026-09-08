/**
 * Hermetic browser test: real component and MARKSMAN CSS, synthetic API only.
 * FCM_PLAYWRIGHT_MODULE may point to the host's bundled playwright package.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import assert from 'node:assert/strict'
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(webDir, 'package.json'))
const { build } = require('esbuild')
const postcss = require('postcss')
const tailwind = require('@tailwindcss/postcss')
const { chromium } = require(process.env.FCM_PLAYWRIGHT_MODULE || 'playwright')
const outputDir = resolve(webDir, '../../tmp/proposal-review')
await mkdir(outputDir, { recursive: true })
const entry = [
  "import React from 'react'",
  "import { createRoot } from 'react-dom/client'",
  "import { ProposalPreviewAction } from './app/(app)/quotes/[id]/proposal-preview'",
  "const params = new URLSearchParams(location.search)",
  "createRoot(document.getElementById('root')).render(",
  '<main className="mx-auto max-w-5xl p-6">',
  '<p className="mb-6 border-l-2 border-primary pl-3">MARKSMAN · Prueba local con datos ficticios</p>',
  '<h1 className="mb-2 text-2xl font-semibold">Monterrey → Saltillo</h1>',
  '<p className="mb-6 text-muted-foreground">Cotización confirmada · vista comercial</p>',
  '<ProposalPreviewAction quoteId="quote-1" status={params.get("status") || "CONFIRMED"} canEdit={params.get("role") !== "VIEWER"} />',
  '</main>)',
].join('\n')
const bundled = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: webDir },
  bundle: true, write: false, format: 'iife', jsx: 'automatic',
  tsconfig: join(webDir, 'tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'silent',
})
const cssPath = join(webDir, 'app/globals.css')
const css = (await postcss([tailwind({ base: webDir })]).process(await readFile(cssPath, 'utf8'), { from: cssPath })).css
// Next normally injects these variables through next/font. The isolated harness
// uses the approved Arial/Courier fallbacks without downloading any fonts.
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MARKSMAN · revisión local</title><link rel="stylesheet" href="/style.css"><style>:root{--font-geist-sans:Arial;--font-geist-mono:"Courier New"}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>'
const server = createServer((request, response) => {
  const path = request.url.split('?')[0]
  const file = path === '/app.js' ? ['text/javascript', bundled.outputFiles[0].text]
    : path === '/style.css' ? ['text/css', css] : path === '/' ? ['text/html', html] : null
  response.writeHead(file ? 200 : 404, { 'content-type': file?.[0] || 'text/plain', 'cache-control': 'no-store' })
  response.end(file?.[1] || 'No live endpoint in this harness')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = 'http://127.0.0.1:' + server.address().port
const browser = await chromium.launch({ headless: true, ...(process.env.FCM_BROWSER_CHANNEL ? { channel: process.env.FCM_BROWSER_CHANNEL } : {}) })
const results = []
const browserErrors = []
let page
try {
  const context = await browser.newContext()
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort())
  page = await context.newPage()
  page.on('pageerror', error => browserErrors.push(error.message))
  let mode = 'success'
  let requests = []
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    assert.equal(new URL(request.url()).pathname, '/api/v1/quotes/quote-1/customer-proposal-draft/preview')
    const body = request.postDataJSON()
    requests.push({ body, key: request.headers()['idempotency-key'] })
    assert.match(requests.at(-1).key, /^[a-f0-9-]{36}$/)
    const selectedMode = mode
    if (selectedMode === 'slow') await new Promise(resolve => setTimeout(resolve, 700))
    const statuses = { error: 503, forbidden: 403, missing: 404, ineligible: 409 }
    if (statuses[selectedMode]) return route.fulfill({ status: statuses[selectedMode], json: { error: 'Synthetic error' } })
    return route.fulfill({ json: {
      contractVersion: 'fcm.customer-proposal-draft.v1', mode: 'PREVIEW_ONLY',
      source: { quoteId: selectedMode === 'wrong-source' ? 'other-quote' : 'quote-1' },
      draft: { ...body, validUntil: body.validUntil + 'T00:00:00.000Z',
        lines: [{ origin: 'Monterrey', destination: 'Saltillo', equipment: 'Truck Trailer · Dry Van',
          config: 'Single', operation: 'Intra-Mex', service: 'One Way', tariff: 1756, currency: 'USD', distance: '250 km' }] },
    } })
  })
  const name = 'Northstar Distribution'
  const open = async () => page.getByRole('button', { name: 'Revisar propuesta', exact: true }).click()
  const fill = async () => {
    await page.getByLabel('Cliente', { exact: true }).fill(name)
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + 7)
    await page.getByLabel('Vigente hasta', { exact: true }).fill(date.toISOString().slice(0, 10))
    await page.getByLabel('Contacto (opcional)', { exact: true }).fill('María López')
    await page.getByLabel('Correo (opcional)', { exact: true }).fill('maria@northstar.example')
  }
  const noOverflow = async () => {
    const sizes = await page.evaluate(() => ({
      viewport: innerWidth, scroll: document.documentElement.scrollWidth,
      dialog: document.querySelector('[role="dialog"]').getBoundingClientRect().toJSON(), height: innerHeight,
    }))
    assert.ok(sizes.scroll <= sizes.viewport, JSON.stringify(sizes))
    assert.ok(sizes.dialog.x >= 0 && sizes.dialog.right <= sizes.viewport + 1, JSON.stringify(sizes))
    assert.ok(sizes.dialog.y >= 0 && sizes.dialog.bottom <= sizes.height + 1, JSON.stringify(sizes))
  }
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto(base)
    await open()
    await fill()
    await noOverflow()
    await page.screenshot({ path: join(outputDir, viewport.width + '-capture.png') })
    await page.getByRole('button', { name: 'Ver propuesta', exact: true }).click()
    await page.getByRole('heading', { name, exact: true }).waitFor()
    assert.equal(await page.getByRole('heading', { name, exact: true }).evaluate(el => el === document.activeElement), true)
    await noOverflow()
    await page.screenshot({ path: join(outputDir, viewport.width + '-review.png') })
    await page.getByRole('button', { name: 'Editar datos' }).click()
    assert.equal(await page.getByLabel('Cliente', { exact: true }).inputValue(), name)
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await page.waitForFunction(() => document.activeElement?.textContent?.includes('Revisar propuesta'), undefined, { timeout: 2000 })
    assert.equal(await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).evaluate(el => el === document.activeElement), true)
    results.push({ viewport, flow: 'PASS', focus: 'PASS', overflow: 'PASS' })
  }
  await page.goto(base)
  await open()
  await fill()
  mode = 'error'
  requests = []
  await page.getByRole('button', { name: 'Ver propuesta', exact: true }).click()
  await page.getByRole('alert').waitFor()
  const retryKey = requests[0].key
  await page.getByRole('button', { name: 'Reintentar revisión' }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(requests.at(-1).key, retryKey)
  await page.getByLabel('Cliente', { exact: true }).fill('Cliente con cambio')
  mode = 'success'
  await page.getByRole('button', { name: 'Ver propuesta', exact: true }).click()
  await page.getByRole('heading', { name: 'Cliente con cambio' }).waitFor()
  assert.notEqual(requests.at(-1).key, retryKey)
  results.push({ errorRetryAndEdit: 'PASS' })
  for (const errorMode of ['forbidden', 'missing', 'ineligible', 'wrong-source']) {
    await page.goto(base)
    await open()
    await fill()
    mode = errorMode
    await page.getByRole('button', { name: 'Ver propuesta', exact: true }).click()
    await page.getByRole('alert').waitFor()
    assert.equal(await page.getByRole('heading', { name, exact: true }).count(), 0)
    results.push({ mode: errorMode, errorRecovery: 'PASS' })
  }
  await page.screenshot({ path: join(outputDir, '390-error.png') })
  for (const query of ['?role=VIEWER', '?status=DRAFT', '?status=ARCHIVED']) {
    await page.goto(base + query)
    assert.equal(await page.getByRole('button', { name: 'Revisar propuesta', exact: true }).isDisabled(), true)
    results.push({ gate: query, result: 'PASS' })
  }
  await page.goto(base)
  await open()
  await fill()
  mode = 'slow'
  await page.getByRole('button', { name: 'Ver propuesta', exact: true }).click()
  await page.getByRole('status').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Preparando…', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await open()
  assert.equal(await page.getByLabel('Cliente', { exact: true }).inputValue(), '')
  results.push({ cancelPendingRequest: 'PASS' })
  assert.deepEqual(browserErrors, [])
  await writeFile(join(outputDir, 'results.json'), JSON.stringify({ scope: 'Local component, synthetic API. Not authenticated E2E.', results, browserErrors }, null, 2))
  console.log(JSON.stringify({ outputDir, results, browserErrors }))
} catch (error) {
  if (page) await page.screenshot({ path: join(outputDir, 'failure.png') })
  throw error
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
