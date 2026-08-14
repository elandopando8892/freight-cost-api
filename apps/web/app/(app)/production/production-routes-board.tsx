'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetcher } from '@/lib/fetcher'

type Geography = 'MX' | 'US' | 'CROSS_BORDER'
type Quality = 'INCOMPLETE' | 'NEEDS_REVIEW' | 'READY'
type RouteStatus = 'DRAFT' | 'PRODUCTION' | 'ARCHIVED'

export interface CostBaseOption {
  id: string
  code: string
  name: string
  scope: string
  status: string
  versions: { id: string; version: number; isActive: boolean; status: string }[]
}

export interface ProductionRoute {
  id: string
  revision: number
  code: string | null
  origin: string
  destination: string
  mexBorder: string | null
  usaBorder: string | null
  geography: Geography
  operation: string
  service: string
  truckType: string
  trailerType: string
  config: string
  driverType: string
  status: RouteStatus
  notes: string | null
  quality: Quality
  reasons: string[]
  suggestedCostBase: { id: string; code: string; name: string; scope: string; status: string } | null
  confirmedCostBase: { id: string; code: string; name: string; scope: string; status: string } | null
  confirmedAssumptionSet: { id: string; name: string; version: number; status: string } | null
  supersedesRoute: { id: string; code: string | null; revision: number; status: string; confirmedAssumptionSet: { version: number } | null } | null
  auditEvents: { id: string; action: 'CREATED' | 'PRODUCED' | 'ARCHIVED' | 'REPLACEMENT_PROPOSED'; note: string | null; createdAt: string; actor: { id: string; email: string } | null }[]
}

const operations = [
  ['D2D Export', 'CROSS_BORDER'], ['D2D Import', 'CROSS_BORDER'], ['Drayage', 'DRAYAGE'],
  ['Local', 'LOCAL'], ['Intra-Mex', 'INTRA_MEX'], ['Intra-US', 'INTRA_US'],
] as const

const geographyFor = (operation: string): Geography => {
  if (operation === 'D2D Export' || operation === 'D2D Import') return 'CROSS_BORDER'
  if (operation === 'Drayage' || operation === 'Intra-US') return 'US'
  return 'MX'
}

const qualityLabel: Record<Quality, string> = { INCOMPLETE: 'Incompleta', NEEDS_REVIEW: 'Revisar', READY: 'Lista' }
const qualityClass: Record<Quality, string> = {
  INCOMPLETE: 'border-amber-200 bg-amber-50 text-amber-800',
  NEEDS_REVIEW: 'border-rose-200 bg-rose-50 text-rose-800',
  READY: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

export function ProductionRoutesBoard({ initialRoutes, costBases, canEdit }: { initialRoutes: ProductionRoute[]; costBases: CostBaseOption[]; canEdit: boolean }) {
  const router = useRouter()
  const [routes, setRoutes] = useState(initialRoutes)
  const [filter, setFilter] = useState<'ALL' | Quality>('ALL')
  const [edit, setEdit] = useState<ProductionRoute | null | undefined>(undefined)
  const [replacement, setReplacement] = useState<ProductionRoute | undefined>(undefined)
  const visible = useMemo(() => routes.filter((route) => filter === 'ALL' || route.quality === filter), [routes, filter])

  const upsert = (route: ProductionRoute) => setRoutes((current) => {
    const index = current.findIndex((item) => item.id === route.id)
    return index < 0 ? [route, ...current] : current.map((item) => item.id === route.id ? route : item)
  })

  const produce = useMutation({
    mutationFn: (id: string) => fetcher<ProductionRoute>(`/api/v1/production/routes/${id}/produce`, { method: 'POST' }),
    onSuccess: (route) => { upsert(route); toast.success('Ruta habilitada para producción') },
  })
  const archive = useMutation({
    mutationFn: (id: string) => fetcher<ProductionRoute>(`/api/v1/production/routes/${id}/archive`, { method: 'POST' }),
    onSuccess: (route) => { upsert(route); toast.success('Ruta archivada') },
  })
  const quote = useMutation({
    mutationFn: (id: string) => fetcher<{ id: string; resolverWarnings: string[] }>(`/api/v1/production/routes/${id}/quotes`, { method: 'POST' }),
    onSuccess: (saved) => { toast.success('Cotización creada desde la ruta producida'); router.push(`/quotes/${saved.id}`) },
  })
  const replace = useMutation({
    mutationFn: ({ route, confirmedCostBaseId, confirmedAssumptionSetId, notes }: { route: ProductionRoute; confirmedCostBaseId: string; confirmedAssumptionSetId: string; notes?: string }) =>
      fetcher<ProductionRoute>(`/api/v1/production/routes/${route.id}/replacements`, { method: 'POST', json: { confirmedCostBaseId, confirmedAssumptionSetId, notes } }),
    onSuccess: (saved) => { upsert(saved); setReplacement(undefined); toast.success('Reemplazo creado como borrador') },
  })

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Catálogo operativo</p>
          <p className="text-sm text-muted-foreground">La base sugerida orienta; la base y versión confirmadas gobiernan la producción.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="ALL">Todas ({routes.length})</option>
            <option value="READY">Listas</option>
            <option value="NEEDS_REVIEW">Revisar</option>
            <option value="INCOMPLETE">Incompletas</option>
          </select>
          {canEdit ? <Button size="sm" onClick={() => setEdit(null)}>+ Nueva ruta</Button> : <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Modo consulta</span>}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? <div className="px-6 py-10 text-center text-sm text-muted-foreground">No hay rutas para este filtro.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Ruta</th><th className="px-4 py-2 text-left font-medium">Geografía</th><th className="px-4 py-2 text-left font-medium">Operación / equipo</th>
                    <th className="px-4 py-2 text-left font-medium">Base sugerida</th><th className="px-4 py-2 text-left font-medium">Base confirmada</th><th className="px-4 py-2 text-left font-medium">Calidad</th><th className="px-4 py-2 text-left font-medium">Estado</th><th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((route) => <tr key={route.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3"><div className="font-medium">{route.code || `${route.origin} → ${route.destination}`} <span className="text-xs font-normal text-muted-foreground">r{route.revision}</span></div><div className="text-xs text-muted-foreground">{route.code ? `${route.origin} → ${route.destination}` : route.geography === 'CROSS_BORDER' ? `${route.mexBorder || 'MX border'} / ${route.usaBorder || 'US border'}` : ''}{route.supersedesRoute ? ` · sustituye r${route.supersedesRoute.revision}` : ''}</div></td>
                    <td className="px-4 py-3"><span className="rounded border bg-muted px-2 py-1 text-xs">{route.geography}</span></td>
                    <td className="px-4 py-3"><div>{route.operation}</div><div className="text-xs text-muted-foreground">{route.truckType} · {route.trailerType} · {route.config}</div></td>
                    <td className="px-4 py-3 text-xs">{route.suggestedCostBase ? <><div className="font-medium">{route.suggestedCostBase.code}</div><div className="text-muted-foreground">{route.suggestedCostBase.name}</div></> : <span className="text-muted-foreground">Sin sugerencia publicada</span>}</td>
                    <td className="px-4 py-3 text-xs">{route.confirmedCostBase ? <><div className="font-medium">{route.confirmedCostBase.code}</div><div className="text-muted-foreground">v{route.confirmedAssumptionSet?.version ?? '—'} · {route.confirmedAssumptionSet?.status ?? 'sin versión'}</div></> : <span className="text-muted-foreground">Pendiente</span>}</td>
                    <td className="px-4 py-3"><span title={route.reasons.join(' ')} className={`rounded border px-2 py-1 text-xs font-medium ${qualityClass[route.quality]}`}>{qualityLabel[route.quality]}</span>{route.reasons[0] && <div className="mt-1 max-w-[220px] text-xs text-muted-foreground">{route.reasons[0]}</div>}<RouteHistory events={route.auditEvents} /></td>
                    <td className="px-4 py-3 text-xs font-medium">{route.status === 'PRODUCTION' ? 'En producción' : route.status === 'ARCHIVED' ? 'Archivada' : 'Borrador'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{canEdit ? <><Button variant="ghost" size="sm" onClick={() => setEdit(route)} disabled={route.status !== 'DRAFT'}>Editar</Button>{route.status === 'DRAFT' && <Button variant="ghost" size="sm" disabled={route.quality !== 'READY' || produce.isPending} onClick={() => produce.mutate(route.id)}>Producir</Button>}{route.status === 'PRODUCTION' && <><Button variant="ghost" size="sm" disabled={quote.isPending} onClick={() => quote.mutate(route.id)}>Cotizar</Button><Button variant="ghost" size="sm" disabled={replace.isPending} onClick={() => setReplacement(route)}>Reemplazar</Button></>}{route.status !== 'ARCHIVED' && <Button variant="ghost" size="sm" disabled={archive.isPending} onClick={() => archive.mutate(route.id)}>Archivar</Button>}</> : <span className="text-xs text-muted-foreground">Sólo lectura</span>}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={edit !== undefined} onOpenChange={(open) => { if (!open) setEdit(undefined) }}>
        <DialogContent className="max-w-2xl"><RouteForm route={edit ?? null} costBases={costBases} onSaved={(route) => { upsert(route); setEdit(undefined) }} onCancel={() => setEdit(undefined)} /></DialogContent>
      </Dialog>
      <Dialog open={replacement !== undefined} onOpenChange={(open) => { if (!open) setReplacement(undefined) }}>
        <DialogContent className="max-w-xl">
          {replacement && <ReplacementForm route={replacement} costBases={costBases} pending={replace.isPending} onCancel={() => setReplacement(undefined)} onSubmit={(selection) => replace.mutate({ route: replacement, ...selection })} />}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function RouteHistory({ events }: { events: ProductionRoute['auditEvents'] }) {
  if (events.length === 0) return <div className="mt-1 text-xs text-muted-foreground">Sin historial estructurado.</div>
  return <details className="mt-1 text-xs text-muted-foreground"><summary className="cursor-pointer hover:text-foreground">Historial ({events.length})</summary><div className="mt-1 grid gap-1 border-l pl-2">{events.map((event) => <div key={event.id}><span className="font-medium text-foreground">{event.action.replaceAll('_', ' ').toLowerCase()}</span>{event.actor ? ` · ${event.actor.email}` : ''}{event.note ? ` · ${event.note}` : ''}</div>)}</div></details>
}

function ReplacementForm({ route, costBases, pending, onCancel, onSubmit }: { route: ProductionRoute; costBases: CostBaseOption[]; pending: boolean; onCancel: () => void; onSubmit: (selection: { confirmedCostBaseId: string; confirmedAssumptionSetId: string; notes?: string }) => void }) {
  const scope = operations.find(([name]) => name === route.operation)?.[1]
  const compatibleBases = costBases.filter((base) => base.scope === scope && base.status === 'ACTIVE')
  const initialBaseId = route.confirmedCostBase?.id ?? compatibleBases[0]?.id ?? ''
  const [baseId, setBaseId] = useState(initialBaseId)
  const base = compatibleBases.find((item) => item.id === baseId)
  const publishedVersions = (base?.versions ?? []).filter((version) => version.status === 'PUBLISHED')
  const firstVersionId = publishedVersions.find((version) => version.isActive)?.id ?? publishedVersions[0]?.id ?? ''
  const initialVersionId = route.confirmedAssumptionSet && publishedVersions.some((version) => version.id === route.confirmedAssumptionSet?.id) ? route.confirmedAssumptionSet.id : firstVersionId
  const [versionId, setVersionId] = useState(initialVersionId)
  const [notes, setNotes] = useState('')
  const selectBase = (nextBaseId: string) => {
    setBaseId(nextBaseId)
    const next = compatibleBases.find((item) => item.id === nextBaseId)
    const nextVersions = (next?.versions ?? []).filter((version) => version.status === 'PUBLISHED')
    setVersionId(nextVersions.find((version) => version.isActive)?.id ?? nextVersions[0]?.id ?? '')
  }
  const valid = Boolean(baseId && versionId)

  return <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (valid) onSubmit({ confirmedCostBaseId: baseId, confirmedAssumptionSetId: versionId, notes: notes.trim() || undefined }) }}>
    <DialogHeader><DialogTitle>Proponer reemplazo de ruta</DialogTitle><DialogDescription>Se crea una revisión en borrador. La ruta actual y sus cotizaciones no cambian ni se archivan automáticamente.</DialogDescription></DialogHeader>
    <div className="rounded-md border bg-muted/25 p-3 text-sm"><div className="font-medium">{route.code || `${route.origin} → ${route.destination}`} · revisión {route.revision}</div><div className="text-xs text-muted-foreground">Selecciona la versión publicada que gobernará la nueva revisión.</div></div>
    <div className="grid gap-3">
      <Field label="Base de costos para el reemplazo"><select value={baseId} onChange={(event) => selectBase(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecciona una base</option>{compatibleBases.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></Field>
      <Field label="Versión publicada"><select value={versionId} onChange={(event) => setVersionId(event.target.value)} disabled={!baseId} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecciona una versión</option>{publishedVersions.map((version) => <option key={version.id} value={version.id}>v{version.version}{version.isActive ? ' · activa' : ''}</option>)}</select></Field>
      <Field label="Motivo o nota (opcional)"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Ej. Ajuste de diesel y margen aprobado para septiembre" /></Field>
    </div>
    <DialogFooter><Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={!valid || pending}>{pending ? 'Creando…' : 'Crear borrador de reemplazo'}</Button></DialogFooter>
  </form>
}

function RouteForm({ route, costBases, onSaved, onCancel }: { route: ProductionRoute | null; costBases: CostBaseOption[]; onSaved: (route: ProductionRoute) => void; onCancel: () => void }) {
  const [operation, setOperation] = useState(route?.operation ?? 'D2D Export')
  const [origin, setOrigin] = useState(route?.origin ?? '')
  const [destination, setDestination] = useState(route?.destination ?? '')
  const [mexBorder, setMexBorder] = useState(route?.mexBorder ?? '')
  const [usaBorder, setUsaBorder] = useState(route?.usaBorder ?? '')
  const [code, setCode] = useState(route?.code ?? '')
  const [truckType, setTruckType] = useState(route?.truckType ?? 'Truck')
  const [trailerType, setTrailerType] = useState(route?.trailerType ?? 'Trailer')
  const [config, setConfig] = useState(route?.config ?? 'Single')
  const [driverType, setDriverType] = useState(route?.driverType ?? 'Company')
  const [confirmedCostBaseId, setConfirmedCostBaseId] = useState(route?.confirmedCostBase?.id ?? '')
  const scope = operations.find(([name]) => name === operation)?.[1]
  const compatibleBases = costBases.filter((base) => base.scope === scope && base.status === 'ACTIVE')
  const isCrossBorder = geographyFor(operation) === 'CROSS_BORDER'
  const save = useMutation({
    mutationFn: () => {
      const body = { code: code.trim() || null, origin: origin.trim(), destination: destination.trim(), mexBorder: isCrossBorder ? mexBorder.trim() || null : null, usaBorder: isCrossBorder ? usaBorder.trim() || null : null, geography: geographyFor(operation), operation, service: 'One Way', truckType: truckType.trim(), trailerType: trailerType.trim(), config: config.trim(), driverType: driverType.trim(), confirmedCostBaseId: confirmedCostBaseId || null }
      return route ? fetcher<ProductionRoute>(`/api/v1/production/routes/${route.id}`, { method: 'PATCH', json: body }) : fetcher<ProductionRoute>('/api/v1/production/routes', { method: 'POST', json: body })
    },
    onSuccess: (saved) => { toast.success(route ? 'Ruta actualizada' : 'Ruta creada como borrador'); onSaved(saved) },
  })
  const valid = origin.trim().length >= 2 && destination.trim().length >= 2 && (!isCrossBorder || (mexBorder.trim().length >= 2 && usaBorder.trim().length >= 2))

  return <form onSubmit={(event) => { event.preventDefault(); if (valid) save.mutate() }} className="grid gap-4">
    <DialogHeader><DialogTitle>{route ? 'Editar ruta operativa' : 'Nueva ruta operativa'}</DialogTitle><DialogDescription>La confirmación captura una versión publicada; la ruta sólo puede pasar a producción cuando queda lista.</DialogDescription></DialogHeader>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Codigo interno (opcional)"><Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="XB-MTY-DAL-01" /></Field>
      <Field label="Operación"><select value={operation} onChange={(event) => { setOperation(event.target.value); setConfirmedCostBaseId('') }} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{operations.map(([name]) => <option key={name}>{name}</option>)}</select></Field>
      <Field label="Origen"><Input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Monterrey, NL" /></Field>
      <Field label="Destino"><Input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Dallas, TX" /></Field>
      {isCrossBorder && <><Field label="Cruce MX"><Input value={mexBorder} onChange={(event) => setMexBorder(event.target.value)} placeholder="Nuevo Laredo, Tamaulipas" /></Field><Field label="Cruce US"><Input value={usaBorder} onChange={(event) => setUsaBorder(event.target.value)} placeholder="Laredo, TX" /></Field></>}
      <Field label="Base confirmada"><select value={confirmedCostBaseId} onChange={(event) => setConfirmedCostBaseId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Pendiente (guardar como borrador)</option>{compatibleBases.map((base) => <option key={base.id} value={base.id}>{base.code} — {base.name}</option>)}</select></Field>
      <Field label="Equipo"><div className="grid grid-cols-2 gap-2"><Input value={truckType} onChange={(event) => setTruckType(event.target.value)} placeholder="Truck" /><Input value={trailerType} onChange={(event) => setTrailerType(event.target.value)} placeholder="Trailer" /></div></Field>
      <Field label="Configuracion"><Input value={config} onChange={(event) => setConfig(event.target.value)} /></Field>
      <Field label="Conductor"><Input value={driverType} onChange={(event) => setDriverType(event.target.value)} /></Field>
    </div>
    <DialogFooter><DialogClose render={<Button variant="outline" type="button" onClick={onCancel} />}>Cancelar</DialogClose><Button type="submit" disabled={!valid || save.isPending}>{save.isPending ? 'Guardando…' : route ? 'Guardar' : 'Crear borrador'}</Button></DialogFooter>
  </form>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
}
