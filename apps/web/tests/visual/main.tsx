import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { QuoteModes } from '../../app/(app)/quote/quote-modes'
import type { CostBaseOption, QuoteResult } from '../../app/(app)/quote/quote-shared'
import { CostBaseWizard, type OperationalSegmentOption } from '../../app/(app)/cost-bases/cost-base-wizard'
import { CostBaseCalibrationDialog } from '../../app/(app)/cost-bases/cost-base-calibration-dialog'
import { defaultProfile, type CostBaseScope } from '../../app/(app)/cost-bases/cost-base-profile'
import '../../app/globals.css'

const base: CostBaseOption = { id: 'fixture-base', code: 'QA-SINTETICA', name: 'Base ficticia — no comercial', scope: 'CROSS_BORDER', status: 'ACTIVE', defaultPolicy: 'OPERATIONAL_V3', isDefault: true,
  versions: [{ id: 'fixture-version', version: 7, status: 'PUBLISHED', isActive: true, applicabilityContext: {}, _count: { params: 210 } }] }
let mode = 'success'
let calls = 0
let saves = 0
const intents = new Map<string, string>()
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
const segmentFixtures: OperationalSegmentOption[] = [
  { id: 'D2D_BINATIONAL_OWN', label: 'D2D · operación propia en MX y EE. UU.', scope: 'CROSS_BORDER', status: 'CONFIGURABLE', presetId: 'std-d2d-crossborder-v1', detail: 'Ambos tramos usan costos operativos propios y el cruce es through-tractor.' },
  { id: 'D2D_MX_US_PARTNER', label: 'D2D · línea mexicana entrega a socio estadounidense', scope: 'CROSS_BORDER', status: 'MODEL_PENDING', presetId: null, detail: 'Falta la tarifa de la línea estadounidense y el punto de intercambio.' },
  { id: 'D2D_US_MX_PARTNER', label: 'D2D · línea estadounidense entrega a socio mexicano', scope: 'CROSS_BORDER', status: 'MODEL_PENDING', presetId: null, detail: 'Falta la tarifa de la línea mexicana y el punto de intercambio.' },
  { id: 'D2D_TRANSSHIPMENT', label: 'D2D · transbordo de carga', scope: 'CROSS_BORDER', status: 'MODEL_PENDING', presetId: null, detail: 'Faltan maniobras, almacén, tiempos y riesgos del transbordo.' },
  { id: 'MX_DRAYAGE', label: 'Drayage México', scope: 'DRAYAGE', status: 'MODEL_PENDING', presetId: null, detail: 'El ciclo Drayage V3 actual es estadounidense.' },
  { id: 'INTRA_MEX', label: 'FTL Intra-México', scope: 'INTRA_MEX', status: 'CONFIGURABLE', presetId: 'std-ftl-intra-mex-v1', detail: 'Rutas domésticas mexicanas con costos propios.' },
  { id: 'MX_LOCAL', label: 'Locales México', scope: 'LOCAL', status: 'CONFIGURABLE', presetId: 'std-local-mx-v1', detail: 'Movimiento local mexicano con tractocamión.' },
  { id: 'INTRA_US', label: 'FTL Intra-EE. UU.', scope: 'INTRA_US', status: 'CONFIGURABLE', presetId: 'std-ftl-intra-us-v1', detail: 'Rutas estadounidenses con costos propios.' },
  { id: 'US_DRAYAGE', label: 'Drayage EE. UU.', scope: 'DRAYAGE', status: 'CONFIGURABLE', presetId: 'std-drayage-us-v1', detail: 'Ciclo portuario/intermodal estadounidense con chasis.' },
]
const presetFixtures = segmentFixtures.filter(segment => segment.presetId).map(segment => {
  const scope = segment.scope as CostBaseScope
  return { id: segment.presetId!, version: 'FCM_STANDARD_2026_1', label: segment.label, name: segment.label, code: `QA-${scope}`, description: segment.detail, scope, defaultPolicy: 'OPERATIONAL_V3', currency: scope === 'LOCAL' || scope === 'INTRA_MEX' ? 'MXN' : 'USD', isDefault: true,
    applicabilityProfile: defaultProfile(scope), assumptionOverrides: [], rationale: [segment.detail], applicability: { scope, profile: defaultProfile(scope), counts: { REQUIRED: 20, OPTIONAL: 0, CONDITIONAL: 0, NOT_IMPLEMENTED: 0, NOT_APPLICABLE: 190 }, border: scope === 'CROSS_BORDER' ? 'REQUIRED' : 'NOT_APPLICABLE', catalogTotal: 210 } }
})
// Intentionally no fallback to native fetch. Unknown URLs fail closed.
window.fetch = async (input, init) => {
  const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
  if (path === '/api/v1/catalog/locations') return reply({ locations: ['Monterrey, NL', 'Dallas, TX', 'Laredo, TX'] })
  if (path === '/api/v1/cost-bases/presets') return reply(presetFixtures)
  if (path === '/api/v1/cost-bases/fixture-base/versions/fixture-version/calibration') return reply({
    versionId: 'fixture-version', versionStatus: 'DRAFT', segment: 'MX_LOCAL', status: 'NOT_REVIEWED', evidence: null,
    groups: [
      { id: 'FLEET_ASSETS', label: 'Flota, activos y seguros', fields: [{ section: 'GENERAL_BASE', field: 'Tamaño de Flota', value: 32, unit: 'tractors', recommended: 50, applicability: 'REQUIRED' }] },
      { id: 'ROUTE_CYCLE', label: 'Ciclo, reposicionamiento y equipo', fields: [{ section: 'UTILIZATION', field: 'Billable Day Floor Local', value: 1, unit: 'days', recommended: 1, applicability: 'CONDITIONAL' }] },
    ], withoutMath: [{ section: 'UTILIZATION', field: 'Detention Rate' }],
  })
  if (path === '/api/v1/cost-bases/applicability-preview') {
    const body = JSON.parse(String(init?.body))
    return reply({ scope: body.scope, profile: body.applicabilityProfile, counts: { REQUIRED: 20, OPTIONAL: 0, CONDITIONAL: 0, NOT_IMPLEMENTED: 0, NOT_APPLICABLE: 190 }, border: body.scope === 'CROSS_BORDER' ? 'REQUIRED' : 'NOT_APPLICABLE', catalogTotal: 210 })
  }
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
  const [created, setCreated] = useState('')
  const [showCalibration, setShowCalibration] = useState(true)
  if (location.pathname.endsWith('/calibration.html')) return <QueryClientProvider client={client}><main className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
    <aside className="rounded border border-amber-500 bg-amber-50 p-3 text-sm text-black"><strong>QA LOCAL · CALIBRACIÓN SINTÉTICA · SIN AUTH NI BASE REAL</strong></aside>
    <h1 className="text-2xl font-semibold">Calibración de supuestos</h1>
    <button className="rounded border p-2" onClick={() => setShowCalibration(true)}>Abrir calibración</button>
    {showCalibration ? <CostBaseCalibrationDialog baseId="fixture-base" versionId="fixture-version" onClose={() => setShowCalibration(false)} onSaved={() => setCreated('Calibración local simulada')} /> : null}
    <output>{created}</output>
  </main><Toaster /></QueryClientProvider>
  if (location.pathname.endsWith('/segments.html')) return <QueryClientProvider client={client}><main className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
    <aside className="rounded border border-amber-500 bg-amber-50 p-3 text-sm text-black"><strong>QA LOCAL · SEGMENTOS SINTÉTICOS · SIN BASE REAL</strong></aside>
    <h1 className="text-2xl font-semibold">Bases por segmento operativo</h1>
    <CostBaseWizard initialScope="CROSS_BORDER" existingCodes={[]} segments={segmentFixtures} pending={false} onSubmit={body => setCreated(`Borrador local: ${body.operationalSegment ?? 'sin segmento'} · ${body.code}`)} />
    <output role="status">{created}</output>
  </main><Toaster /></QueryClientProvider>
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
