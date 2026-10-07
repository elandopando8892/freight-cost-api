import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const { chromium } = createRequire(resolve(process.argv[2], 'package.json'))('playwright')
const output = resolve('tmp/b2-economic-trace-evidence')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const checks = [], errors = [], blocked = []
const record = (name, condition) => { assert.ok(condition, name); checks.push(name) }
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport })
    page.on('pageerror', e => errors.push(e.message))
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin !== 'http://127.0.0.1:4330') { blocked.push(route.request().url()); return route.abort() }
      return route.continue()
    })
    const base = 'http://127.0.0.1:4330/tests/visual/economic-trace.html'
    await page.goto(base)
    await page.getByRole('heading', { name: 'Escenario QA-1', exact: true }).waitFor()
    const scenario = page.locator('article').first()
    record(`${viewport.width}: trace closed initially`, await scenario.locator('details[open]').count() === 0)
    const trace = scenario.locator('details').first()
    const summary = trace.locator(':scope > summary')
    await summary.focus(); await page.keyboard.press('Enter')
    record(`${viewport.width}: keyboard opens trace`, await trace.getAttribute('open') !== null)
    const resources = trace.locator(':scope > div > details')
    record(`${viewport.width}: three distinct resources`, await resources.count() === 3)
    for (let i = 0; i < 3; i++) {
      const resource = resources.nth(i)
      await resource.locator(':scope > summary').click()
      const rates = resource.locator(':scope > details').nth(0)
      await rates.locator(':scope > summary').click()
      await rates.locator(':scope > details').first().locator(':scope > summary').click()
      record(`${viewport.width}: resource ${i} inputs visible`, await rates.locator('li').count() > 0)
      const sources = resource.locator(':scope > details').nth(2)
      await sources.locator(':scope > summary').click()
      record(`${viewport.width}: resource ${i} limitations visible`, (await sources.textContent()).includes('Sin evidencia económica'))
      record(`${viewport.width}: resource ${i} safe source links`, await sources.locator('a[rel="noopener noreferrer"][href^="https:"]').count() > 0)
      // Keep just one resource open for a readable capture.
      if (i < 2) await resource.locator(':scope > summary').click()
    }
    record(`${viewport.width}: no horizontal overflow when expanded`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${output}/trace-${viewport.width}.png`, fullPage: true })
    await page.reload()
    await page.getByRole('heading', { name: 'Escenario QA-1', exact: true }).waitFor()
    record(`${viewport.width}: reload returns to collapsed trace`, await page.locator('details[open]').count() === 0)
    await page.goto(`${base}?state=legacy`)
    await page.getByText(/Traza económica no disponible/).first().waitFor()
    record(`${viewport.width}: legacy has explicit missing trace`, await page.getByText('Traza económica · 3 recursos', { exact: true }).count() === 0)
    await page.goto(`${base}?state=incomplete`)
    await page.getByRole('heading', { name: 'Datos pendientes · sin total' }).waitFor()
    record(`${viewport.width}: incomplete has no scenario total`, await page.locator('article').count() === 0)
    await page.close()
  }
  record('no browser errors', errors.length === 0)
  record('no external requests', blocked.length === 0)
  await writeFile(`${output}/results.json`, JSON.stringify({ synthetic: true, realAuth: false, realPersistence: false, checks, errors, blocked }, null, 2))
  console.log(JSON.stringify({ passed: checks.length, output, synthetic: true }))
} finally { await browser.close() }
