import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RouteReview } from '../app/(app)/scenarios/benchmark/route-review/route-review'
import { parseRouteCandidate, routeReviewRequest } from '../lib/google-route-review'
import { createReviewMap } from '../lib/google-review-map'
import { fetcher, ClientApiError, sessionExpiredEvent } from '../lib/fetcher'
vi.mock('../lib/fetcher', async original => ({ ...await original<typeof import('../lib/fetcher')>(), fetcher: vi.fn() }))
vi.mock('../lib/google-review-map', () => ({ createReviewMap: vi.fn() }))
export const syntheticCandidate = {
  status: 'CANDIDATE_NOT_TRUCK_VALIDATED', provider: 'GOOGLE_MAPS_ROUTES', attribution: 'Google Maps',
  observations: { distanceKm: 1, driveMinutesWithoutTraffic: 2, geometry: { type: 'LineString', coordinates: [[-100, 30], [-99, 31]] }, commercialTollsUsd: null },
  quoteReady: false, truckRouteValidated: false, endpointsConfirmed: false, adoptedValues: 0,
  handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null },
  displayPolicy: { mapProvider: 'GOOGLE_MAPS', attributionRequired: true, contentPersistence: 'DISABLED_PENDING_APPLICABLE_TERMS_REVIEW' },
}
const config = { enabled: true, remainingAttempts: 1, policy: 'LOCAL_TRANSIENT_REVIEW_ONLY', quoteReady: false }
let host: HTMLDivElement, root: Root
const map = { show: vi.fn(), clear: vi.fn(), destroy: vi.fn() }
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.clearAllMocks()
  vi.mocked(createReviewMap).mockResolvedValue(map)
  vi.mocked(fetcher).mockImplementation(async path => path.endsWith('/config') ? config : syntheticCandidate)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals() })
async function mount(key = 'synthetic-browser-key') { await act(async () => root.render(createElement(RouteReview, { browserKey: key }))) }
async function consent() { await act(async () => (host.querySelector('input[type="checkbox"]') as HTMLInputElement).click()) }
async function click(label: string) { await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent === label)!.click() }) }
it('mount/without key and consent never loads maps, provider or storage', async () => {
  await mount(''); await consent(); await click('Consultar candidato')
  expect(fetcher).not.toHaveBeenCalled(); expect(createReviewMap).not.toHaveBeenCalled()
  expect(host.textContent).toContain('Falta configurar'); expect(host.textContent).toContain('Pendientes, no cero')
  expect(host.querySelectorAll('input')[0].value).toBe('Laredo, TX, USA')
})
it('manual query checks permissions before map, renders only candidate and never persists it', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem')
  await mount(); await consent(); await click('Consultar candidato')
  expect(vi.mocked(fetcher).mock.calls.map(c => c[0])).toEqual(['/api/v1/routing/google-basic/config', '/api/v1/routing/google-basic/candidate'])
  expect(vi.mocked(fetcher).mock.calls[1][1]).toMatchObject({ method: 'POST', cache: 'no-store', json: { acknowledgeUsage: true, request: { candidateOnly: true, truckRouteValidated: false } } })
  expect(map.show).toHaveBeenCalledTimes(1); expect(host.textContent).toContain('1 km'); expect(host.textContent).toContain('2 min'); expect(host.textContent).toContain('no guardado')
  expect(storage).not.toHaveBeenCalled(); storage.mockRestore()
})
it('double click and clear cannot requery; remount does not restore geometry', async () => {
  await mount(); await consent(); await act(async () => { const b = [...host.querySelectorAll('button')].find(b => b.textContent === 'Consultar candidato')!; b.click(); b.click() })
  expect(createReviewMap).toHaveBeenCalledTimes(1); expect(fetcher).toHaveBeenCalledTimes(2)
  await click('Borrar vista'); expect(host.textContent).not.toContain('1 km'); expect(map.clear).toHaveBeenCalled()
  await click('Consultar candidato'); expect(fetcher).toHaveBeenCalledTimes(2)
  await act(async () => root.render(createElement(RouteReview, { key: 'other-account', browserKey: 'synthetic-browser-key' })))
  expect(host.textContent).not.toContain('1 km'); expect(map.destroy).toHaveBeenCalled(); expect(createReviewMap).toHaveBeenCalledTimes(1)
})
it.each([401, 403, 429, 503])('permission/config failure %s does not load map', async status => {
  vi.mocked(fetcher).mockRejectedValue(new ClientApiError(status, null, 'secret provider text'))
  await mount(); await consent(); await click('Consultar candidato')
  expect(createReviewMap).not.toHaveBeenCalled(); expect(host.textContent).not.toContain('secret provider text'); expect(map.show).not.toHaveBeenCalled()
})
it.each([{ ...config, enabled: false }, { ...config, remainingAttempts: 0 }])('disabled/exhausted config never loads Google', async c => {
  vi.mocked(fetcher).mockResolvedValue(c); await mount(); await consent(); await click('Consultar candidato')
  expect(createReviewMap).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(1)
})
it('invalid input fails before config or map', async () => {
  await mount(); await act(async () => {
    const input = host.querySelector('textarea')!; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'Laredo, TX, USA'); input.dispatchEvent(new Event('input', { bubbles: true }))
  }); await consent(); await click('Consultar candidato')
  expect(fetcher).not.toHaveBeenCalled(); expect(createReviewMap).not.toHaveBeenCalled(); expect(host.textContent).toContain('puntos distintos')
})
it('failed SDK never queries Routes or retries', async () => {
  vi.mocked(createReviewMap).mockRejectedValue(new Error('SDK FAILED')); await mount(); await consent(); await click('Consultar candidato'); await click('Consultar candidato')
  expect(fetcher).toHaveBeenCalledTimes(1); expect(createReviewMap).toHaveBeenCalledTimes(1); expect(host.textContent).not.toContain('SDK FAILED')
})
it('expired session wipes capture/geometry and rejects late route', async () => {
  let resolve!: (v: unknown) => void
  vi.mocked(fetcher).mockImplementation(path => path.endsWith('/config') ? Promise.resolve(config) as never : new Promise(r => { resolve = r }) as never)
  await mount(); await consent(); await click('Consultar candidato')
  await act(async () => window.dispatchEvent(new Event(sessionExpiredEvent)))
  await act(async () => resolve(syntheticCandidate))
  expect(map.destroy).toHaveBeenCalled(); expect(map.show).not.toHaveBeenCalled(); expect(host.querySelector('input')!.value).toBe(''); expect(host.textContent).toContain('Sesión vencida')
})
it('clear discards late candidate without restoring the attempt', async () => {
  let resolve!: (v: unknown) => void
  vi.mocked(fetcher).mockImplementation(path => path.endsWith('/config') ? Promise.resolve(config) as never : new Promise(r => { resolve = r }) as never)
  await mount(); await consent(); await click('Consultar candidato'); await click('Borrar vista'); await act(async () => resolve(syntheticCandidate))
  expect(map.show).not.toHaveBeenCalled(); expect(host.textContent).not.toContain('1 km')
})
it('late map initialization after leaving is destroyed without querying Routes', async () => {
  let resolve!: (v: typeof map) => void
  vi.mocked(createReviewMap).mockImplementation(() => new Promise(r => { resolve = r }))
  await mount(); await consent(); await click('Consultar candidato'); await act(async () => window.dispatchEvent(new Event('pagehide'))); await act(async () => resolve(map))
  expect(fetcher).toHaveBeenCalledTimes(1); expect(map.destroy).toHaveBeenCalled(); expect(map.show).not.toHaveBeenCalled()
})
it.each([{ quoteReady: true }, { adoptedValues: 1 }, { truckRouteValidated: true }, { observations: { ...syntheticCandidate.observations, commercialTollsUsd: 0 } }])('rejects promoted response', extra => {
  expect(() => parseRouteCandidate({ ...syntheticCandidate, ...extra })).toThrow()
})
it('normalizes up to ten explicit intermediates and rejects repeats/extra points', () => {
  expect(routeReviewRequest(' Laredo ', ' Fort Smith ', '\n Austin \n Dallas\n').request.intermediates).toEqual(['Austin', 'Dallas'])
  expect(() => routeReviewRequest('Laredo', 'Fort Smith', 'laredo')).toThrow()
  expect(() => routeReviewRequest('Laredo', 'Fort Smith', Array.from({ length: 11 }, (_, i) => `Point ${i}`).join('\n'))).toThrow()
})
it('reserves persistent map budget before SDK and Routes',async()=>{
  vi.mocked(fetcher).mockImplementation(async path=>path.endsWith('/config')?{...config,remainingMapLoads:1}:path.endsWith('/map-reservation')?{reserved:true}:syntheticCandidate)
  await mount();await consent();await click('Consultar candidato')
  expect(vi.mocked(fetcher).mock.calls.map(c=>c[0])).toEqual(['/api/v1/routing/google-basic/config','/api/v1/routing/google-basic/map-reservation','/api/v1/routing/google-basic/candidate'])
  expect(createReviewMap).toHaveBeenCalledTimes(1);expect(map.show).toHaveBeenCalledTimes(1)
})
it('exhausted map budget or reservation failure prevents SDK and route consumption',async()=>{
  vi.mocked(fetcher).mockResolvedValue({...config,remainingMapLoads:0})
  await mount();await consent();await click('Consultar candidato')
  expect(createReviewMap).not.toHaveBeenCalled();expect(fetcher).toHaveBeenCalledTimes(1)
  await act(async()=>root.render(createElement(RouteReview,{key:'fresh',browserKey:'synthetic-browser-key'})))
  vi.mocked(fetcher).mockImplementation(async path=>{if(path.endsWith('/config'))return {...config,remainingMapLoads:1};throw new ClientApiError(429,null,'hidden')})
  await consent();await click('Consultar candidato');expect(createReviewMap).not.toHaveBeenCalled();expect(map.show).not.toHaveBeenCalled()
})
