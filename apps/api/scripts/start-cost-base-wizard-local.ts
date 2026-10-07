import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZodError } from 'zod'
import { buildWizardReferenceCatalog, WIZARD_SOURCE_PINS, WizardDraftError } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { LocalWizardDraftStore } from './lib/cost-base-wizard-local-store.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const host = '127.0.0.1', port = 4722, origin = `http://${host}:${port}`
const catalog = buildWizardReferenceCatalog({ fuel: readFileSync(resolve(root, WIZARD_SOURCE_PINS.fuel.file), 'utf8'),
  maintenance: readFileSync(resolve(root, WIZARD_SOURCE_PINS.maintenance.file), 'utf8') })
const context = { orgId: 'LOCAL_W1_REVIEW_ONLY', baseId: 'BINATIONAL_REFERENCE_DRAFT', versionId: 'LOCAL_DRAFT_V1' }
const assets = new Map([
  ['/', ['docs/prototypes/cost-base-wizard-w1/index.html', 'text/html; charset=utf-8']],
  ['/wizard.js', ['docs/prototypes/cost-base-wizard-w1/wizard.js', 'text/javascript; charset=utf-8']],
  ['/scale.mjs', ['docs/prototypes/cost-base-wizard-w1/scale.mjs', 'text/javascript; charset=utf-8']],
  ['/logo.png', ['apps/web/public/brand/marksman-logo.png', 'image/png']],
  ['/evidence/fuel.json', [WIZARD_SOURCE_PINS.fuel.file, 'application/json']],
  ['/evidence/maintenance.json', [WIZARD_SOURCE_PINS.maintenance.file, 'application/json']],
])

async function main() {
  const store = await LocalWizardDraftStore.open(resolve(root, 'docs/prototypes/cost-base-wizard-w1/runtime/draft.json'), context, catalog)
  createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'")
    const json = (status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)) }
    try {
      if (req.headers.host !== `${host}:${port}`) { json(403, { error: 'LOCAL_HOST_REQUIRED' }); return }
      const path = new URL(req.url ?? '/', origin).pathname
      if (req.method === 'GET' && path === '/api/catalog') { json(200, catalog); return }
      if (req.method === 'GET' && path === '/api/draft') { json(200, await store.read()); return }
      if (req.method === 'PUT' && path === '/api/draft') {
        if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json') {
          json(403, { error: 'LOCAL_SAME_ORIGIN_JSON_REQUIRED' }); return
        }
        let body = '', bytes = 0
        for await (const chunk of req) {
          bytes += Buffer.byteLength(chunk)
          if (bytes > 64 * 1024) { json(413, { error: 'LOCAL_REQUEST_TOO_LARGE' }); return }
          body += chunk.toString('utf8')
        }
        json(200, await store.save(JSON.parse(body))); return
      }
      if (req.method === 'GET' && path === '/wizard.css') {
        const original = readFileSync(resolve(root, 'docs/design/COST_BASE_WIZARD_2026-10-04.html'), 'utf8')
        res.writeHead(200, { 'Content-Type': 'text/css' }); res.end(original.match(/<style>([\s\S]*?)<\/style>/)![1]); return
      }
      const asset = assets.get(path)
      if (req.method === 'GET' && asset) {
        res.writeHead(200, { 'Content-Type': asset[1] }); res.end(readFileSync(resolve(root, asset[0]))); return
      }
      if (path === '/favicon.ico') { res.writeHead(204); res.end(); return }
      json(404, { error: 'LOCAL_RESOURCE_NOT_FOUND' })
    } catch (error) {
      json(error instanceof WizardDraftError ? error.statusCode : error instanceof ZodError || error instanceof SyntaxError ? 422 : 500,
        { error: error instanceof WizardDraftError ? error.message : 'LOCAL_DRAFT_REQUEST_FAILED' })
    }
  }).listen(port, host, () => console.log(`W1 local benchmark + persisted draft: ${origin}; no SaaS database/Auth/activation`))
}
void main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
