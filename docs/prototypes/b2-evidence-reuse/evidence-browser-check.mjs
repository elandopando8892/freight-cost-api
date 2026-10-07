import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
if (!process.env.FCM_PLAYWRIGHT_MODULE) throw new Error('Use installed Playwright; no automatic install.')
const { chromium } = await import(pathToFileURL(process.env.FCM_PLAYWRIGHT_MODULE).href)
const origin = 'http://127.0.0.1:4320'
const output = fileURLToPath(new URL('../../../tmp/b2-evidence-cut3/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = [], errors = [], external = [], writes = [], contrast = []
async function check(name, task) {
  try { await task(); results.push({ name, status: 'PASS' }) }
  catch (e) { results.push({ name, status: 'FAIL', message: e.message }); throw e }
}
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
page.on('pageerror', e => errors.push(e.message))
await page.route('**/*', route => {
  const request = route.request()
  if (!request.url().startsWith(`${origin}/`)) { external.push(request.url()); return route.abort() }
  if (!['GET', 'HEAD'].includes(request.method())) { writes.push(request.url()); return route.abort() }
  return route.continue()
})
const load = () => page.getByRole('button', { name: 'Consultar expediente', exact: true }).click()
try {
  await check('starts empty; actual public research and simulated transport declared', async () => {
    await page.goto(`${origin}/evidence.html`)
    await page.getByText('Sin expediente cargado.', { exact: false }).waitFor()
    assert(await page.locator('.qa-banner').textContent().then(t => t.includes('Auth simulados')))
    assert(await page.locator('.qa-brand img').evaluate(el => el.naturalWidth > 0))
    assert.equal(await page.getByRole('link', { name: 'Ver fuente pública ↗' }).count(), 0)
  })
  await check('public pinned MX comparator is not a September cost or canonical mapping', async () => {
    await load(); await page.getByText('Comparador publicado: 260 MXN', { exact: false }).waitFor()
    assert(await page.locator('main').textContent().then(t => t.includes('NO adoptado') && t.includes('Delta CVU: pendiente') && t.includes('83 fuentes') && t.includes('sin vínculo verificado')))
    assert.equal(await page.getByRole('link', { name: 'Ver fuente pública ↗' }).first().getAttribute('href'), 'https://pensiondetrailers40-5.com/')
    await page.screenshot({ path: `${output}/desktop.png`, fullPage: true })
  })
  await check('US meal source is explicitly not a lodging price', async () => {
    await page.getByRole('button', { name: /Pernocta US/ }).click()
    assert(await page.locator('article').textContent().then(t => t.includes('no alojamiento') && t.includes('Precio aplicable: pendiente')))
    assert.equal(await page.getByRole('link', { name: 'Ver fuente pública ↗' }).first().getAttribute('href'), 'https://www.irs.gov/pub/irs-drop/n-25-54.pdf')
  })
  await check('selected and unselected card text meet 4.5:1 contrast with actual CSS compositing', async () => {
    const values = await page.locator('aside button[aria-pressed]').evaluateAll(buttons => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      function rgba(css) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) => i === 3 ? v / 255 : v) }
      const blend = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]))
      const luminance = rgb => rgb.map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4 }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
      return buttons.flatMap(button => [button, button.querySelector('small')].map(el => {
        const ancestors = []; for (let node = el; node; node = node.parentElement) ancestors.unshift(node)
        let bg = [255, 255, 255]
        for (const node of ancestors) bg = blend(rgba(getComputedStyle(node).backgroundColor), bg)
        const style = getComputedStyle(el); const color = rgba(style.color); color[3] *= Number(style.opacity)
        const fg = blend(color, bg); const a = luminance(fg), b = luminance(bg)
        return { selected: button.getAttribute('aria-pressed') === 'true', element: el === button ? 'title' : 'caption', foreground: style.color,
          backgroundRgb: bg, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), required: 4.5 }
      }))
    })
    contrast.push(...values)
    assert(values.some(v => v.selected) && values.some(v => !v.selected))
    for (const v of values) assert(v.ratio >= v.required, `${v.element} selected=${v.selected}: ${v.ratio}`)
  })
  await check('empty filters clear the inspector, then keyboard selects a visible concept', async () => {
    await page.getByLabel('Buscar concepto').fill('impossible')
    await page.getByText('No hay conceptos con estos filtros.').waitFor()
    assert(!await page.locator('article').textContent().then(t => t.includes('260 MXN')))
    await page.getByLabel('Buscar concepto').fill('')
    const button = page.getByRole('button', { name: /Pernocta MX/ }); await button.focus(); await page.keyboard.press('Enter')
    await page.getByText('Comparador publicado: 260 MXN', { exact: false }).waitFor()
  })
  await check('all four real comparison contexts remain uncalibrated with null totals', async () => {
    for (const cycle of ['NETWORK_EXPECTED_EMPTY_PROXY', 'DEDICATED_EMPTY_SAME_BOX_RETURN']) for (const capital of ['CASH', 'FINANCED']) {
      await page.getByLabel('Ciclo', { exact: true }).selectOption(cycle)
      await page.getByLabel('Capital comparativo').selectOption(capital); await load()
      await page.getByText('Comparador publicado: 260 MXN', { exact: false }).waitFor()
      assert(await page.locator('main').textContent().then(t => t.includes('sin calibración ni adopción') && t.includes('Delta CVU: pendiente')))
    }
  })
  await check('mobile and tablet read without horizontal overflow', async () => {
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: `${output}/${width}.png`, fullPage: true })
    }
  })
  await check('200 percent CSS zoom retains legibility and no horizontal overflow', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.evaluate(() => { document.body.style.zoom = '2' })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert(await page.getByRole('button', { name: /Pernocta MX/ }).isVisible())
    await page.screenshot({ path: `${output}/zoom-200.png`, fullPage: true })
    await page.evaluate(() => { document.body.style.zoom = '' })
  })
  for (const status of ['403', '409', '500']) await check(`HTTP ${status} clears prior data without synthetic fallback`, async () => {
    await page.getByLabel('Respuesta de prueba').selectOption(status); await load()
    await page.getByRole('alert').waitFor()
    assert(!await page.locator('main').textContent().then(t => t.includes('260 MXN')))
    await page.getByLabel('Respuesta de prueba').selectOption('OK'); await load()
    await page.getByText('Comparador publicado: 260 MXN', { exact: false }).waitFor()
  })
  await check('account switch wipes the view and requires verified reload', async () => {
    await page.getByLabel('Respuesta de prueba').selectOption('OTHER_ACCOUNT'); await load()
    await page.getByText('Cambió la cuenta u organización.', { exact: false }).waitFor()
    assert(await page.getByRole('button', { name: 'Consultar expediente', exact: true }).isDisabled())
    assert(!await page.locator('main').textContent().then(t => t.includes('260 MXN')))
  })
  await check('reload starts clean, re-reads the same real sources, never persists notes', async () => {
    await page.reload(); await page.getByText('Sin expediente cargado.', { exact: false }).waitFor(); await load()
    await page.getByText('Comparador publicado: 260 MXN', { exact: false }).waitFor()
    assert.equal(await page.locator('textarea').count(), 0)
    assert.equal(await page.evaluate(() => sessionStorage.length + localStorage.length), 0)
  })
  await check('expired-session event cleans data and blocks new reads', async () => {
    await page.getByRole('button', { name: 'Simular vencimiento' }).click()
    assert(!await page.locator('main').textContent().then(t => t.includes('260 MXN')))
    assert(await page.getByRole('button', { name: 'Consultar expediente', exact: true }).isDisabled())
  })
  await check('no external calls, writes or runtime errors', async () => {
    assert.deepEqual(external, []); assert.deepEqual(writes, []); assert.deepEqual(errors, [])
  })
} finally {
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ results, contrast, external, writes, errors, auth: 'SIMULATED_NOT_REAL_LOGIN', data: 'REAL_PINNED_PUBLIC_RESEARCH' }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: results.filter(r => r.status === 'PASS').length, total: results.length, output }))
