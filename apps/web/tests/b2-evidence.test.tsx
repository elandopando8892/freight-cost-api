import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { B2EvidenceInspector } from '../app/(app)/scenarios/benchmark/evidence/b2-evidence'
import { parseB2Evidence, b2EvidencePath, type EvidenceContext } from '../lib/b2-evidence'
import { fetcher, ClientApiError, sessionExpiredEvent } from '../lib/fetcher'
import { readB2Evidence } from '../../api/src/modules/engine/b2-evidence'
vi.mock('../lib/fetcher', async original => ({ ...await original<typeof import('../lib/fetcher')>(), fetcher: vi.fn() }))
let host: HTMLDivElement, root: Root
const context: EvidenceContext = { cycleId: 'NETWORK_EXPECTED_EMPTY_PROXY', fundingMode: 'CASH' }
const sample = () => readB2Evidence(context, { sub: 'test', orgId: 'org-a' })
async function click() { await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === 'Consultar expediente')!.click() }) }
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.mocked(fetcher).mockReset().mockResolvedValue(sample())
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => root.render(createElement(B2EvidenceInspector)))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
it('starts without network calls, invented amounts or fake persistence', () => {
  expect(fetcher).not.toHaveBeenCalled(); expect(host.textContent).toContain('Sin expediente cargado')
  expect(host.querySelector('textarea')).toBeNull(); expect(host.textContent).not.toContain('260 MXN')
})
it('reads through the existing BFF, real pinned research and null outputs', async () => {
  await click(); expect(vi.mocked(fetcher).mock.calls[0][0]).toBe(b2EvidencePath(context))
  expect(vi.mocked(fetcher).mock.calls[0][1]).toMatchObject({ silent: true, cache: 'no-store' })
  expect(host.textContent).toContain('260 MXN'); expect(host.textContent).toContain('NO adoptado')
  expect(host.textContent).toContain('Delta CVU: pendiente'); expect(host.textContent).toContain('83 fuentes')
  expect(host.querySelector('a')?.href).toBe('https://pensiondetrailers40-5.com/')
})
it.each([401, 403, 409, 500])('clears displayed data and handles HTTP %s without a fixture fallback', async status => {
  await click(); vi.mocked(fetcher).mockRejectedValue(new ClientApiError(status, null, 'error')); await click()
  expect(host.querySelector('[role=alert]')).not.toBeNull(); expect(host.textContent).not.toContain('260 MXN')
})
it.each([sessionExpiredEvent, 'pagehide'])('wipes on %s and prevents further requests', async name => {
  await click(); await act(async () => window.dispatchEvent(new Event(name)))
  expect(host.textContent).not.toContain('260 MXN'); expect(host.querySelector('button')?.disabled).toBe(true)
})
it('invalidates pending responses when context changes', async () => {
  let finish!: (v: unknown) => void
  vi.mocked(fetcher).mockImplementation(() => new Promise(resolve => { finish = resolve }) as ReturnType<typeof fetcher>)
  await click()
  await act(async () => { const el = host.querySelector('select')!; el.value = 'DEDICATED_EMPTY_SAME_BOX_RETURN'; el.dispatchEvent(new Event('change', { bubbles: true })) })
  await act(async () => finish(sample()))
  expect(host.textContent).not.toContain('260 MXN'); expect(host.textContent).toContain('Sin expediente cargado')
})
it('fails closed on account changes and does not retain prior data', async () => {
  await click(); const other = sample(); other.scope.orgId = 'org-b'; vi.mocked(fetcher).mockResolvedValue(other); await click()
  expect(host.textContent).toContain('Cambió la cuenta'); expect(host.textContent).not.toContain('260 MXN')
})
it('rejects mismatched context, numeric outputs, unsafe source URLs and adopted data', () => {
  for (const change of [(p: ReturnType<typeof sample>) => { p.case.fundingMode = 'FINANCED' }, (p: ReturnType<typeof sample>) => { Reflect.set(p.case.outputs, 'cvuUsd', 0) },
    (p: ReturnType<typeof sample>) => { p.case.rows[0].sources[0].url = 'javascript:alert(1)' }, (p: ReturnType<typeof sample>) => { Reflect.set(p, 'adoptedValues', 1) }]) {
    const p = sample(); change(p); expect(() => parseB2Evidence(p, context)).toThrow()
  }
})
it('shows empty filters rather than a hidden stale inspector', async () => {
  await click(); await act(async () => { const input = host.querySelector('input')!; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'no match'); input.dispatchEvent(new Event('input', { bubbles: true })) })
  expect(host.textContent).toContain('No hay conceptos'); expect(host.textContent).not.toContain('260 MXN')
})
