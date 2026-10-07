import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BenchmarkCalculator } from '../app/(app)/scenarios/benchmark/benchmark-calculator'
import { emptyForm, type FormNode } from '../app/(app)/scenarios/benchmark/benchmark-form'
import { fetcher, ClientApiError, sessionExpiredEvent } from '../lib/fetcher'
import { webcrypto } from 'node:crypto'
import { createBenchmarkDossier, MAX_DOSSIER_BYTES } from '../lib/benchmark-dossier'
import sample from './visual/benchmark-sample.json'
import formSchema from './visual/benchmark-form-schema.json'
import { readB2Evidence } from '../../api/src/modules/engine/b2-evidence'
// Projection of the real capture fields exercised here, not a new product schema.
type CalculatorCapture = {
  fixed: { capital: { acquisitionCost: { value: number | '' } } }
  route: { direction: string; mx: { parameters: { parameters: Array<{ key: string; value: number | '' }> } } }
}
vi.mock('../lib/fetcher', async original => ({ ...await original<typeof import('../lib/fetcher')>(), fetcher: vi.fn() }))
let host: HTMLDivElement, root: Root
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('crypto', webcrypto)
  vi.mocked(fetcher).mockReset().mockResolvedValue(formSchema)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => root.render(createElement(BenchmarkCalculator)))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
async function direction() {
  await act(async () => {
    const el = host.querySelector('select')!
    el.value = 'MX_TO_US'; el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
async function click(label: string) { await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === label)!.click() }) }
it('starts without JSON or seeded numeric values', () => {
  expect(host.querySelector('textarea')).toBeNull()
  expect([...host.querySelectorAll('input[type="number"]')].every(el => (el as HTMLInputElement).value === '')).toBe(true)
  expect(host.textContent).not.toContain('967.89')
  const value = emptyForm(formSchema as FormNode) as CalculatorCapture
  expect(value.fixed.capital.acquisitionCost.value).toBe('')
  expect(value.route.mx.parameters.parameters[0].value).toBe('')
  expect(value.route.mx.parameters.parameters[0].key).not.toBe('')
})
it('opens and closes existing B2 evidence without navigation, request or lost capture', async () => {
  await direction(); const count = vi.mocked(fetcher).mock.calls.length
  await click('Consultar evidencia pública B2')
  expect(host.querySelector('[aria-controls="b2-inline-evidence"]')?.getAttribute('aria-expanded')).toBe('true')
  expect(host.querySelectorAll('h1')).toHaveLength(1)
  expect(vi.mocked(fetcher).mock.calls.length).toBe(count)
  await click('Ocultar evidencia B2')
  expect(host.querySelector('select')!.value).toBe('MX_TO_US')
  expect(host.querySelector('[aria-controls="b2-inline-evidence"]')?.getAttribute('aria-expanded')).toBe('false')
  expect(vi.mocked(fetcher).mock.calls.length).toBe(count)
})
it('consults via BFF without adopting comparative amounts and preserves calculated results', async () => {
  await direction()
  vi.mocked(fetcher).mockImplementation(async path => path.includes('/b2-evidence')
    ? readB2Evidence({ cycleId: 'NETWORK_EXPECTED_EMPTY_PROXY', fundingMode: 'CASH' }, { sub: 'test', orgId: 'fixture' }) as never : sample as never)
  await click('Calcular escenarios'); await click('Consultar evidencia pública B2'); await click('Consultar expediente')
  expect(host.textContent).toContain('NO adoptado')
  expect(host.textContent).toContain('Total calculado')
  await click('Ocultar evidencia B2')
  expect(host.textContent).toContain('Total calculado')
  expect(host.querySelector('select')!.value).toBe('MX_TO_US')
  const writes = vi.mocked(fetcher).mock.calls.filter(call => call[1]?.method === 'POST')
  expect(writes).toHaveLength(1)
  expect((writes[0][1]!.json as CalculatorCapture).fixed.capital.acquisitionCost.value).toBe('')
})
it('drops late inline evidence and closes it on session expiry', async () => {
  await direction(); await click('Consultar evidencia pública B2')
  let finish!: (value: unknown) => void
  vi.mocked(fetcher).mockImplementation(() => new Promise(resolve => { finish = resolve }) as never)
  await click('Consultar expediente'); await click('Ocultar evidencia B2')
  await act(async () => finish(readB2Evidence({ cycleId: 'NETWORK_EXPECTED_EMPTY_PROXY', fundingMode: 'CASH' }, { sub: 'test', orgId: 'fixture' })))
  expect(host.textContent).not.toContain('260 MXN')
  expect(host.querySelector('select')!.value).toBe('MX_TO_US')
  await click('Consultar evidencia pública B2')
  await act(async () => window.dispatchEvent(new Event(sessionExpiredEvent)))
  expect(host.querySelector('#b2-inline-evidence')?.children).toHaveLength(0)
  expect(host.querySelector<HTMLInputElement>('[aria-label="Fecha compartida del servicio"]')).toBeNull()
  expect(host.querySelector<HTMLButtonElement>('[aria-controls="b2-inline-evidence"]')?.disabled).toBe(true)
})
it('starts the confirmed business case without inventing prices, FX or departure date', async () => {
  await click('Iniciar caso México–Fort Smith')
  expect(host.querySelector('select')!.value).toBe('MX_TO_US')
  expect(host.textContent).toContain('misma caja seca 53′')
  expect(host.querySelector<HTMLInputElement>('[aria-label="Fecha compartida del servicio"]')!.value).toBe('')
  expect(vi.mocked(fetcher).mock.calls.some(c => c[1]?.method === 'POST')).toBe(false)
})
it('sends structured inputs with blank amounts distinct from zero', async () => {
  await direction(); vi.mocked(fetcher).mockResolvedValue(sample)
  await click('Calcular escenarios')
  const call = vi.mocked(fetcher).mock.calls.find(c => c[1]?.method === 'POST')!
  expect(call[0]).toBe('/api/v1/engine/benchmark-owned-d2d')
  const input = call[1]!.json as CalculatorCapture
  expect(input.route.direction).toBe('MX_TO_US')
  expect(input.fixed.capital.acquisitionCost.value).toBe('')
  expect(host.textContent).toContain('Total calculado')
})
it('retains data across sections and clears it on reset', async () => {
  await direction(); await click('2. Capital y costos fijos'); await click('1. Ruta y tramos')
  expect(host.querySelector('select')!.value).toBe('MX_TO_US')
  await click('Limpiar'); expect(host.querySelector('select')!.value).toBe('')
})
it('discards late response after clear', async () => {
  await direction()
  let resolve!: (value: unknown) => void
  vi.mocked(fetcher).mockImplementation((path) => path.endsWith('/form') ? Promise.resolve(formSchema) as never : new Promise(r => { resolve = r }) as never)
  await click('Calcular escenarios'); await click('Limpiar')
  await act(async () => resolve(sample))
  expect(host.textContent).not.toContain('967.89')
})
it('reports server field paths and never keeps old totals', async () => {
  await direction()
  vi.mocked(fetcher).mockRejectedValue(new ClientApiError(400, { issues: [{ field: 'fixed.capital.acquisitionCost.value', message: 'Required' }] }, 'Invalid'))
  await click('Calcular escenarios')
  expect(host.querySelector('[role="alert"]')!.textContent).toContain('fixed.capital.acquisitionCost.value')
  expect(host.textContent).not.toContain('Total calculado')
})
it('clears captured fields on session expiry without a fetch loop', async () => {
  await direction(); const count = vi.mocked(fetcher).mock.calls.length
  await act(async () => window.dispatchEvent(new Event(sessionExpiredEvent)))
  expect(host.querySelector('input')).toBeNull()
  expect(host.textContent).toContain('Sesión vencida')
  expect(vi.mocked(fetcher).mock.calls.length).toBe(count)
})
async function choose(text: string, size = new TextEncoder().encode(text).length) {
  const file = { size, text: async () => text }
  await act(async () => {
    const el = host.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(el, 'files', { value: [file], configurable: true })
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
async function dossier() {
  const value = emptyForm(formSchema as FormNode) as CalculatorCapture
  value.route.direction = 'MX_TO_US'
  return createBenchmarkDossier(value, formSchema as FormNode)
}
async function settleFileOperation() {
  // WebCrypto completes off the React event stack. Flush each actual completion,
  // rather than assuming a click's microtasks include native crypto work.
  await vi.waitFor(async () => {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)) })
    expect(host.textContent).not.toContain('Verificando acceso y expediente…')
  })
}
it('exports inputs only using current permission and never a stored total', async () => {
  await direction()
  const objects: Blob[] = []
  const liveUrls = new Set<string>()
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = vi.fn(blob => { objects.push(blob as Blob); liveUrls.add('blob:dossier'); return 'blob:dossier' })
  URL.revokeObjectURL = vi.fn(url => { liveUrls.delete(url) })
  const anchor = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  try {
    await click('Guardar expediente')
    await settleFileOperation()
    expect(objects).toHaveLength(1)
    expect(anchor).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('Archivo generado para guardar en tu equipo')
    expect(vi.mocked(fetcher).mock.calls.filter(c => c[0].endsWith('/form'))).toHaveLength(2)
    expect(vi.mocked(fetcher).mock.calls.some(c => c[1]?.method === 'POST')).toBe(false)
  } finally {
    // The component schedules a delayed release. Finish that owned side effect
    // before restoring JSDOM's missing URL API, even when another assertion fails.
    try { await vi.waitFor(() => { expect(liveUrls.size).toBe(0) }, { timeout: 2000 }) }
    finally { anchor.mockRestore(); URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke }
  }
  expect(liveUrls.size).toBe(0)
})
it('reopens after remount, asks before replacing, and recalculates rather than trusting totals', async () => {
  const saved = await dossier()
  await direction()
  vi.mocked(fetcher).mockImplementation(async path => path.endsWith('/form') ? formSchema : sample as never)
  await click('Calcular escenarios')
  expect(host.textContent).toContain('Total calculado')
  await act(async () => { root.unmount(); root = createRoot(host); root.render(createElement(BenchmarkCalculator)) })
  expect(host.textContent).not.toContain('Total calculado')
  await choose(saved)
  await settleFileOperation()
  expect(host.querySelector('select')!.value).toBe('')
  await click('Reemplazar expediente')
  expect(host.querySelector('select')!.value).toBe('MX_TO_US')
  expect(host.textContent).not.toContain('Total calculado')
  expect(host.textContent).toContain('pulsa Calcular escenarios')
  const count = vi.mocked(fetcher).mock.calls.filter(c => c[1]?.method === 'POST').length
  await click('Calcular escenarios')
  expect(vi.mocked(fetcher).mock.calls.filter(c => c[1]?.method === 'POST')).toHaveLength(count + 1)
  expect(host.textContent).toContain('Total calculado')
})
it('cancels replacement and preserves captured values', async () => {
  await direction(); await choose(await dossier()); await settleFileOperation(); await click('Cancelar apertura')
  expect(host.querySelector('select')!.value).toBe('MX_TO_US')
  expect(host.textContent).toContain('Apertura cancelada')
})
it('refuses oversized/corrupted file and keeps the current capture', async () => {
  await direction(); const count = vi.mocked(fetcher).mock.calls.length
  await choose('{}', MAX_DOSSIER_BYTES + 1)
  expect(vi.mocked(fetcher).mock.calls.length).toBe(count)
  expect(host.textContent).toContain('No se abrió el archivo')
  await choose('{')
  expect(host.querySelector('select')!.value).toBe('MX_TO_US')
  expect(host.querySelector('[aria-label="Confirmar apertura"]')).toBeNull()
})
it('denies file operations on 403 and clears staged input on session expiration', async () => {
  await direction(); vi.mocked(fetcher).mockRejectedValue(new ClientApiError(403, null, 'Forbidden'))
  await click('Guardar expediente')
  expect(host.textContent).toContain('No tienes permiso para guardar')
  vi.mocked(fetcher).mockResolvedValue(formSchema)
  await choose(await dossier())
  await settleFileOperation()
  expect(host.querySelector('[aria-label="Confirmar apertura"]')).not.toBeNull()
  await act(async () => window.dispatchEvent(new Event(sessionExpiredEvent)))
  expect(host.querySelector('[aria-label="Confirmar apertura"]')).toBeNull()
  expect(host.querySelector('input')).toBeNull()
})
it('ignores file response arriving after session invalidation', async () => {
  let resolve!: (value: unknown) => void
  vi.mocked(fetcher).mockImplementation(() => new Promise(r => { resolve = r }) as never)
  await choose(await dossier())
  await act(async () => window.dispatchEvent(new Event(sessionExpiredEvent)))
  await act(async () => resolve(formSchema))
  expect(host.querySelector('[aria-label="Confirmar apertura"]')).toBeNull()
  expect(host.textContent).not.toContain('Archivo verificado')
})
