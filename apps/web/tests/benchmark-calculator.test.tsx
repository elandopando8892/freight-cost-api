import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BenchmarkCalculator } from '../app/(app)/scenarios/benchmark/benchmark-calculator'
import { fetcher, ClientApiError } from '../lib/fetcher'
import sample from './visual/benchmark-sample.json'
vi.mock('../lib/fetcher', async original => ({ ...await original<typeof import('../lib/fetcher')>(), fetcher: vi.fn() }))
let host: HTMLDivElement, root: Root
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.mocked(fetcher).mockReset()
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => root.render(createElement(BenchmarkCalculator)))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
async function fill(value: string) {
  await act(async () => {
    const el = host.querySelector('textarea')!
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function click(label: string) { await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === label)!.click() }) }
it('starts empty and never seeds synthetic amounts', () => {
  expect(host.querySelector('textarea')!.value).toBe('')
  expect(host.querySelector('button')!.disabled).toBe(true)
  expect(host.textContent).not.toContain('967.89')
})
it('sends original inputs through BFF and renders computed results', async () => {
  vi.mocked(fetcher).mockResolvedValue(sample)
  await fill('{"route":{},"fixed":{},"trailer":{}}'); await click('Calcular escenarios')
  expect(fetcher).toHaveBeenCalledWith('/api/v1/engine/benchmark-owned-d2d', expect.objectContaining({ method: 'POST', json: { route: {}, fixed: {}, trailer: {} } }))
  expect(host.textContent).toContain('Total calculado'); expect(host.textContent).toContain('967.89')
  await fill('{}'); expect(host.textContent).not.toContain('967.89')
})
it('rejects malformed inputs without network', async () => {
  await fill('{'); await click('Calcular escenarios')
  expect(fetcher).not.toHaveBeenCalled(); expect(host.querySelector('[role="alert"]')).not.toBeNull()
})
it('discards a late response after clear', async () => {
  let resolve!: (value: unknown) => void
  vi.mocked(fetcher).mockImplementation(() => new Promise(r => { resolve = r }) as never)
  await fill('{}'); await click('Calcular escenarios')
  expect(host.textContent).toContain('Calculando'); await click('Limpiar')
  await act(async () => resolve(sample))
  expect(host.textContent).not.toContain('967.89'); expect(host.querySelector('textarea')!.value).toBe('')
})
it('reports forbidden access without totals', async () => {
  vi.mocked(fetcher).mockRejectedValue(new ClientApiError(403, null, 'Forbidden'))
  await fill('{}'); await click('Calcular escenarios')
  expect(host.querySelector('[role="alert"]')!.textContent).toContain('administrador u operador')
  expect(host.textContent).not.toContain('Total calculado')
})
it('renders incomplete server result without totals', async () => {
  vi.mocked(fetcher).mockResolvedValue({ ...sample, status: 'INCOMPLETE', scenarios: null, issues: [{ field: 'capital', code: 'MISSING' }] })
  await fill('{}'); await click('Calcular escenarios')
  expect(host.textContent).toContain('capital: MISSING'); expect(host.textContent).not.toContain('Total calculado')
})
