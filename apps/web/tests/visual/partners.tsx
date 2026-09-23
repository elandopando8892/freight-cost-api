import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { PartnerCostForm } from '../../app/(app)/quote/partners/partner-cost-form'
import { calculateThirdPartyCost } from '../../../api/src/modules/engine/third-party-cost'
import { thirdPartyFixture } from '../../../api/tests/fixtures/third-party-cost'
import '../../app/globals.css'

// Browser-only harness: real arithmetic, synthetic in-memory storage, no auth/DB.
const saved = new Map<string, { id: string; version: number; input: Record<string, unknown>; cost: number | null }>()
const intents = new Map<string, { body: string; id: string }>()
window.fetch = async (path, init) => {
  try {
    if (path === '/api/v1/engine/third-party-cost') return new Response(JSON.stringify({ ...calculateThirdPartyCost(JSON.parse(String(init?.body))), reviewChecksum: 'a'.repeat(64) }), { status: 200 })
    if (path !== '/api/v1/partner-cost-estimates') throw new Error('Non-fixture request blocked')
    const body = JSON.parse(String(init?.body))
    const key = new Headers(init?.headers).get('Idempotency-Key')!
    const retry = intents.get(key)
    if (retry && retry.body !== String(init?.body)) return new Response('{}', { status: 409 })
    if (retry) return new Response(JSON.stringify(saved.get(retry.id)), { status: 200 })
    const report = calculateThirdPartyCost(body.input)
    if (report.purchaseCostUsd === null) return new Response('{}', { status: 422 })
    const row = { id: crypto.randomUUID(), version: body.previousId ? saved.get(body.previousId)!.version + 1 : 1, input: report.input, cost: report.purchaseCostUsd }
    saved.set(row.id, row); intents.set(key, { id: row.id, body: String(init?.body) })
    return new Response(JSON.stringify({ id: row.id, version: row.version }), { status: 201 })
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
function Harness() {
  const [opened, setOpened] = useState<string | null>(null)
  const row = opened ? saved.get(opened) : undefined
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6" onClick={event => {
    const link = (event.target as HTMLElement).closest('a')
    const id = link?.getAttribute('href')?.split('/').at(-1)
    if (id && saved.has(id)) { event.preventDefault(); setOpened(id) }
  }}>
  <aside className="border border-amber-500 bg-amber-50 p-3 text-sm text-black">QA LOCAL · DATOS SINTÉTICOS · GUARDADO SIMULADO EN MEMORIA · SIN AUTH/DB · RECARGAR BORRA EL FIXTURE
    <button className="m-2 rounded border p-2" onClick={loadFixture}>Cargar ejemplo sintético</button>
  </aside>
  <header><p className="font-mono text-xs uppercase text-muted-foreground">D2D · viaje sencillo · intercambio</p><h1 className="text-2xl font-semibold">Costos de socios</h1></header>
  {row ? <>
    <h2 className="font-semibold">Versión {row.version} reabierta · {row.cost?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD</h2>
    <PartnerCostForm key={`${row.id}-read`} initialInput={row.input} readOnly />
    <details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Preparar nueva versión</summary>
      <PartnerCostForm key={row.id} initialInput={row.input} previousId={row.id} />
    </details>
  </> : <PartnerCostForm />}
</main>
}
createRoot(document.getElementById('root')!).render(<Harness />)
