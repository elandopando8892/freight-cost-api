import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { PartnerBaseDetail, PartnerBaseEditor, type TariffBase } from '../../app/(app)/cost-bases/partners/partner-base-editor'
import { thirdPartyFixture } from '../../../api/tests/fixtures/third-party-cost'
import { calculateThirdPartyCost } from '../../../api/src/modules/engine/third-party-cost'
import '../../app/globals.css'

const { serviceDate: _date, fx: _fx, ...terms } = thirdPartyFixture()
const base: TariffBase = { id: 'synthetic-base', code: 'QA-NO-COMERCIAL', name: 'D2D MX + socio US · ejemplo sintético', activeVersionId: 'synthetic-version', archived: false, lifecycleRevision: 0, _count: { versions: 1 }, versions: [
  { id: 'synthetic-version', version: 1, status: 'PUBLISHED', terms, termsChecksum: 'a'.repeat(64), publishedAt: '2026-09-23', publicationNote: 'Ejemplo visual sin publicación real' },
] }
// No passthrough, auth, provider calls or DB. This harness cannot save business data.
window.fetch = async (path, init) => {
  if (path === '/api/v1/partner-bases/synthetic-base/versions/synthetic-version/calculate') {
    try { return new Response(JSON.stringify({ ...calculateThirdPartyCost({ ...terms, ...JSON.parse(String(init?.body)) }), reviewChecksum: 'a'.repeat(64),
      baseLineage: { costBaseId: base.id, versionId: 'synthetic-version', version: 1 } }), { status: 200 }) }
    catch { return new Response(JSON.stringify({ error: 'Revisa el fixture' }), { status: 400 }) }
  }
  return new Response(JSON.stringify({ error: 'Visor local: guardado/publicación bloqueados; no hay persistencia.' }), { status: 403 })
}
function Harness() {
  const [mode, setMode] = useState('read')
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
    <aside className="rounded border border-amber-500 p-3 text-sm">QA LOCAL · DATOS SINTÉTICOS · SIN AUTH/DB · GUARDADO BLOQUEADO</aside>
    <h1 className="text-2xl font-semibold">Bases de costo · Tarifas de socios</h1>
    <label className="grid gap-2">Estado de revisión<select className="min-h-11 rounded border bg-background p-2" value={mode} onChange={event => setMode(event.target.value)}><option value="read">Publicada · administrador</option><option value="new">Nueva base vacía</option><option value="viewer">Publicada · viewer</option><option value="retired">Retirada · administrador</option></select></label>
    {mode === 'new' ? <PartnerBaseEditor /> : <PartnerBaseDetail key={mode} base={mode === 'retired' ? { ...base, archived: true, lifecycleRevision: 1 } : base} role={mode === 'viewer' ? 'VIEWER' : 'ADMIN'} />}
  </main>
}
createRoot(document.getElementById('root')!).render(<Harness />)
