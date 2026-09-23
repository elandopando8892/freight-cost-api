import { createRoot } from 'react-dom/client'
import { PartnerCostForm } from '../../app/(app)/quote/partners/partner-cost-form'
import { calculateThirdPartyCost } from '../../../api/src/modules/engine/third-party-cost'
import { thirdPartyFixture } from '../../../api/tests/fixtures/third-party-cost'
import '../../app/globals.css'

// Browser-only harness: real arithmetic, synthetic data, no network or authentication.
window.fetch = async (path, init) => {
  if (path !== '/api/v1/engine/third-party-cost') throw new Error('Non-fixture request blocked')
  try {
    return new Response(JSON.stringify(calculateThirdPartyCost(JSON.parse(String(init?.body)))), { status: 200 })
  } catch { return new Response(JSON.stringify({ error: 'Invalid synthetic capture' }), { status: 400 }) }
}
function loadFixture() {
  const entries: [string, string][] = []
  function flatten(value: unknown, prefix = '') {
    if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) flatten(item, prefix ? `${prefix}.${key}` : key)
    } else entries.push([prefix, String(value)])
  }
  flatten(thirdPartyFixture())
  const apply = ([name, value]: [string, string]) => {
    const field = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${name}"]`)
    if (!field) return
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
  }
  entries.filter(([name]) => name.endsWith('.mode')).forEach(apply)
  requestAnimationFrame(() => entries.filter(([name]) => !name.endsWith('.mode')).forEach(apply))
}
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
  <aside className="border border-amber-500 bg-amber-50 p-3 text-sm text-black">QA LOCAL · DATOS SINTÉTICOS · MOTOR REAL EN MEMORIA · SIN AUTH
    <button className="m-2 rounded border p-2" onClick={loadFixture}>Cargar ejemplo sintético</button>
  </aside>
  <header><p className="font-mono text-xs uppercase text-muted-foreground">D2D · viaje sencillo · intercambio</p><h1 className="text-2xl font-semibold">Costos de socios</h1></header>
  <PartnerCostForm />
</main>)
