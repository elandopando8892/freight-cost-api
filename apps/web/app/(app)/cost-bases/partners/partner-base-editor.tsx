'use client'

import { useRef, useState, type FormEvent } from 'react'
import { fetcher, ClientApiError } from '@/lib/fetcher'
import { Carrier, Field, InitialInput, Notes, Select, Term, PartnerCostForm, partnerCostPayload, type Report } from '../../quote/partners/partner-cost-form'

const button = 'min-h-11 rounded border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50'
const primary = `${button} bg-primary text-primary-foreground`
export type TariffVersion = { id: string; version: number; status: string; terms: Record<string, unknown>;
  termsChecksum: string; publishedAt: string | null; publicationNote: string | null }
export type TariffBase = { id: string; code: string; name: string; activeVersionId: string | null;
  archived: boolean; lifecycleRevision: number;
  lifecycleEvents?: { id: string; revision: number; archived: boolean; actorId: string; note: string; createdAt: string }[];
  versions: TariffVersion[]; _count: { versions: number } }
const baseUrl = (id: string) => `/cost-bases/partners?base=${encodeURIComponent(id)}`
const versionUrl = (base: string, version: string) => `/api/v1/partner-bases/${encodeURIComponent(base)}/versions/${encodeURIComponent(version)}`
const message = (error: unknown) => error instanceof ClientApiError && error.status < 500
  ? error.status === 400 ? 'Revisa campos, fechas, referencias e importes. No se guardó la solicitud.'
    : error.status === 401 ? 'La sesión expiró. Inicia sesión nuevamente.' : error.message
  : 'No se pudo confirmar la operación. Reintenta sin cambiar la captura para recuperar el resultado sin duplicarlo.'
const definitive = (error: unknown) => error instanceof ClientApiError && [400, 403, 404, 409, 422].includes(error.status)

export function PartnerBaseEditor({ base, onLock }: { base?: TariffBase; onLock?: (locked: boolean) => void }) {
  const [pending, setPending] = useState(false)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState('')
  const intent = useRef<{ key: string; body: unknown } | null>(null)
  const busy = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current || savedId) return
    const data = new FormData(event.currentTarget)
    const terms = Object.fromEntries(Object.entries(partnerCostPayload(data)).filter(([key]) => key !== 'serviceDate' && key !== 'fx'))
    intent.current ??= { key: crypto.randomUUID(), body: base
      ? { terms, expectedLatestVersionId: base.versions[0].id }
      : { terms, code: String(data.get('code') ?? '').trim(), name: String(data.get('name') ?? '').trim() } }
    busy.current = true; setPending(true); setLocked(true); onLock?.(true); setError('')
    try {
      const row = await fetcher<{ id: string }>(base ? `/api/v1/partner-bases/${base.id}/versions` : '/api/v1/partner-bases', {
        method: 'POST', headers: { 'Idempotency-Key': intent.current.key }, json: intent.current.body, silent: true,
      })
      setSavedId(base?.id ?? row.id); onLock?.(false)
    } catch (caught) {
      setError(message(caught))
      if (definitive(caught)) { intent.current = null; setLocked(false); onLock?.(false) }
    } finally { busy.current = false; setPending(false) }
  }
  return <InitialInput.Provider value={base?.versions[0].terms ?? {}}>
    <form onSubmit={submit} className="space-y-5" aria-label="Editor de tarifas de socios">
      <h2 className="text-xl font-semibold">{base ? 'Preparar nueva revisión' : 'Nueva base de tarifas de socios'}</h2>
      <p className="text-sm text-muted-foreground">Guarda tarifas por ruta y equipo. No se publican automáticamente. Cada guardado crea una revisión; las anteriores se conservan.</p>
      <fieldset disabled={locked} className="min-w-0 space-y-5">
        <legend className="sr-only">Términos reutilizables de la base</legend>
        {!base && <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Código<input name="code" required pattern="[A-Z0-9_-]{2,32}" maxLength={32} className="min-h-11 rounded border bg-background p-2" /><span className="text-xs">2–32 caracteres: mayúsculas, números, guion o guion bajo.</span></label>
          <Field name="name" label="Nombre de la base" minLength={2} maxLength={120} />
        </div>}
        <section className="space-y-4 rounded border bg-card p-4" aria-label="Aplicabilidad de la base">
          <h3 className="font-semibold">Ruta, equipo y responsabilidades</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select name="segment" label="Empresa principal"><option value="" disabled>Elegir</option><option value="D2D_MX_US_PARTNER">Línea mexicana + socio US</option><option value="D2D_US_MX_PARTNER">Línea US + socio mexicano</option></Select>
            <Select name="direction" label="Dirección"><option value="" disabled>Elegir</option><option value="MX_TO_US">México → EE. UU.</option><option value="US_TO_MX">EE. UU. → México</option></Select>
            <Field name="origin" label="Origen" minLength={2} /><Field name="destination" label="Destino" minLength={2} />
            <Field name="equipment" label="Equipo y configuración" minLength={2} /><Field name="mxInterchange" label="Punto de intercambio en MX" minLength={2} />
            <Field name="usInterchange" label="Punto de intercambio en US" minLength={2} />
          </div>
          <Notes name="assumptions" label="Supuestos: carga, tiempos y responsabilidades por tramo" />
        </section>
        <div className="grid gap-4 xl:grid-cols-2"><Carrier name="mex" label="Línea mexicana" /><Carrier name="usa" label="Línea estadounidense" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Term name="crossing" label="Cruce fronterizo" border /><Term name="interchange" label="Intercambio de equipo" border /></div>
        <p className="text-sm text-muted-foreground">Viaje sencillo. Fecha del viaje y FX se capturan al calcular, no forman parte de esta base. Fuentes declaradas, no verificadas.</p>
      </fieldset>
      {error && <p role="alert" className="rounded border border-destructive p-3">{error}</p>}
      {!savedId && <button disabled={pending} className={primary}>{pending ? 'Guardando…' : locked ? 'Reintentar guardado sin duplicar' : 'Guardar borrador'}</button>}
      {savedId && <p role="status">Borrador guardado. <a className="underline" href={baseUrl(savedId)}>Abrir base y revisar publicación</a></p>}
    </form>
  </InitialInput.Provider>
}

export function PartnerBaseCalculator({ baseId, version, onLock }: { baseId: string; version: TariffVersion; onLock?: (locked: boolean) => void }) {
  const [report, setReport] = useState<Report | null>(null)
  const [pending, setPending] = useState(false)
  const [locked, setLocked] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const busy = useRef(false)
  const intent = useRef<{ key: string; body: unknown } | null>(null)
  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current || locked) return
    const data = new FormData(event.currentTarget)
    const trip = { serviceDate: String(data.get('serviceDate') ?? ''),
      ...(data.get('fx.mxnPerUsd') || data.get('fx.source') || data.get('fx.asOf') ? { fx: {
        mxnPerUsd: Number(data.get('fx.mxnPerUsd')), source: String(data.get('fx.source') ?? ''), asOf: String(data.get('fx.asOf') ?? ''),
      } } : {}) }
    busy.current = true; setPending(true); onLock?.(true); setError(''); setReport(null)
    try { setReport(await fetcher<Report>(`${versionUrl(baseId, version.id)}/calculate`, { method: 'POST', json: trip, silent: true })) }
    catch (caught) { setError(message(caught)) }
    finally { busy.current = false; setPending(false); onLock?.(false) }
  }
  async function save() {
    if (!report || busy.current || saved) return
    const { serviceDate, fx } = report.input
    intent.current ??= { key: crypto.randomUUID(), body: { trip: { serviceDate, ...(fx ? { fx } : {}) }, reviewChecksum: report.reviewChecksum } }
    busy.current = true; setPending(true); setLocked(true); onLock?.(true); setError('')
    try {
      const result = await fetcher<{ id: string }>(`${versionUrl(baseId, version.id)}/estimates`, {
        method: 'POST', json: intent.current.body, headers: { 'Idempotency-Key': intent.current.key }, silent: true,
      }); setSaved(result.id); onLock?.(false)
    } catch (caught) {
      setError(message(caught))
      if (definitive(caught)) { intent.current = null; setLocked(false); setReport(null); onLock?.(false) }
    } finally { busy.current = false; setPending(false) }
  }
  return <section className="space-y-4 rounded border bg-card p-5" aria-label="Calcular con versión publicada">
    <h2 className="text-xl font-semibold">Calcular con la base · v{version.version}</h2>
    <p className="text-sm">Tarifas, ruta, equipo y supuestos heredados. La API comprobará que esta versión siga activa y que sus vigencias cubran el viaje.</p>
    <form onSubmit={calculate} onChange={() => setReport(null)}>
      <fieldset disabled={pending || locked} className="space-y-4">
        <legend className="sr-only">Datos del viaje</legend>
        <div className="grid gap-4 sm:grid-cols-2"><Field name="serviceDate" label="Fecha del viaje" type="date" />
          <Field name="fx.mxnPerUsd" label="MXN por 1 USD" type="number" step="0.000001" required={false} />
          <Field name="fx.source" label="Fuente del tipo de cambio" required={false} /><Field name="fx.asOf" label="Fecha del tipo de cambio" type="date" required={false} /></div>
        <button className={primary}>{pending ? 'Calculando…' : 'Calcular costo de compra'}</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="rounded border border-destructive p-3">{error} <a href={baseUrl(baseId)} className="underline">Consultar base actual</a></p>}
    {report && <div role="status" className="space-y-3">
      <h3 className="font-semibold">{report.status === 'INCOMPLETE' ? 'Cálculo incompleto' : 'Costo conocido de compra'}</h3>
      {report.issues.map(issue => <p key={issue.field}>{issue.message}</p>)}
      <dl>{report.lines.map(line => <div key={line.id} className="flex flex-wrap justify-between gap-3 border-b py-2"><dt className="break-words">{line.label} · {line.provider}</dt><dd>{line.usd === null ? 'FX pendiente' : `${line.usd.toLocaleString('es-MX')} USD`}</dd></div>)}</dl>
      {report.purchaseCostUsd !== null && <p className="font-mono text-2xl">{report.purchaseCostUsd.toLocaleString('es-MX', { minimumFractionDigits: 2 })} USD</p>}
      <p className="text-sm">Fuentes declaradas, no verificadas. Excluye: {report.exclusions.join('; ')}.</p>
      <p className="text-sm">Procedencia: versión {report.baseLineage?.version}. No es una cotización de venta.</p>
    </div>}
    {report?.status === 'ESTIMATE' && report.purchaseCostUsd !== null && !saved && <button className={primary} disabled={pending} onClick={save}>{pending ? 'Guardando…' : locked ? 'Reintentar guardado sin duplicar' : 'Guardar estimación'}</button>}
    {saved && <p role="status">Estimación guardada con su base y versión. <a className="underline" href={`/quote/partners/saved/${saved}`}>Abrir resultado guardado</a></p>}
  </section>
}

export function PartnerBaseDetail({ base, role }: { base: TariffBase; role: string }) {
  const [selected, setSelected] = useState(base.versions[0].id)
  const [versions, setVersions] = useState(base.versions)
  const [editing, setEditing] = useState(false)
  const [managing, setManaging] = useState(false)
  const [locked, setLocked] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [published, setPublished] = useState(false)
  const publication = useRef<unknown>(null)
  const busy = useRef(false)
  const version = versions.find(item => item.id === selected)!
  const isActive = base.activeVersionId === version.id
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current || published) return
    const data = new FormData(event.currentTarget)
    publication.current ??= { expectedActiveVersionId: base.activeVersionId, note: String(data.get('note') ?? '') }
    busy.current = true; setPending(true); setLocked(true); setError('')
    try { await fetcher(`${versionUrl(base.id, version.id)}/publish`, { method: 'POST', json: publication.current, silent: true }); setPublished(true) }
    catch (caught) { setError(message(caught)); if (definitive(caught)) { publication.current = null; setLocked(false) } }
    finally { busy.current = false; setPending(false) }
  }
  async function older() {
    if (busy.current) return
    busy.current = true; setPending(true); setError('')
    try {
      const page = await fetcher<{ items: TariffVersion[] }>(`/api/v1/partner-bases/${base.id}/versions?before=${versions.at(-1)!.version}`, { silent: true })
      setVersions(current => [...current, ...page.items])
    } catch (caught) { setError(message(caught)) }
    finally { busy.current = false; setPending(false) }
  }
  return <section className="min-w-0 space-y-5">
    <header className="space-y-2"><h2 className="break-words text-2xl font-semibold">{base.name}</h2><p>{base.code} · Compra a terceros · Viaje sencillo</p>
      <p className="text-sm text-muted-foreground">Referencias declaradas por el usuario, no verificadas con proveedores.</p></header>
    <p className="rounded border bg-card p-4" role="status">{base.archived ? 'Base retirada: sólo consulta histórica. No permite nuevos cálculos, revisiones ni publicaciones.' : 'Base disponible: las vigencias se verifican para cada viaje.'}</p>
    <label className="grid gap-1">Versión<select className="min-h-11 rounded border bg-background p-2" disabled={locked || editing || pending} value={selected} onChange={event => { setSelected(event.target.value); setError('') }}>
      {versions.map(item => <option key={item.id} value={item.id}>v{item.version} · {item.status === 'DRAFT' ? 'Borrador' : base.activeVersionId === item.id ? base.archived ? 'Publicada seleccionada · suspendida' : 'Publicada activa' : 'Publicada histórica'}</option>)}
    </select></label>
    {versions.length < base._count.versions && <button disabled={locked || editing || pending} onClick={older} className={button}>Cargar versiones anteriores</button>}
    <p className="break-words text-sm">{String(version.terms.origin)} → {String(version.terms.destination)} · {String(version.terms.equipment)}</p>
    {version.publishedAt && <p className="text-sm">Publicada {version.publishedAt.slice(0, 10)} · {version.publicationNote}</p>}
    <details className="rounded border bg-card p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Ver tarifas, vigencias y supuestos de v{version.version}</summary>
      <PartnerCostForm key={version.id} initialInput={version.terms} readOnly termsOnly />
    </details>
    {role === 'ADMIN' && !editing && !managing && !base.archived && <button disabled={locked || pending} className={button} onClick={() => setEditing(true)}>Preparar nueva revisión desde la última versión</button>}
    {editing && <div className="space-y-4"><button className={button} disabled={locked} onClick={() => setEditing(false)}>Cerrar editor</button><PartnerBaseEditor base={base} onLock={setLocked} /></div>}
    {!editing && !managing && !base.archived && role === 'ADMIN' && version.status === 'DRAFT' && version.id === base.versions[0].id && <form onSubmit={publish} className="space-y-3 rounded border p-4">
      <h3 className="font-semibold">Revisar y publicar esta versión</h3>
      <p className="text-sm">Confirma tarifas, inclusiones, fuentes y supuestos. Publicar reemplaza la selección activa para nuevos cálculos; no modifica resultados guardados.</p>
      <fieldset disabled={locked} className="space-y-3"><label className="grid gap-1 text-sm">Nota de publicación<textarea className="rounded border bg-background p-2" name="note" required minLength={10} maxLength={500} /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1" />Revisé los términos y autorizo publicar esta versión.</label></fieldset>
      {!published && <button disabled={pending} className={primary}>{pending ? 'Publicando…' : locked ? 'Reintentar publicación' : 'Publicar versión'}</button>}
      {published && <p role="status">Versión publicada. <a className="underline" href={baseUrl(base.id)}>Abrir base actualizada para calcular</a></p>}
    </form>}
    {error && <p role="alert">{error} <a className="underline" href={baseUrl(base.id)}>Recargar base</a></p>}
    {!editing && !managing && !base.archived && isActive && role !== 'VIEWER' && <PartnerBaseCalculator key={version.id} baseId={base.id} version={version} onLock={setLocked} />}
    {role === 'ADMIN' && !editing && !managing && <button disabled={locked || pending} className={button} onClick={() => setManaging(true)}>Administrar disponibilidad</button>}
    {managing && <div className="space-y-3"><button disabled={locked} className={button} onClick={() => setManaging(false)}>Cerrar disponibilidad</button><PartnerBaseLifecycle base={base} onLock={setLocked} /></div>}
    {!!base.lifecycleEvents?.length && <details className="rounded border bg-card p-4"><summary className="min-h-11 cursor-pointer py-2">Historial de disponibilidad · últimas {base.lifecycleEvents.length} transiciones</summary>
      <ol className="space-y-3 text-sm">{base.lifecycleEvents.map(event => <li key={event.id} className="break-words border-t pt-3">#{event.revision} · {event.archived ? 'Retirada' : 'Reactivada'} · {event.createdAt.slice(0, 10)}<p>{event.note}</p><p className="text-xs">Autor: {event.actorId}</p></li>)}</ol>
    </details>}
    {role === 'VIEWER' && <p className="text-sm">Tu rol permite consultar bases y versiones; no publicar ni generar cálculos.</p>}
  </section>
}

export function PartnerBaseLifecycle({ base, onLock }: { base: TariffBase; onLock?: (locked: boolean) => void }) {
  const [pending, setPending] = useState(false)
  const [locked, setLocked] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const intent = useRef<{ key: string; body: unknown } | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current || done) return
    const data = new FormData(event.currentTarget)
    intent.current ??= { key: crypto.randomUUID(), body: { archived: !base.archived,
      expectedRevision: base.lifecycleRevision, expectedActiveVersionId: base.activeVersionId, note: String(data.get('reason') ?? '') } }
    busy.current = true; setPending(true); setLocked(true); onLock?.(true); setError('')
    try {
      await fetcher(`/api/v1/partner-bases/${base.id}/lifecycle`, { method: 'POST', json: intent.current.body,
        headers: { 'Idempotency-Key': intent.current.key }, silent: true })
      setDone(true)
    } catch (caught) {
      setError(message(caught))
      if (definitive(caught)) { intent.current = null; setLocked(false); onLock?.(false) }
    } finally { busy.current = false; setPending(false) }
  }
  return <form onSubmit={submit} className="space-y-3 rounded border bg-card p-4" aria-label="Disponibilidad de la base">
    <h3 className="font-semibold">{base.archived ? 'Reactivar base' : 'Retirar base'}</h3>
    <p className="text-sm">{base.archived ? 'Conserva la versión publicada seleccionada. Reactivar no renueva ni verifica tarifas; se comprobarán sus vigencias en cada viaje.' : 'Bloquea nuevos cálculos, guardados, revisiones y publicaciones. Conserva versiones y resultados guardados.'}</p>
    <fieldset disabled={locked} className="space-y-3"><label className="grid gap-1 text-sm">Motivo<textarea name="reason" required minLength={10} maxLength={500} rows={3} className="rounded border bg-background p-2" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1" />Confirmo el cambio de disponibilidad; no se borran versiones ni resultados.</label></fieldset>
    {error && <p role="alert">{error} <a className="underline" href={baseUrl(base.id)}>Consultar estado actual</a></p>}
    {!done && <button disabled={pending} className={primary}>{pending ? 'Confirmando…' : locked ? 'Reintentar sin duplicar' : base.archived ? 'Reactivar base' : 'Retirar base'}</button>}
    {done && <p role="status">Solicitud confirmada. <a className="underline" href={baseUrl(base.id)}>Consultar estado actualizado</a></p>}
  </form>
}
