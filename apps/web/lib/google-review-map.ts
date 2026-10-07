import type { RouteCandidate } from './google-route-review'

// Minimal adapter contract around the provider's native GeoJSON Data layer; no route decoder or SDK dependency.
export type ReviewMap = { show: (candidate: RouteCandidate) => void; clear: () => void; destroy: () => void }
type MapsApi = {
  Map: new (element: HTMLElement, options: object) => { data: Data; fitBounds: (bounds: unknown) => void },
  LatLngBounds: new () => { extend: (point: { lat: number; lng: number }) => void },
  event: { clearInstanceListeners: (instance: unknown) => void; addListenerOnce: (instance: unknown, name: string, callback: () => void) => { remove: () => void } },
}
type Data = { addGeoJson: (data: object) => unknown; setStyle: (style: object) => void; forEach: (callback: (feature: unknown) => void) => void; remove: (feature: unknown) => void }
type MapsWindow = Window & { google?: { maps: MapsApi }; fcmGoogleMapsReady?: () => void; gm_authFailure?: () => void }
let sdkPromise: Promise<MapsApi> | null = null

export function loadReviewMaps(browserKey: string): Promise<MapsApi> {
  if (!/^AIza[A-Za-z0-9_-]{35}$/.test(browserKey)) return Promise.reject(new Error('BROWSER_KEY_REQUIRED'))
  if (sdkPromise) return sdkPromise
  const w = window as MapsWindow
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps)
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => fail(), 15000)
    const fail = () => { window.clearTimeout(timeout); delete w.fcmGoogleMapsReady; reject(new Error('MAP_UNAVAILABLE')) }
    w.fcmGoogleMapsReady = () => {
      window.clearTimeout(timeout); delete w.fcmGoogleMapsReady
      if (w.google?.maps?.Map) resolve(w.google.maps); else reject(new Error('MAP_UNAVAILABLE'))
    }
    const url = new URL('https://maps.googleapis.com/maps/api/js')
    url.search = new URLSearchParams({ key: browserKey, loading: 'async', callback: 'fcmGoogleMapsReady', v: 'quarterly', language: 'es', auth_referrer_policy: 'origin' }).toString()
    script.src = url.toString(); script.async = true; script.onerror = fail
    document.head.append(script)
  })
  // Failed SDK load stays rejected: rerender/click cannot trigger a retry.
  return sdkPromise
}

export async function createReviewMap(element: HTMLElement, browserKey: string): Promise<ReviewMap> {
  const maps = await loadReviewMaps(browserKey)
  const map = new maps.Map(element, { center: { lat: 33, lng: -98 }, zoom: 5, streetViewControl: false, mapTypeControl: false, fullscreenControl: false })
  const w = window as MapsWindow, priorAuthFailure = w.gm_authFailure
  // SDK callback alone does not establish a rendered/authorized map. Wait for first tiles;
  // known authorization failure or no tiles aborts BEFORE asking the backend for a route.
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => finish(false), 15000)
      const listener = maps.event.addListenerOnce(map, 'tilesloaded', () => finish(true))
      const authFailure = () => { priorAuthFailure?.(); finish(false) }
      w.gm_authFailure = authFailure
      function finish(ok: boolean) {
        window.clearTimeout(timer); listener.remove()
        if (w.gm_authFailure === authFailure) w.gm_authFailure = priorAuthFailure
        if (ok) resolve(); else reject(new Error('MAP_UNAVAILABLE'))
      }
    })
  } catch {
    maps.event.clearInstanceListeners(map); element.replaceChildren(); throw new Error('MAP_UNAVAILABLE')
  }
  map.data.setStyle({ strokeColor: '#ea5e27', strokeWeight: 5 })
  const clear = () => { map.data.forEach(feature => map.data.remove(feature)) }
  let destroyed = false
  return {
    show(candidate) {
      if (destroyed) return
      clear()
      map.data.addGeoJson({ type: 'Feature', properties: {}, geometry: candidate.observations.geometry })
      const bounds = new maps.LatLngBounds()
      candidate.observations.geometry.coordinates.forEach(([lng, lat]) => bounds.extend({ lat, lng }))
      map.fitBounds(bounds)
    },
    clear,
    destroy() { if (destroyed) return; destroyed = true; clear(); maps.event.clearInstanceListeners(map.data); maps.event.clearInstanceListeners(map); element.replaceChildren() },
  }
}
