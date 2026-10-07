'use client'
import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClientApiError, fetcher, sessionExpiredEvent } from '@/lib/fetcher'
import { parseRouteCandidate, parseRouteReviewConfig, routeReviewRequest, type RouteCandidate } from '@/lib/google-route-review'
import { createReviewMap, type ReviewMap } from '@/lib/google-review-map'

export function RouteReview({ browserKey = '' }: { browserKey?: string }) {
  const [origin, setOrigin] = useState('Laredo, TX, USA')
  const [destination, setDestination] = useState('Fort Smith, AR 72916, USA')
  const [intermediates, setIntermediates] = useState('')
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [used, setUsed] = useState(false)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('Sin consulta: el mapa y la ruta no se cargan al entrar.')
  const [candidate, setCandidate] = useState<RouteCandidate | null>(null)
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<ReviewMap | null>(null)
  const generation = useRef(0), busy = useRef(false), attempted = useRef(false)
  const controller = useRef<AbortController | null>(null)
  function clearView() {
    generation.current++; controller.current?.abort(); map.current?.clear(); setCandidate(null); setPending(false); busy.current = false
  }
  useEffect(() => {
    function wipe() {
      generation.current++; controller.current?.abort(); map.current?.destroy(); map.current = null
      busy.current = false; setCandidate(null); setOrigin(''); setDestination(''); setIntermediates(''); setConsent(false); setPending(false); setExpired(true)
    }
    window.addEventListener(sessionExpiredEvent, wipe); window.addEventListener('pagehide', wipe)
    return () => { generation.current++; controller.current?.abort(); map.current?.destroy(); window.removeEventListener(sessionExpiredEvent, wipe); window.removeEventListener('pagehide', wipe) }
  }, [])
  async function query() {
    if (busy.current || attempted.current || !consent || expired || !browserKey) return
    let body: ReturnType<typeof routeReviewRequest>
    try { body = routeReviewRequest(origin, destination, intermediates) }
    catch { setError('Revisa origen, destino e intermedios: hasta 10 puntos distintos, uno por línea.'); return }
    busy.current = true; const current = ++generation.current
    const active = () => generation.current === current
    controller.current = new AbortController()
    setPending(true); setError(''); setCandidate(null)
    try {
      const config = parseRouteReviewConfig(await fetcher('/api/v1/routing/google-basic/config', { cache: 'no-store', silent: true, signal: controller.current.signal }))
      if (!active()) return
      if (!config.enabled || !config.remainingAttempts || config.remainingMapLoads === 0) {
        if (!config.remainingAttempts || config.remainingMapLoads === 0) { attempted.current = true; setUsed(true) }
        setError(!config.enabled ? 'Consulta local desactivada o clave de servidor pendiente. No se cargó Google.' : 'Presupuesto de mapa o API agotado. No se consultó Google.'); return
      }
      // Reserve UI before map creation: failed loading/cancellation never starts a second map or route.
      attempted.current = true; setUsed(true)
      if (config.remainingMapLoads !== undefined) {
        const reservation = await fetcher<{ reserved: boolean }>('/api/v1/routing/google-basic/map-reservation', { method: 'POST', json: body, cache: 'no-store', silent: true, signal: controller.current.signal })
        if (!active()) return
        if (reservation.reserved !== true) throw new Error('INVALID_RESERVATION')
      }
      const created = await createReviewMap(element.current!, browserKey)
      if (!active()) { created.destroy(); return }
      map.current = created
      const raw = await fetcher('/api/v1/routing/google-basic/candidate', { method: 'POST', json: body, cache: 'no-store', silent: true, signal: controller.current.signal })
      if (!active()) return
      const parsed = parseRouteCandidate(raw)
      created.show(parsed); setCandidate(parsed); setNotice('Candidato recibido · sólo esta vista · no guardado ni aprobado.')
    } catch (e) {
      if (!active()) return
      map.current?.clear(); setCandidate(null)
      setError(e instanceof ClientApiError && e.status === 401 ? 'Sesión vencida. Inicia sesión de nuevo.'
        : e instanceof ClientApiError && e.status === 403 ? 'Necesitas rol administrador u operador y organización válida.'
        : e instanceof ClientApiError && e.status === 429 ? 'Tentativa o cuota agotada. No se reintentó.'
        : 'No se pudo mostrar el candidato. Revisa configuración, permisos y conexión; no se reintentó ni adoptó ningún valor.')
    } finally { if (active()) { busy.current = false; setPending(false) } }
  }
  function change(update: () => void) { clearView(); update(); setError(''); setNotice('Captura modificada. No hay ruta vigente en esta vista.') }
  return <div className="grid min-w-0 gap-6">
    <header><p className="font-mono text-xs uppercase tracking-widest text-primary">Revisión de ruta · sólo candidato</p><h1 className="mt-2 text-2xl font-semibold">Tramo US: Laredo → Fort Smith</h1><p className="mt-2 text-sm text-muted-foreground">Mexico, DF → Nuevo Laredo / Laredo → Fort Smith, AR 72916</p></header>
    <p className="max-w-prose text-sm">Inspecciona el trazado antes de completar el viaje. DRIVE no valida restricciones de camión; los domicilios y el puente siguen pendientes.</p>
    <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <section aria-label="Captura del tramo US" className="grid min-w-0 content-start gap-4">
        <label className="grid gap-2 text-sm font-medium">Origen US<Input className="min-h-11" maxLength={240} value={origin} disabled={pending || expired} onChange={e => change(() => setOrigin(e.target.value))} /></label>
        <label className="grid gap-2 text-sm font-medium">Destino US<Input className="min-h-11" maxLength={240} value={destination} disabled={pending || expired} onChange={e => change(() => setDestination(e.target.value))} /></label>
        <label className="grid gap-2 text-sm font-medium">Intermedios opcionales<textarea className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" rows={3} maxLength={2650} value={intermediates} disabled={pending || expired} onChange={e => change(() => setIntermediates(e.target.value))} placeholder="Uno por línea; hasta 10. Sin optimización." /></label>
        {!browserKey && <p role="status" className="border-l-2 border-primary pl-3 text-sm">Falta configurar la clave web restringida de Maps JavaScript. No uses aquí la clave privada de Routes.</p>}
        <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 size-5 shrink-0 accent-[var(--primary)]" type="checkbox" checked={consent} disabled={pending || expired || used} onChange={e => setConsent(e.target.checked)} /><span>Entiendo que se cargará un mapa y se hará una consulta de ruta. Son eventos separados; el saldo gratuito compartido no está verificado.</span></label>
        <div className="flex flex-wrap gap-3"><Button className="min-h-11" disabled={!browserKey || !consent || pending || used || expired} onClick={query}>{pending ? 'Consultando…' : 'Consultar candidato'}</Button><Button className="min-h-11" variant="outline" onClick={() => { clearView(); setError(''); setNotice('Vista borrada. No se restauró la tentativa ni se guardaron datos.') }}>Borrar vista</Button></div>
        {expired && <p role="alert" className="text-sm">Sesión vencida o vista abandonada. Inicia sesión de nuevo; se limpiaron los datos.</p>}
        {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
        <p aria-live="polite" aria-busy={pending} className="text-sm text-muted-foreground">{pending ? 'Comprobando permisos y consultando sin guardar datos…' : notice}</p>
        {used && <p className="text-xs text-muted-foreground">Una tentativa por vista e instancia local de API; recargar no devuelve el cupo del servidor. No es un límite mensual de cuenta.</p>}
      </section>
      <section aria-label="Mapa y observaciones" className="min-w-0">
        <div className="relative min-h-80 rounded-md border bg-card">
          <div ref={element} className="h-80 w-full md:h-[400px]" aria-label="Mapa Google del candidato" />
          {!candidate && !pending && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"><MapPin className="size-8 text-primary" aria-hidden="true" /><h2 className="font-semibold">El mapa aparece al consultar</h2><p className="max-w-xs text-sm text-muted-foreground">Sin consulta automática. No dibujamos un itinerario supuesto.</p></div>}
        </div>
        {candidate && <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-4 border-b pb-4"><div><p className="text-sm text-muted-foreground">Distancia observada</p><p className="mt-1 font-mono text-lg">{candidate.observations.distanceKm.toLocaleString('es-MX', { maximumFractionDigits: 2 })} km</p></div><div><p className="text-sm text-muted-foreground">Tiempo sin tráfico</p><p className="mt-1 font-mono text-lg">{candidate.observations.driveMinutesWithoutTraffic.toLocaleString('es-MX', { maximumFractionDigits: 0 })} min</p></div></div>}
        <dl className="mt-4 grid gap-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>Restricciones de camión</dt><dd>Sin validar</dd></div><div className="flex flex-wrap justify-between gap-2"><dt>Peajes comerciales US</dt><dd>Pendientes, no cero</dd></div><div className="flex flex-wrap justify-between gap-2"><dt>Domicilios / punto de cruce</dt><dd>Sin confirmar</dd></div></dl>
      </section>
    </div>
    <footer className="border-t pt-4 text-sm text-muted-foreground">No se guarda el resultado ni se alimentan CFU/CVU, kilómetros cargados/vacíos, ciclo o peajes. La ruta no está lista para cotizar.</footer>
  </div>
}
