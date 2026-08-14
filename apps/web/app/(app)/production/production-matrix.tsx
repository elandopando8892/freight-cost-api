'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { fetcher } from '@/lib/fetcher'

export interface MexLane { id: string; origin: string; destination: string; km: number; tolls: number; horasRuta: number }
export interface UsaLane { id: string; origin: string; destination: string; outState: string; miles: number; truckDays: number; routeExpenses: number }

type Side = 'mex' | 'usa'
type EditState =
  | { side: 'mex'; lane: Partial<MexLane> | null }
  | { side: 'usa'; lane: Partial<UsaLane> | null }
  | null

export function ProductionMatrix({ initialMex, initialUsa, canEdit }: { initialMex: MexLane[]; initialUsa: UsaLane[]; canEdit: boolean }) {
  const [side, setSide] = useState<Side>('mex')
  const [mex, setMex] = useState(initialMex)
  const [usa, setUsa] = useState(initialUsa)
  const [edit, setEdit] = useState<EditState>(null)

  const removeMex = useMutation({
    mutationFn: (id: string) => fetcher<null>(`/api/v1/production/mex-lanes/${id}`, { method: 'DELETE' }).then(() => id),
    onSuccess: (id) => { setMex((p) => p.filter((l) => l.id !== id)); toast.success('Ruta MX eliminada') },
  })
  const removeUsa = useMutation({
    mutationFn: (id: string) => fetcher<null>(`/api/v1/production/usa-lanes/${id}`, { method: 'DELETE' }).then(() => id),
    onSuccess: (id) => { setUsa((p) => p.filter((l) => l.id !== id)); toast.success('Ruta US eliminada') },
  })

  const upsertMex = (l: MexLane) => setMex((p) => { const i = p.findIndex((x) => x.id === l.id); if (i < 0) return [...p, l]; const n = [...p]; n[i] = l; return n })
  const upsertUsa = (l: UsaLane) => setUsa((p) => { const i = p.findIndex((x) => x.id === l.id); if (i < 0) return [...p, l]; const n = [...p]; n[i] = l; return n })

  const list = side === 'mex' ? mex : usa
  const count = `${list.length} ruta${list.length === 1 ? '' : 's'}`

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-sm">
          <Tab active={side === 'mex'} onClick={() => setSide('mex')} label="MX (km)" />
          <Tab active={side === 'usa'} onClick={() => setSide('usa')} label="US (millas)" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{count}</span>
          {canEdit ? <Button size="sm" onClick={() => setEdit({ side, lane: null })}>+ Nueva ruta</Button> : <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Modo consulta</span>}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Sin rutas {side === 'mex' ? 'MX' : 'US'} todavía. Agrega las de tu red para cotizarlas al instante.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Origen</th>
                    <th className="px-4 py-2 text-left font-medium">Destino</th>
                    {side === 'mex' ? (
                      <>
                        <th className="px-4 py-2 text-right font-medium">km</th>
                        <th className="px-4 py-2 text-right font-medium">Casetas</th>
                        <th className="px-4 py-2 text-right font-medium">Horas</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-2 text-left font-medium">Estado</th>
                        <th className="px-4 py-2 text-right font-medium">millas</th>
                        <th className="px-4 py-2 text-right font-medium">Días</th>
                        <th className="px-4 py-2 text-right font-medium">Gastos</th>
                      </>
                    )}
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {side === 'mex'
                    ? mex.map((l) => (
                      <tr key={l.id} className="border-b last:border-b-0 hover:bg-muted/40">
                        <td className="px-4 py-2">{l.origin}</td>
                        <td className="px-4 py-2">{l.destination}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{l.km}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{l.tolls || '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{l.horasRuta || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          {canEdit ? <RowActions onEdit={() => setEdit({ side: 'mex', lane: l })} onDelete={() => removeMex.mutate(l.id)} pending={removeMex.isPending} label={`${l.origin} → ${l.destination}`} /> : <span className="text-xs text-muted-foreground">Sólo lectura</span>}
                        </td>
                      </tr>
                    ))
                    : usa.map((l) => (
                      <tr key={l.id} className="border-b last:border-b-0 hover:bg-muted/40">
                        <td className="px-4 py-2">{l.origin}</td>
                        <td className="px-4 py-2">{l.destination}</td>
                        <td className="px-4 py-2">{l.outState}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{l.miles}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{l.truckDays || '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{l.routeExpenses || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          {canEdit ? <RowActions onEdit={() => setEdit({ side: 'usa', lane: l })} onDelete={() => removeUsa.mutate(l.id)} pending={removeUsa.isPending} label={`${l.origin} → ${l.destination}`} /> : <span className="text-xs text-muted-foreground">Sólo lectura</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={edit !== null} onOpenChange={(o) => { if (!o) setEdit(null) }}>
        <DialogContent>
          {edit?.side === 'mex' && <MexForm lane={edit.lane} onSaved={(l) => { upsertMex(l); setEdit(null) }} onCancel={() => setEdit(null)} />}
          {edit?.side === 'usa' && <UsaForm lane={edit.lane} onSaved={(l) => { upsertUsa(l); setEdit(null) }} onCancel={() => setEdit(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded px-3 py-1.5 font-medium transition-colors ${active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
  )
}

function RowActions({ onEdit, onDelete, pending, label }: { onEdit: () => void; onDelete: () => void; pending: boolean; label: string }) {
  return (
    <span className="inline-flex gap-1">
      <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={pending}>Borrar</Button>} />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta ruta?</AlertDialogTitle>
            <AlertDialogDescription>{label}. Las cotizaciones guardadas no se afectan; sólo dejará de resolverse desde tu matriz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  )
}

const numOr = (s: string, d = 0) => { const n = Number(s); return Number.isFinite(n) ? n : d }

function MexForm({ lane, onSaved, onCancel }: { lane: Partial<MexLane> | null; onSaved: (l: MexLane) => void; onCancel: () => void }) {
  const [origin, setOrigin] = useState(lane?.origin ?? '')
  const [destination, setDestination] = useState(lane?.destination ?? '')
  const [km, setKm] = useState(lane?.km != null ? String(lane.km) : '')
  const [tolls, setTolls] = useState(lane?.tolls != null ? String(lane.tolls) : '')
  const [horas, setHoras] = useState(lane?.horasRuta != null ? String(lane.horasRuta) : '')
  const editing = Boolean(lane?.id)

  const save = useMutation({
    mutationFn: () => {
      const body = { origin: origin.trim(), destination: destination.trim(), km: numOr(km), tolls: numOr(tolls), horasRuta: numOr(horas) }
      return editing
        ? fetcher<MexLane>(`/api/v1/production/mex-lanes/${lane!.id}`, { method: 'PUT', json: body })
        : fetcher<MexLane>('/api/v1/production/mex-lanes', { method: 'POST', json: body })
    },
    onSuccess: (l) => { toast.success(editing ? 'Ruta MX actualizada' : 'Ruta MX creada'); onSaved(l) },
  })
  const valid = origin.trim() && destination.trim() && numOr(km) > 0

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate() }} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? 'Editar ruta MX' : 'Nueva ruta MX'}</DialogTitle>
        <DialogDescription>Usa el nombre completo de la ciudad (ej. &ldquo;Manzanillo, Colima&rdquo;) para que el autocomplete lo sugiera al cotizar.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel label="Origen"><Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Manzanillo, Colima" autoFocus /></FieldLabel>
        <FieldLabel label="Destino"><Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Guadalajara, Jalisco" /></FieldLabel>
        <FieldLabel label="km (cargado)"><Input type="number" step="any" value={km} onChange={(e) => setKm(e.target.value)} placeholder="330" /></FieldLabel>
        <FieldLabel label="Casetas (MXN, opc.)"><Input type="number" step="any" value={tolls} onChange={(e) => setTolls(e.target.value)} placeholder="0" /></FieldLabel>
        <FieldLabel label="Horas de ruta (opc.)"><Input type="number" step="any" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="0" /></FieldLabel>
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" onClick={onCancel} />}>Cancelar</DialogClose>
        <Button type="submit" disabled={!valid || save.isPending}>{save.isPending ? 'Guardando…' : editing ? 'Guardar' : 'Crear ruta'}</Button>
      </DialogFooter>
    </form>
  )
}

function UsaForm({ lane, onSaved, onCancel }: { lane: Partial<UsaLane> | null; onSaved: (l: UsaLane) => void; onCancel: () => void }) {
  const [origin, setOrigin] = useState(lane?.origin ?? '')
  const [destination, setDestination] = useState(lane?.destination ?? '')
  const [outState, setOutState] = useState(lane?.outState ?? '')
  const [miles, setMiles] = useState(lane?.miles != null ? String(lane.miles) : '')
  const [truckDays, setTruckDays] = useState(lane?.truckDays != null ? String(lane.truckDays) : '')
  const [expenses, setExpenses] = useState(lane?.routeExpenses != null ? String(lane.routeExpenses) : '')
  const editing = Boolean(lane?.id)

  const save = useMutation({
    mutationFn: () => {
      const body = { origin: origin.trim(), destination: destination.trim(), outState: outState.trim().toUpperCase(), miles: numOr(miles), truckDays: numOr(truckDays), routeExpenses: numOr(expenses) }
      return editing
        ? fetcher<UsaLane>(`/api/v1/production/usa-lanes/${lane!.id}`, { method: 'PUT', json: body })
        : fetcher<UsaLane>('/api/v1/production/usa-lanes', { method: 'POST', json: body })
    },
    onSuccess: (l) => { toast.success(editing ? 'Ruta US actualizada' : 'Ruta US creada'); onSaved(l) },
  })
  const valid = origin.trim() && destination.trim() && outState.trim().length >= 2 && numOr(miles) > 0

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate() }} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? 'Editar ruta US' : 'Nueva ruta US'}</DialogTitle>
        <DialogDescription>El estado (out-state) define el diésel y FSC. Usa el metro/ciudad como en tus cotizaciones.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel label="Origen"><Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Laredo, TX" autoFocus /></FieldLabel>
        <FieldLabel label="Destino"><Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Dallas, TX" /></FieldLabel>
        <FieldLabel label="Estado (out-state)"><Input value={outState} onChange={(e) => setOutState(e.target.value)} placeholder="TX" /></FieldLabel>
        <FieldLabel label="millas (cargado)"><Input type="number" step="any" value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="435" /></FieldLabel>
        <FieldLabel label="Días de tránsito (opc.)"><Input type="number" step="any" value={truckDays} onChange={(e) => setTruckDays(e.target.value)} placeholder="0" /></FieldLabel>
        <FieldLabel label="Gastos de ruta USD (opc.)"><Input type="number" step="any" value={expenses} onChange={(e) => setExpenses(e.target.value)} placeholder="0" /></FieldLabel>
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" onClick={onCancel} />}>Cancelar</DialogClose>
        <Button type="submit" disabled={!valid || save.isPending}>{save.isPending ? 'Guardando…' : editing ? 'Guardar' : 'Crear ruta'}</Button>
      </DialogFooter>
    </form>
  )
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
