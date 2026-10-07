import { createRoot } from 'react-dom/client'
import { B2EvidenceInspector } from '@/app/(app)/scenarios/benchmark/evidence/b2-evidence'
import snapshot from '../../../apps/api/src/modules/engine/b2-evidence.snapshot.json'
import { sessionExpiredEvent } from '@/lib/fetcher'
import './evidence-fixture.css'

// QA ONLY: packaged public research is real; network transport and identity are simulated.
// This module is outside the production app and never calls Supabase, a DB, Google or AI.
let mode = 'OK'
window.fetch = async (input, init) => {
  const url = new URL(String(input), window.location.origin)
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (!url.pathname.endsWith('/engine/benchmark-owned-d2d/b2-evidence') || (init?.method && init.method !== 'GET'))
    return new Response(JSON.stringify({ error: 'QA_UNEXPECTED_REQUEST' }), { status: 400 })
  if (mode !== 'OK' && mode !== 'OTHER_ACCOUNT') return new Response(JSON.stringify({ error: 'QA error' }), { status: Number(mode) })
  const c = snapshot.payload.cases.find(c => c.cycleId === url.searchParams.get('cycleId') && c.fundingMode === url.searchParams.get('fundingMode'))!
  const p = snapshot.payload
  return new Response(JSON.stringify({ model: p.model, profileId: p.profileId, referencePeriod: p.referencePeriod,
    sha256: snapshot.sha256, sourceObservedOn: p.sourceObservedOn, capture: p.capture, presetPolicy: p.presetPolicy,
    calibrated: p.calibrated, quoteReady: p.quoteReady, adoptedValues: p.adoptedValues, notesPersisted: p.notesPersisted,
    canonicalParameterCount: p.canonicalParameterCount, sourcePinCount: p.sourcePins.length,
    scope: { sub: 'qa-only', orgId: mode === 'OTHER_ACCOUNT' ? 'qa-b' : 'qa-a' }, case: c }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}
createRoot(document.getElementById('root')!).render(<>
  <div className="qa-banner">QA local: expediente público real pinneado · transporte y Auth simulados · no es login ni adopción.</div>
  <header className="qa-brand"><img src="/brand/marksman-logo.png" alt="MARKSMAN"/><span>Bases de costo / Benchmark B2</span></header>
  <div className="qa-controls"><label>Respuesta de prueba <select aria-label="Respuesta de prueba" onChange={e => { mode = e.target.value }}>
    <option value="OK">OK simulado</option><option value="403">403</option><option value="409">409</option><option value="500">500</option><option value="OTHER_ACCOUNT">Otra cuenta</option></select></label>
    <button onClick={() => window.dispatchEvent(new Event(sessionExpiredEvent))}>Simular vencimiento</button></div>
  <main><B2EvidenceInspector /></main>
</>)
