'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RelativeTime } from '@/components/relative-time'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { fetcher } from '@/lib/fetcher'

export interface AssumptionSet {
  id: string
  name: string
  version: number
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  sourceVersionId: string | null
  publishedAt: string | null
  costBase: {
    id: string
    code: string
    name: string
    scope: 'CROSS_BORDER' | 'DRAYAGE' | 'LOCAL' | 'INTRA_MEX' | 'INTRA_US'
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  } | null
  _count?: { params: number }
}

type DialogState =
  | { kind: 'create'; cloneFromId?: string; cloneFromName?: string }
  | { kind: 'rename'; targetId: string; name: string; notes: string }
  | null

const selectCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function AssumptionsList({ initial, canEdit }: { initial: AssumptionSet[]; canEdit: boolean }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [selectedId, setSelectedId] = useState(() => (
    initial.find((item) => item.isActive)?.id ?? initial[0]?.id ?? ''
  ))
  const [dialog, setDialog] = useState<DialogState>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const closeDialog = () => setDialog(null)

  const needle = search.trim().toLowerCase()
  const filtered = useMemo(
    () => items.filter((s) => needle === '' || s.name.toLowerCase().includes(needle) || (s.notes ?? '').toLowerCase().includes(needle) || (s.costBase?.name ?? '').toLowerCase().includes(needle)),
    [items, needle],
  )
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  const groups = useMemo(() => {
    const grouped = new Map<string, { label: string; items: AssumptionSet[] }>()
    for (const item of filtered) {
      const groupKey = item.costBase?.id ?? 'legacy'
      const group = grouped.get(groupKey) ?? {
        label: item.costBase?.name ?? 'Versiones comunes / Legacy',
        items: [],
      }
      group.items.push(item)
      grouped.set(groupKey, group)
    }
    return [...grouped.entries()]
  }, [filtered])
  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) { next.delete(id); return next }
    if (next.size >= 2) { toast.error('Selecciona hasta 2 versiones para comparar'); return prev }
    next.add(id)
    return next
  })

  const create = useMutation({
    mutationFn: (body: { name: string; notes?: string; cloneFromId?: string }) =>
      fetcher<AssumptionSet>('/api/v1/assumptions/sets', { method: 'POST', json: body }),
    onSuccess: (s) => {
      setItems((prev) => [s, ...prev])
      setSelectedId(s.id)
      toast.success(`Versión "${s.name}" creada`)
      closeDialog()
    },
  })

  const rename = useMutation({
    mutationFn: (body: { id: string; name: string; notes: string }) =>
      fetcher<AssumptionSet>(`/api/v1/assumptions/sets/${body.id}`, {
        method: 'PUT', json: { name: body.name, notes: body.notes || undefined },
      }),
    onSuccess: (s) => {
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: s.name, notes: s.notes } : x)))
      toast.success(`Versión renombrada a "${s.name}"`)
      closeDialog()
    },
  })

  const activate = useMutation({
    mutationFn: (id: string) =>
      fetcher<AssumptionSet>(`/api/v1/assumptions/sets/${id}/activate`, { method: 'POST', json: {} }),
    onSuccess: (s, activatedId) => {
      setItems((prev) => {
        const targetBaseId = prev.find((item) => item.id === activatedId)?.costBase?.id ?? null
        return prev.map((item) => (
          (item.costBase?.id ?? null) === targetBaseId
            ? { ...item, isActive: item.id === s.id }
            : item
        ))
      })
      toast.success(`Versión "${s.name}" activada`)
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await fetcher<null>(`/api/v1/assumptions/sets/${id}`, { method: 'DELETE' })
      return id
    },
    onSuccess: (id) => {
      setItems((prev) => {
        const remaining = prev.filter((x) => x.id !== id)
        if (selectedId === id) setSelectedId(remaining[0]?.id ?? '')
        return remaining
      })
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
      toast.success('Versión eliminada')
    },
  })

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.05em] text-primary">Control de costos</p>
          <h1 className="text-2xl font-medium tracking-tight">Supuestos por base</h1>
          <p className="text-xs text-muted-foreground">Versiones auditables de los parámetros que construyen cada costo.</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 1 && (
            <Input aria-label="Buscar versión o base" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar versión o base…" className="h-8 w-full sm:w-48" />
          )}
          {canEdit
            ? <Button size="sm" onClick={() => setDialog({ kind: 'create' })}>Nueva versión común</Button>
            : <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Modo consulta</span>}
        </div>
      </div>

      {selectedItem ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="xs" onClick={() => router.push(`/assumptions/${selectedItem.id}`)}>Valores efectivos</Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={!selectedItem.sourceVersionId}
              onClick={() => selectedItem.sourceVersionId && router.push(`/assumptions/diff?a=${selectedItem.sourceVersionId}&b=${selectedItem.id}`)}
            >
              Sólo diferencias
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setSelected((current) => current.size ? new Set() : new Set([selectedItem.id]))}>Comparar bases</Button>
          </div>
          <span className="text-muted-foreground">{filtered.length} de {items.length} versiones visibles</span>
        </div>
      ) : null}

      {selected.size > 0 && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {selected.size} seleccionada{selected.size === 1 ? ' — elige una segunda versión' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>Cancelar</Button>
            <Button size="sm" disabled={selected.size !== 2}
              onClick={() => { const [a, b] = [...selected]; router.push(`/assumptions/diff?a=${a}&b=${b}`) }}>
              Comparar
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No hay versiones de supuestos</CardTitle>
            <CardDescription>
              {canEdit
                ? 'Crea una base de costo para obtener una versión gobernada con los parámetros canónicos.'
                : 'No hay versiones disponibles para consulta. Un administrador debe crear la primera.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {items.length > 0 && filtered.length === 0 && (
        <Card>
          <CardHeader>
            <CardDescription>
              Ninguna versión coincide con &ldquo;{search}&rdquo;.{' '}
              <button type="button" onClick={() => setSearch('')} className="underline underline-offset-2 hover:text-foreground">Limpiar búsqueda</button>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {selectedItem && filtered.length > 0 ? (
        <div className="grid gap-2 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <Card className="self-start lg:sticky lg:top-16">
            <CardHeader className="border-b bg-muted/25">
              <CardTitle>Capas de supuestos</CardTitle>
              <CardDescription>Selecciona una base y versión.</CardDescription>
            </CardHeader>
            <CardContent className="grid p-0">
              {groups.map(([groupId, group]) => (
                <div key={groupId} className="border-b last:border-b-0">
                  <div className="bg-muted/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{group.label}</div>
                  {group.items.map((item) => (
                    <div key={item.id} className={`flex items-center border-t ${item.id === selectedItem.id ? 'bg-accent shadow-[inset_3px_0_0_var(--primary)]' : ''}`}>
                      <button type="button" className="min-w-0 flex-1 px-3 py-2 text-left" onClick={() => setSelectedId(item.id)}>
                        <span className="block truncate text-xs font-medium">{item.name} · v{item.version}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{item._count?.params ?? 0} parámetros · {assumptionStatusLabel(item)}</span>
                      </button>
                      <label className="px-2" title="Seleccionar para comparar">
                        <span className="sr-only">Comparar {item.name} versión {item.version}</span>
                        <input type="checkbox" className="size-3.5 accent-primary" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid min-w-0 gap-2">
            <Card>
              <CardHeader className="border-b bg-muted/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{selectedItem.name} · v{selectedItem.version}</CardTitle>
                    <CardDescription>{selectedItem.costBase ? `${selectedItem.costBase.code} · ${selectedItem.costBase.name}` : 'Versión común / Legacy'}</CardDescription>
                  </div>
                  <AssumptionStatus item={selectedItem} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 pt-3">
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs">
                  <LineageStep label={selectedItem.sourceVersionId ? 'Versión fuente' : 'Catálogo canónico'} value={selectedItem.sourceVersionId ? selectedItem.sourceVersionId.slice(0, 8) : '210 parámetros'} />
                  <span className="text-muted-foreground">→</span>
                  <LineageStep label="Base" value={selectedItem.costBase?.name ?? 'Común / Legacy'} />
                  <span className="text-muted-foreground">→</span>
                  <LineageStep label="Aplicación" value="Rutas futuras" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <AssumptionMetric label="Parámetros" value={String(selectedItem._count?.params ?? 0)} />
                  <AssumptionMetric label="Estado" value={assumptionStatusLabel(selectedItem)} />
                  <AssumptionMetric label="Base activa" value={selectedItem.costBase?.status === 'ACTIVE' ? 'Sí' : 'No'} />
                  <AssumptionMetric label="Actualización" value={<RelativeTime iso={selectedItem.updatedAt ?? selectedItem.createdAt} />} />
                </div>
                {selectedItem.notes ? <p className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">{selectedItem.notes}</p> : null}
                <div className="flex flex-wrap items-center gap-1 border-t pt-3">
                  <Button size="sm" render={<Link href={`/assumptions/${selectedItem.id}`} />}>{canEdit && selectedItem.status === 'DRAFT' ? 'Editar parámetros' : 'Ver parámetros'}</Button>
                  {canEdit && !selectedItem.isActive && !selectedItem.costBase ? <Button variant="outline" size="sm" disabled={activate.isPending} onClick={() => activate.mutate(selectedItem.id)}>Activar</Button> : null}
                  {canEdit && !selectedItem.isActive && selectedItem.costBase ? <Button variant="outline" size="sm" render={<Link href="/cost-bases" />}>Administrar activación</Button> : null}
                  {canEdit ? <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: 'rename', targetId: selectedItem.id, name: selectedItem.name, notes: selectedItem.notes ?? '' })}>Renombrar</Button> : null}
                  {canEdit ? <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: 'create', cloneFromId: selectedItem.id, cloneFromName: selectedItem.name })}>Clonar borrador</Button> : null}
                  {canEdit ? <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={remove.isPending || selectedItem.isActive || selectedItem.status !== 'DRAFT'}>Eliminar</Button>} />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar &ldquo;{selectedItem.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminarán los parámetros de este borrador. Las cotizaciones existentes conservan su snapshot. Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction disabled={selectedItem.isActive || selectedItem.status !== 'DRAFT'} onClick={() => remove.mutate(selectedItem.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog> : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Create / Clone dialog */}
      <Dialog open={dialog?.kind === 'create'} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.kind === 'create' && dialog.cloneFromId ? 'Clonar versión' : 'Nueva versión de supuestos'}</DialogTitle>
            <DialogDescription>
              {dialog?.kind === 'create' && dialog.cloneFromId
                ? `Se clonará "${dialog.cloneFromName}" y se conservarán sus valores para revisión.`
                : 'Crea una versión con los valores V3.0 recomendados. Podrás revisarlos antes de activarla.'}
            </DialogDescription>
          </DialogHeader>
          <CreateForm
            cloneFromId={dialog?.kind === 'create' ? dialog.cloneFromId : undefined}
            pending={create.isPending}
            onSubmit={(name, notes) =>
              create.mutate({
                name,
                notes: notes || undefined,
                cloneFromId: dialog?.kind === 'create' ? dialog.cloneFromId : undefined,
              })
            }
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={dialog?.kind === 'rename'} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar versión</DialogTitle>
            <DialogDescription>Edita el nombre y las notas de esta versión de supuestos.</DialogDescription>
          </DialogHeader>
          {dialog?.kind === 'rename' && (
            <RenameForm
              initialName={dialog.name}
              initialNotes={dialog.notes}
              pending={rename.isPending}
              onSubmit={(name, notes) => rename.mutate({ id: dialog.targetId, name, notes })}
              onCancel={closeDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function assumptionStatusLabel(item: AssumptionSet): string {
  if (item.status === 'ARCHIVED') return 'Archivada'
  if (item.status === 'PUBLISHED') return item.isActive ? 'Publicada · vigente' : 'Publicada'
  return item.isActive ? 'Borrador activo' : 'Borrador'
}

function AssumptionStatus({ item }: { item: AssumptionSet }) {
  const className = item.status === 'PUBLISHED'
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    : item.status === 'ARCHIVED'
      ? 'bg-muted text-muted-foreground'
      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  return <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${className}`}>{assumptionStatusLabel(item)}</span>
}

function LineageStep({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      <strong className="font-medium">{value}</strong>
    </span>
  )
}

function AssumptionMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-medium">{value}</div>
    </div>
  )
}

function CreateForm({
  cloneFromId, pending, onSubmit, onCancel,
}: {
  cloneFromId?: string
  pending: boolean
  onSubmit: (name: string, notes: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), notes.trim())
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="set-name">Nombre</Label>
        <Input
          id="set-name" required autoFocus
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder={cloneFromId ? 'p. ej. Q3 2026 — Revisión transportista A' : 'p. ej. Base Q3 2026'}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="set-notes">Notas (opcionales)</Label>
        <textarea
          id="set-notes"
          className={`${selectCls} h-20 py-2`}
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Registra el motivo o alcance de esta revisión"
        />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" onClick={onCancel} />}>
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Creando…' : cloneFromId ? 'Clonar versión' : 'Crear versión'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function RenameForm({
  initialName, initialNotes, pending, onSubmit, onCancel,
}: {
  initialName: string
  initialNotes: string
  pending: boolean
  onSubmit: (name: string, notes: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [notes, setNotes] = useState(initialNotes)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), notes.trim())
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="rename-name">Nombre</Label>
        <Input
          id="rename-name" required autoFocus
          value={name} onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="rename-notes">Notas</Label>
        <textarea
          id="rename-notes"
          className={`${selectCls} h-20 py-2`}
          value={notes} onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" onClick={onCancel} />}>
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
