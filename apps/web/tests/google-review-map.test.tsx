import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { parseRouteCandidate } from '../lib/google-route-review'
const key = `AIza${'x'.repeat(35)}` // synthetic browser key
const raw = { status: 'CANDIDATE_NOT_TRUCK_VALIDATED', provider: 'GOOGLE_MAPS_ROUTES', attribution: 'Google Maps', observations: { distanceKm: 1, driveMinutesWithoutTraffic: 2, geometry: { type: 'LineString', coordinates: [[-100, 30], [-99, 31]] }, commercialTollsUsd: null }, quoteReady: false, truckRouteValidated: false, endpointsConfirmed: false, adoptedValues: 0, handoff: { loadedKm: null, emptyKm: null, cycleDays: null, tollsUsd: null }, displayPolicy: { mapProvider: 'GOOGLE_MAPS', attributionRequired: true, contentPersistence: 'DISABLED_PENDING_APPLICABLE_TERMS_REVIEW' } }
let element: HTMLDivElement
type MapsGlobals = Window & { google?: { maps: ReturnType<typeof maps>['api'] }; gm_authFailure?: () => void; fcmGoogleMapsReady?: () => void }
const mapsWindow = window as MapsGlobals
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); element = document.createElement('div'); document.body.append(element) })
afterEach(() => { element.remove(); document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach(s => s.remove()); delete mapsWindow.google; delete mapsWindow.gm_authFailure; delete mapsWindow.fcmGoogleMapsReady; vi.restoreAllMocks(); vi.useRealTimers() })
function maps() {
  const data = { addGeoJson: vi.fn(), setStyle: vi.fn(), forEach: vi.fn(callback => callback('feature')), remove: vi.fn() }
  const extend = vi.fn(), fitBounds = vi.fn(), clearInstanceListeners = vi.fn(), remove = vi.fn()
  let tiles!: () => void
  const Map = vi.fn(function () { return { data, fitBounds } })
  const api = { Map, LatLngBounds: vi.fn(function () { return { extend } }), event: { clearInstanceListeners, addListenerOnce: vi.fn((_map, name, callback) => { expect(name).toBe('tilesloaded'); tiles = callback; return { remove } }) } }
  return { api, data, extend, fitBounds, clearInstanceListeners, tiles: () => tiles() }
}
it('missing key does not add a Google script', async () => {
  const { loadReviewMaps } = await import('../lib/google-review-map')
  await expect(loadReviewMaps('')).rejects.toThrow('BROWSER_KEY_REQUIRED'); expect(document.querySelector('script[src*="maps.googleapis.com"]')).toBeNull()
})
it('explicit SDK loading is shared and fails closed without retry', async () => {
  const { loadReviewMaps } = await import('../lib/google-review-map')
  const first = loadReviewMaps(key), second = loadReviewMaps(key)
  expect(first).toBe(second); expect(document.querySelectorAll('script[src*="maps.googleapis.com"]')).toHaveLength(1)
  const script = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement
  const url = new URL(script.src); expect(url.searchParams.get('v')).toBe('quarterly'); expect(url.searchParams.get('auth_referrer_policy')).toBe('origin')
  const failed = expect(first).rejects.toThrow('MAP_UNAVAILABLE'); script.dispatchEvent(new Event('error')); await failed
  expect(loadReviewMaps(key)).toBe(first)
})
it('shows native GeoJSON only after initial map tiles, fits lng/lat and removes data/listeners', async () => {
  const m = maps(); mapsWindow.google = { maps: m.api }
  const { createReviewMap } = await import('../lib/google-review-map')
  const pending = createReviewMap(element, key); await Promise.resolve(); await Promise.resolve(); m.tiles()
  const adapter = await pending; adapter.show(parseRouteCandidate(raw))
  expect(m.api.Map).toHaveBeenCalledTimes(1); expect(m.data.addGeoJson).toHaveBeenCalledWith({ type: 'Feature', properties: {}, geometry: raw.observations.geometry })
  expect(m.extend.mock.calls).toEqual([[{ lat: 30, lng: -100 }], [{ lat: 31, lng: -99 }]])
  expect(m.fitBounds).toHaveBeenCalledTimes(1); adapter.clear(); expect(m.data.remove).toHaveBeenCalled(); adapter.destroy(); adapter.destroy(); adapter.show(parseRouteCandidate(raw)); expect(m.data.addGeoJson).toHaveBeenCalledTimes(1)
  expect(m.clearInstanceListeners).toHaveBeenCalledTimes(2)
})
it('map authorization failure clears the map and rejects readiness', async () => {
  const m = maps(); mapsWindow.google = { maps: m.api }
  const { createReviewMap } = await import('../lib/google-review-map')
  const pending = createReviewMap(element, key); const result = expect(pending).rejects.toThrow('MAP_UNAVAILABLE')
  await Promise.resolve(); await Promise.resolve(); mapsWindow.gm_authFailure!(); await result
  expect(m.clearInstanceListeners).toHaveBeenCalled(); expect(m.data.addGeoJson).not.toHaveBeenCalled()
})
it('map tiles timeout cannot return a ready adapter', async () => {
  const m = maps(); mapsWindow.google = { maps: m.api }
  const { createReviewMap } = await import('../lib/google-review-map')
  const pending = createReviewMap(element, key); const result = expect(pending).rejects.toThrow('MAP_UNAVAILABLE')
  await vi.advanceTimersByTimeAsync(15001); await result; expect(m.data.addGeoJson).not.toHaveBeenCalled()
})
