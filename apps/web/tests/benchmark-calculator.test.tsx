import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BenchmarkCalculator } from '../app/(app)/scenarios/benchmark/benchmark-calculator'
import { emptyForm, type FormNode } from '../app/(app)/scenarios/benchmark/benchmark-form'
import { fetcher, ClientApiError, sessionExpiredEvent } from '../lib/fetcher'
import sample from './visual/benchmark-sample.json'
import formSchema from './visual/benchmark-form-schema.json'
vi.mock('../lib/fetcher', async original => ({ ...await original<typeof import('../lib/fetcher')>(), fetcher: vi.fn() }))
let host: HTMLDivElement, root: Root
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
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
  const value = emptyForm(formSchema as FormNode) as any
  expect(value.fixed.capital.acquisitionCost.value).toBe('')
  expect(value.route.mx.parameters.parameters[0].value).toBe('')
  expect(value.route.mx.parameters.parameters[0].key).not.toBe('')
})
it('sends structured inputs with blank amounts distinct from zero', async () => {
  await direction(); vi.mocked(fetcher).mockResolvedValue(sample)
  await click('Calcular escenarios')
  const call = vi.mocked(fetcher).mock.calls.find(c => c[1]?.method === 'POST')!
  expect(call[0]).toBe('/api/v1/engine/benchmark-owned-d2d')
  const input = call[1]!.json as any
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
