import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const modulePath = process.env.FCM_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('Set FCM_PLAYWRIGHT_MODULE to the installed playwright/index.mjs. No automatic install.');
const { chromium } = await import(pathToFileURL(modulePath).href);
const origin = 'http://127.0.0.1:4320';
const output = fileURLToPath(new URL('../../../tmp/reuse-spike-evidence/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const externalRequests = [];
const writes = [];
const errors = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, status: 'PASS' }); }
  catch (e) { results.push({ name, status: 'FAIL', message: e.message }); throw e; }
}
async function waitFor(page, selector, text) {
  await page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent?.includes(text), { selector, text });
}
try {
  for (const variant of ['actual', 'refine']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__sawDemoLoading = false;
      new MutationObserver(() => {
        if (document.querySelector('.list')?.textContent?.includes('Cargando evidencia sintética')) window.__sawDemoLoading = true;
      }).observe(document, { childList: true, subtree: true });
    });
    page.on('pageerror', (error) => errors.push({ variant, message: error.message }));
    await page.route('**/*', (route) => {
      const req = route.request();
      if (!req.url().startsWith(`${origin}/`)) { externalRequests.push({ variant, url: req.url() }); return route.abort(); }
      if (!['GET', 'HEAD'].includes(req.method())) { writes.push({ variant, method: req.method(), url: req.url() }); return route.abort(); }
      return route.continue();
    });
    await check(`${variant}: loading and four synthetic records`, async () => {
      await page.goto(`${origin}/${variant}.html`);
      await waitFor(page, '.count', '4 conceptos');
      assert.equal(await page.locator('.row').count(), 4);
      assert.equal(await page.evaluate(() => window.__sawDemoLoading), true);
      assert(await page.locator('.demo').textContent().then((s) => s.includes('sintéticos')));
      assert(await page.locator('.brand img').evaluate((img) => img.naturalWidth > 0));
    });
    await check(`${variant}: search / country / empty / status`, async () => {
      await page.getByLabel('Buscar concepto').fill('pensión');
      await waitFor(page, '.count', '2 conceptos');
      await page.getByLabel('País', { exact: true }).selectOption('US');
      await waitFor(page, '.count', '1 conceptos');
      assert(await page.locator('.row').textContent().then((s) => s.includes('US_DRIVER_TOTAL')));
      await page.getByLabel('Estado', { exact: true }).selectOption('Parcial');
      await waitFor(page, '.count', '0 conceptos');
      await page.getByLabel('Buscar concepto').fill('');
      await page.getByLabel('País', { exact: true }).selectOption('Todos');
      await waitFor(page, '.count', '1 conceptos');
      await page.getByLabel('Estado', { exact: true }).selectOption('Todos');
      await waitFor(page, '.count', '4 conceptos');
    });
    await check(`${variant}: source / nulls / missing canonical link`, async () => {
      await page.locator('[data-evidence="mx-hotel"]').click();
      await page.locator('.inspector summary').click();
      assert(await page.locator('.inspector details').textContent().then((s) => s.includes('example.invalid')));
      assert.equal(await page.locator('.impact strong').allTextContents().then((v) => v.join(',')), 'Pendiente,Pendiente');
      assert(await page.locator('.facts').textContent().then((s) => s.includes('SIN_VINCULO_CANONICO')));
      assert(!await page.locator('.inspector').textContent().then((s) => /\$\s*0/.test(s)));
    });
    await check(`${variant}: validate / save / deduplicate / reload local note`, async () => {
      await page.getByRole('button', { name: 'Guardar nota sintética' }).click();
      await waitFor(page, '#note-error', 'al menos 3');
      await page.getByLabel('Nota de revisión').fill('Revisión sintética pendiente de tarifa.');
      await page.getByRole('button', { name: 'Guardar nota sintética' }).click();
      await page.getByRole('button', { name: 'Guardar nota sintética' }).click();
      assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('fcm-demo-note:')).length), 1);
      await page.reload(); await waitFor(page, '.count', '4 conceptos');
      await page.locator('[data-evidence="mx-hotel"]').click();
      assert.equal(await page.getByLabel('Nota de revisión').inputValue(), 'Revisión sintética pendiente de tarifa.');
    });
    await check(`${variant}: simulated token renewal preserves unsaved draft`, async () => {
      await page.getByLabel('Nota de revisión').fill('Borrador no guardado.');
      await page.locator('.qa summary').click();
      await page.getByRole('button', { name: 'Simular renovación' }).click();
      assert.equal(await page.getByLabel('Nota de revisión').inputValue(), 'Borrador no guardado.');
    });
    await check(`${variant}: scenario / funding / account reset and isolation`, async () => {
      for (const [label, value] of [['Ciclo', 'DEDICATED_EMPTY_SAME_BOX_RETURN'], ['Compra', 'FINANCED'], ['Cuenta sintética', 'Cuenta sintética B']]) {
        await page.getByLabel(label, { exact: true }).selectOption(value);
        await waitFor(page, '.count', '4 conceptos');
        assert.equal(await page.locator('.inspector').count(), 0);
        await page.locator('[data-evidence="mx-hotel"]').click();
        assert.equal(await page.getByLabel('Nota de revisión').inputValue(), '');
      }
    });
    await check(`${variant}: period incompatible / source incomplete`, async () => {
      await page.locator('[data-evidence="us-hotel"]').click();
      assert(await page.locator('.inspector').textContent().then((s) => s.includes('no sustenta septiembre')));
      await page.locator('[data-evidence="us-pension"]').click();
      await page.locator('.inspector summary').click();
      assert(await page.locator('.inspector details').textContent().then((s) => s.includes('no hay un localizador')));
    });
    await check(`${variant}: query error / retry / recovery`, async () => {
      await page.getByLabel('Consulta sintética').selectOption('error');
      await page.getByRole('button', { name: 'Reintentar consulta' }).waitFor();
      assert.equal(await page.locator('.row').count(), 0);
      assert.equal(await page.locator('.inspector').count(), 0);
      await page.getByRole('button', { name: 'Reintentar consulta' }).click();
      await page.getByLabel('Consulta sintética').selectOption('normal');
      await waitFor(page, '.count', '4 conceptos');
    });
    await check(`${variant}: viewer / operator / simulated expired session`, async () => {
      await page.getByLabel('Rol sintético').selectOption('VIEWER');
      await waitFor(page, '.guard', 'Acceso de viewer');
      assert.equal(await page.locator('.row').count(), 0);
      await page.getByLabel('Rol sintético').selectOption('OPERATOR');
      await waitFor(page, '.count', '4 conceptos');
      await page.getByLabel('Consulta sintética').selectOption('expired');
      await waitFor(page, '.guard', 'Sesión sintética vencida');
      await page.getByLabel('Consulta sintética').selectOption('normal');
      await waitFor(page, '.count', '4 conceptos');
    });
    await check(`${variant}: stale review visible and selection invalidated`, async () => {
      await page.locator('[data-evidence="mx-hotel"]').click();
      await page.getByLabel('Consulta sintética').selectOption('stale');
      await waitFor(page, '.count', '4 conceptos');
      assert.equal(await page.locator('.inspector').count(), 0);
      assert(await page.locator('.stale').textContent().then((s) => s.includes('Revalidar')));
      await page.getByLabel('Consulta sintética').selectOption('normal');
      await waitFor(page, '.count', '4 conceptos');
    });
    await check(`${variant}: desktop visual and keyboard selection`, async () => {
      await page.locator('.qa summary').click();
      await page.locator('[data-evidence="mx-hotel"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.inspector h2').evaluate((e) => document.activeElement === e), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `${output}/${variant}-desktop.png`, fullPage: true });
    });
    await check(`${variant}: mobile 390×844 / focus return / no overflow`, async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${output}/${variant}-mobile-detail.png`, fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('button', { name: 'Volver a pendientes' }).click();
      await page.waitForFunction(() => document.activeElement?.getAttribute('data-evidence') === 'mx-hotel', null, { timeout: 5000 });
      assert.equal(await page.locator('[data-evidence="mx-hotel"]').evaluate((e) => document.activeElement === e), true);
      await page.screenshot({ path: `${output}/${variant}-mobile-list.png`, fullPage: true });
      assert.equal(await page.locator('.inspector').count(), 0);
    });
    await context.close();
  }
  await check('No external requests / business HTTP writes / uncaught browser errors', async () => {
    assert.deepEqual(externalRequests, []); assert.deepEqual(writes, []); assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  const report = { at: new Date().toISOString(), scope: 'LOCAL_SYNTHETIC_ONLY', results, externalRequests, writes, errors };
  await writeFile(`${output}/browser-results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
