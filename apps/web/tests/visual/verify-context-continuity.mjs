import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

// Supply the bundled package directory; no package download or API credential.
const { chromium } = createRequire(resolve(process.argv[2], 'package.json'))('playwright')
const output = resolve('tmp/context-continuity-evidence')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const checks = [], errors = [], blocked = []
const record = (name, condition) => { assert.ok(condition, name); checks.push(name) }
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport })
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin !== 'http://127.0.0.1:4330') { blocked.push(url.origin); return route.abort() }
      return route.continue()
    })
    const label = `${viewport.width}`
    await page.goto('http://127.0.0.1:4330/tests/visual/context-continuity.html?view=bases&base=B')
    await page.getByRole('button', { pressed: true }).waitFor()
    record(`${label}: deep link selects authorized B`, (await page.getByRole('button', { pressed: true }).textContent()).includes('Base sintética B'))
    record(`${label}: version belongs to B`, await page.locator('a[href="/assumptions/qa-set-B"]').count() > 0)
    record(`${label}: board has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await page.screenshot({ path: `${output}/bases-${label}.png`, fullPage: true })
    await page.getByRole('button', { name: /Base sintética A/ }).click()
    record(`${label}: selection changes local URL`, new URL(page.url()).searchParams.get('base') === 'A')
    await page.goto('http://127.0.0.1:4330/tests/visual/context-continuity.html?view=bases&base=unavailable')
    await page.getByRole('alert').waitFor()
    record(`${label}: missing selection has no substitute detail`, await page.locator('a[href^="/assumptions/"]').count() === 0)
    await page.getByRole('button', { name: 'Ver bases disponibles', exact: true }).click()
    record(`${label}: authorized defaults recover`, (await page.getByRole('button', { pressed: true }).textContent()).includes('Base sintética A'))

    await page.goto('http://127.0.0.1:4330/tests/visual/context-continuity.html')
    await page.getByLabel('Fecha compartida del servicio', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Iniciar caso México–Fort Smith', exact: true }).click()
    await page.getByLabel('Fecha compartida del servicio', { exact: true }).fill('2026-09-28')
    await page.getByRole('button', { name: 'Consultar evidencia pública B2', exact: true }).click()
    record(`${label}: one page heading`, await page.locator('h1').count() === 1)
    record(`${label}: inline evidence keeps capture date`, await page.getByLabel('Fecha compartida del servicio', { exact: true }).inputValue() === '2026-09-28')
    await page.getByRole('button', { name: 'Consultar expediente', exact: true }).click()
    await page.getByRole('alert').waitFor()
    record(`${label}: fixture denied read shown without fallback`, (await page.getByRole('alert').textContent()).includes('Necesitas rol'))
    record(`${label}: inspector has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await page.screenshot({ path: `${output}/inline-evidence-${label}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Ocultar evidencia B2', exact: true }).click()
    record(`${label}: closing keeps capture`, await page.getByLabel('Fecha compartida del servicio', { exact: true }).inputValue() === '2026-09-28')
    record(`${label}: closing unmounts inspector`, await page.getByRole('button', { name: 'Consultar expediente', exact: true }).count() === 0)
    await page.close()
  }
  record('no unhandled page errors', errors.length === 0)
  record('no external HTTP request attempted', blocked.length === 0)
  await writeFile(`${output}/results.json`, JSON.stringify({ synthetic: true, nextRouter: 'shim only', realAuth: false, realPersistence: false, checks, errors, blocked }, null, 2))
  console.log(JSON.stringify({ passed: checks.length, output, synthetic: true }))
} finally { await browser.close() }
