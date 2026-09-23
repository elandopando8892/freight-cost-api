'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fetcher } from '@/lib/fetcher'

type Source = { groupId: string; source: string; asOf: string; note?: string }
type Checklist = {
  versionId: string
  versionStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  segment: string
  status: 'NOT_REVIEWED' | 'STALE' | 'CURRENT'
  evidence: { reviewedAt: string; sources: Source[] } | null
  groups: { id: string; label: string; fields: { section: string; field: string; value: number | null; unit: string; recommended: number; applicability: string }[] }[]
  withoutMath: { section: string; field: string }[]
}

export function CostBaseCalibrationDialog({ baseId, versionId, onClose, onSaved }: {
  baseId: string
  versionId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [edits, setEdits] = useState<Record<string, Partial<Source>>>({})
  const path = `/api/v1/cost-bases/${baseId}/versions/${versionId}/calibration`
  const checklist = useQuery({ queryKey: ['cost-base-calibration', baseId, versionId], queryFn: () => fetcher<Checklist>(path, { silent: true }) })
  const save = useMutation({
    mutationFn: (sources: Source[]) => fetcher<Checklist>(path, { method: 'POST', json: { sources }, silent: true }),
    onSuccess: () => { toast.success('Calibración registrada para esta versión'); onSaved(); onClose() },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo guardar la calibración'),
  })
  const sourceFor = (groupId: string) => ({
    groupId,
    source: edits[groupId]?.source ?? checklist.data?.evidence?.sources.find(item => item.groupId === groupId)?.source ?? '',
    asOf: edits[groupId]?.asOf ?? checklist.data?.evidence?.sources.find(item => item.groupId === groupId)?.asOf ?? '',
    note: edits[groupId]?.note ?? checklist.data?.evidence?.sources.find(item => item.groupId === groupId)?.note ?? '',
  })
  const sources = checklist.data?.groups.map(group => sourceFor(group.id)) ?? []
  const canSave = checklist.data?.versionStatus === 'DRAFT' && sources.length > 0
    && sources.every(item => item.source.trim().length >= 4 && /^\d{4}-\d{2}-\d{2}$/.test(item.asOf))

  return <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) onClose() }}>
    <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Calibrar supuestos del segmento</DialogTitle>
        <DialogDescription>
          Revisa los valores de esta versión contra fuentes reales. El estándar V3 es un punto de partida, no una cifra validada de tu operación.
        </DialogDescription>
      </DialogHeader>
      {checklist.isPending ? <p className="py-8 text-sm text-muted-foreground">Cargando supuestos…</p> : null}
      {checklist.isError ? <p role="alert" className="text-sm text-destructive">No se pudo cargar el checklist. {checklist.error instanceof Error ? checklist.error.message : ''}</p> : null}
      {checklist.data ? <div className="grid gap-4 text-sm">
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="font-medium">{checklist.data.status === 'CURRENT' ? 'Revisión consistente con esta versión' : checklist.data.status === 'STALE' ? 'Revisión obsoleta por cambios' : 'Aún sin revisión'}</p>
          <p className="mt-1 text-xs text-muted-foreground">Una edición de valores o del perfil invalida la huella. La fuente fechada no acredita por sí sola que los costos sigan actualizados; deben contrastarse con viajes reales.</p>
        </div>
        {checklist.data.withoutMath.length > 0 ? <details className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
          <summary className="cursor-pointer font-medium">{checklist.data.withoutMath.length} parámetros conservados sin efecto matemático V3</summary>
          <p className="mt-2 text-muted-foreground">Revisarlos no los incorpora al cálculo. Si son esenciales para esta operación, hace falta ampliar el motor antes de afirmar fidelidad completa.</p>
          <ul className="mt-2 list-disc pl-4">{checklist.data.withoutMath.map(item => <li key={`${item.section}:${item.field}`}>{item.section} · {item.field}</li>)}</ul>
        </details> : null}
        <p className="text-xs text-muted-foreground">Cada grupo incluye sólo parámetros requeridos o condicionales según el perfil. Abre el detalle, corrige los valores en Supuestos y registra una fuente fechada que respalde el grupo completo.</p>
        {checklist.data.groups.map(group => {
          const source = sourceFor(group.id)
          return <section key={group.id} className="rounded-lg border p-3" aria-label={group.label}>
            <div className="flex flex-wrap items-start justify-between gap-2"><div className="font-medium">{group.label}</div><span className="text-xs text-muted-foreground">{group.fields.length} valores aplicables</span></div>
            <details className="mt-2 text-xs"><summary className="cursor-pointer text-primary">Ver valores y recomendados</summary>
              <div className="mt-2 max-h-48 overflow-auto rounded border">
                <table className="w-full text-xs"><thead><tr className="bg-muted/50"><th className="p-2 text-left">Supuesto</th><th className="p-2 text-right">Versión</th><th className="p-2 text-right">Referencia V3</th></tr></thead>
                  <tbody>{group.fields.map(field => <tr key={`${field.section}:${field.field}`} className="border-t"><td className="p-2">{field.field}<span className="block text-[10px] text-muted-foreground">{field.section} · {field.applicability}</span></td><td className="p-2 text-right tabular-nums">{field.value ?? '—'} {field.unit}</td><td className="p-2 text-right tabular-nums text-muted-foreground">{field.recommended}</td></tr>)}</tbody>
                </table>
              </div>
            </details>
            {checklist.data.versionStatus === 'DRAFT' ? <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <div><Label htmlFor={`source-${group.id}`}>Fuente de los valores</Label><Input id={`source-${group.id}`} value={source.source} placeholder="Ej. reporte de costos Q3 / contrato" maxLength={240} onChange={event => setEdits(prev => ({ ...prev, [group.id]: { ...prev[group.id], source: event.target.value } }))} /></div>
              <div><Label htmlFor={`date-${group.id}`}>Fecha de la fuente</Label><Input id={`date-${group.id}`} type="date" value={source.asOf} onChange={event => setEdits(prev => ({ ...prev, [group.id]: { ...prev[group.id], asOf: event.target.value } }))} /></div>
            </div> : <p className="mt-2 text-xs text-muted-foreground">Fuente: {source.source || 'Sin evidencia'} · {source.asOf || 'sin fecha'}</p>}
          </section>
        })}
        <p className="text-xs text-muted-foreground">La fuente se registra como referencia, no se sube ni se verifica automáticamente. La revisión humana no sustituye una comparación contra viajes reales y facturas.</p>
      </div> : null}
      <DialogFooter className="gap-2">
        <Button variant="outline" render={<Link href={`/assumptions/${versionId}`} />}>Editar supuestos</Button>
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
        {checklist.data?.versionStatus === 'DRAFT' ? <Button disabled={!canSave || save.isPending} onClick={() => save.mutate(sources)}>{save.isPending ? 'Guardando…' : 'Confirmar calibración'}</Button> : null}
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
