import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { QuoteModes } from '../../app/(app)/quote/quote-modes'
import type { CostBaseOption, QuoteResult } from '../../app/(app)/quote/quote-shared'
import '../../app/globals.css'

const base: CostBaseOption = { id: 'fixture-base', code: 'QA-SINTETICA', name: 'Base ficticia — no comercial', scope: 'CROSS_BORDER', status: 'ACTIVE', defaultPolicy: 'OPERATIONAL_V3', isDefault: true,
  versions: [{ id: 'fixture-version', version: 7, status: 'PUBLISHED', isActive: true, applicabilityContext: {}, _count: { params: 210 } }] }
let mode = 'success'
let calls = 0
let saves = 0
const intents = new Map<string, string>()
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
// Intentionally no fallback to native fetch. Unknown URLs fail closed.
window.fetch = async (input, init) => {
  const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
  if (path === '/api/v1/catalog/locations') return reply({ locations: ['Monterrey, NL', 'Dallas, TX', 'Laredo, TX'] })
  if (path === '/api/v1/engine/quote-by-route') {
    const capturedMode = mode
    const previewId = `fixture-preview-${++calls}`
    const capture = JSON.parse(String(init?.body))
    await new Promise(resolve => setTimeout(resolve, capturedMode === 'delayed' ? 7000 : 400))
    if (capturedMode === 'error') return reply({ error: 'No se pudo resolver la ruta sintética. Revisa origen y destino.' }, 422)
    const result: QuoteResult = { previewId, operation: capture.operation, policy: 'OPERATIONAL_V3', fxRateUsed: Number(capture.fxRate || 18.75), costBaseId: base.id, assumptionSetId: 'fixture-version',
      lineage: { costBase: { id: base.id, code: base.code, status: base.status }, set: { id: 'fixture-version', version: 7, status: 'PUBLISHED' }, readiness: 'GOVERNED' },
      mexLeg: null, usaLeg: null, resolved: { mexLeg: null, usaLeg: null }, freightBaselineUsd: 2400,
      warnings: ['Fixture visual sintético. No es evidencia económica ni tarifa utilizable.'],
      commercial: { costFloorUsd: 2000, minSellUsd: 2200, targetSellUsd: 2400, premiumSellUsd: 2600, minMarginPct: .09, targetMarginPct: .17, premiumMarginPct: .23, recommendedSellUsd: 2400, grossProfitUsd: 400, grossMarginPct: 1 / 6, gpPerLoadedMileUsd: .48, marketReferenceUsd: 2500, marketReferenceProvenance: 'observed', noGoFlag: false, reviewFlag: true, notes: ['Sólo QA local'] } }
    return reply(result)
  }
  if (path === '/api/v1/quotes/from-preview') {
    await new Promise(resolve => setTimeout(resolve, 600))
    if (mode === 'forbidden') return reply({ error: 'Forbidden' }, 403)
    if (mode === 'expired') return reply({ error: 'Calculation preview expired; recalculate' }, 409)
    const key = new Headers(init?.headers).get('Idempotency-Key') ?? ''
    if (!intents.has(key)) intents.set(key, `fixture-quote-${++saves}`)
    return reply({ id: intents.get(key), label: 'QA local', createdAt: '2026-09-22T12:00:00Z' })
  }
  throw new Error(`Blocked non-fixture request: ${path}`)
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function App() {
  const [scenario, setScenario] = useState('success')
  const [stats, setStats] = useState('')
  return <QueryClientProvider client={client}><main className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
    <aside className="rounded border border-amber-500 bg-amber-50 p-3 text-sm text-black">
      <strong>QA LOCAL · DATOS SINTÉTICOS · SIN AUTH NI BACKEND REAL</strong>
      <div className="mt-2 flex flex-wrap items-center gap-3"><label>Escenario <select aria-label="Escenario de QA" value={scenario} onChange={event => { mode = event.target.value; setScenario(mode) }}>
        <option value="success">Éxito</option><option value="delayed">Cálculo demorado 7s</option><option value="error">Error de cálculo 422</option><option value="forbidden">Guardado sin permisos 403</option><option value="expired">Preview expirado 409</option>
      </select></label><button onClick={() => setStats(`Cálculos: ${calls} · Cotizaciones sintéticas: ${saves}`)}>Consultar contadores</button><output>{stats}</output></div>
    </aside>
    <h1 className="text-2xl font-semibold">Nueva cotización</h1>
    <QuoteModes costBases={[base]} />
  </main><Toaster /></QueryClientProvider>
}
createRoot(document.getElementById('root')!).render(<App />)
