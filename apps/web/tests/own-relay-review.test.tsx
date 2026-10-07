import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OwnRelayReview } from '../app/(app)/cost-bases/own-relay-review'
import { ownRelayPath, parseOwnRelayReview, type RelayContext } from '../lib/own-relay-review'
import { fetcher, ClientApiError, sessionExpiredEvent } from '../lib/fetcher'
import { readOwnRelayReview } from '../../api/src/modules/engine/b2-own-relay-review'

vi.mock('../lib/fetcher', async original => ({ ...await original<typeof import('../lib/fetcher')>(), fetcher: vi.fn() }))
let host: HTMLDivElement, root: Root
const context: RelayContext = { cycleId: 'NETWORK_EXPECTED_EMPTY_PROXY', fundingMode: 'CASH', fxDate: '2026-09-30', restInterpretation: 'RATE_EXCLUDES_WEEKLY_REST' }
const sample = () => readOwnRelayReview(context, { sub: 'test', orgId: 'org-a' })
async function click() { await act(async () => { host.querySelector('button')!.click() }) }
async function select(index: number, value: string) { await act(async () => {
  const el = host.querySelectorAll('select')[index]; el.value = value; el.dispatchEvent(new Event('change', { bubbles: true }))
}) }
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.mocked(fetcher).mockReset().mockResolvedValue(sample())
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  await act(async () => root.render(createElement(OwnRelayReview, { expectedOrgId: 'org-a' })))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
it('starts with explicit review scope, no auto request, prices, mutations or demo fallback', () => {
  expect(fetcher).not.toHaveBeenCalled(); expect(host.textContent).toContain('Sin revisión cargada')
  expect(host.textContent).toContain('no el costo de esta empresa'); expect(host.querySelector('textarea')).toBeNull()
})
it('shows one box and CFU/CVU from the existing reader, retaining non-commercial limitations', async () => {
  await click(); expect(fetcher).toHaveBeenCalledWith(ownRelayPath(context), expect.objectContaining({ cache: 'no-store', silent: true }))
  expect(host.textContent).toContain('Tractor México'); expect(host.textContent).toContain('Tractor EE. UU.'); expect(host.textContent).toContain('Caja compartida (1)')
  expect(host.textContent).toContain('88 fuentes fijadas'); expect(host.textContent).toContain('Compra y venta: no calculadas')
  expect(host.querySelectorAll('tbody tr')).toHaveLength(3); expect(host.querySelector('a')?.href.startsWith('https:')).toBe(true)
  expect(host.querySelectorAll('button')).toHaveLength(1)
})
it('reloads deterministically with the same fingerprint, without saves or adoption', async () => {
  await click(); const before = host.querySelector('table')!.textContent; await click()
  expect(vi.mocked(fetcher).mock.calls[1][0]).toBe(ownRelayPath(context, sample().sha256))
  expect(host.querySelector('table')!.textContent).toBe(before)
  expect(vi.mocked(fetcher).mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true)
})
it.each([401, 403, 409, 500])('clears results on HTTP %s; no fallback', async status => {
  await click(); vi.mocked(fetcher).mockRejectedValue(new ClientApiError(status, null, 'error')); await click()
  expect(host.querySelector('table')).toBeNull(); expect(host.querySelector('[role=alert]')).not.toBeNull()
})
it.each([sessionExpiredEvent, 'pagehide'])('wipes and blocks requests after %s', async name => {
  await click(); await act(async () => window.dispatchEvent(new Event(name)))
  expect(host.querySelector('table')).toBeNull(); expect(host.querySelector('button')!.disabled).toBe(true)
})
it.each([[0, 'DEDICATED_EMPTY_SAME_BOX_RETURN'], [1, 'FINANCED'], [2, '2026-09-28'], [3, 'RATE_INCLUDES_WEEKLY_REST']])('clears displayed figures when selection %s changes', async (index, value) => {
  await click(); await select(index as number, value as string)
  expect(host.querySelector('table')).toBeNull(); expect(host.textContent).toContain('Sin revisión cargada')
})
it('ignores late responses for a previous selection', async () => {
  let finish!: (v: unknown) => void
  vi.mocked(fetcher).mockImplementation(() => new Promise(resolve => { finish = resolve }) as ReturnType<typeof fetcher>)
  await click(); await select(1, 'FINANCED'); await act(async () => finish(sample()))
  expect(host.querySelector('table')).toBeNull()
})
it('does not retain data after a same-org account change', async () => {
  await click(); const other = sample(); other.scope.sub = 'other'; vi.mocked(fetcher).mockResolvedValue(other); await click()
  expect(host.querySelector('table')).toBeNull(); expect(host.textContent).toContain('Cambió la cuenta')
  expect(host.querySelector('button')!.disabled).toBe(true)
})
it('rejects wrong company/context, numeric commercial outputs, unsafe sources and missing provenance', () => {
  for (const mutate of [(v: ReturnType<typeof sample>) => { v.scope.orgId = 'other' }, (v: ReturnType<typeof sample>) => { v.case.fundingMode = 'FINANCED' },
    (v: ReturnType<typeof sample>) => { Reflect.set(v.case.outputs, 'purchaseUsd', 1) }, (v: ReturnType<typeof sample>) => { v.evidence[0].url = 'javascript:alert(1)' },
    (v: ReturnType<typeof sample>) => { v.evidence = [] }, (v: ReturnType<typeof sample>) => { Reflect.set(v, 'quoteReady', true) }]) {
    const v = sample(); mutate(v); expect(() => parseOwnRelayReview(v, context, 'org-a')).toThrow()
  }
})
