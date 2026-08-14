import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { Editor, type Param, type Grouped } from './editor'

interface SetMeta {
  id: string
  name: string
  version: number
  isActive: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: string | null
  notes: string | null
  costBase: {
    id: string
    code: string
    name: string
    scope: 'CROSS_BORDER' | 'DRAYAGE' | 'LOCAL' | 'INTRA_MEX' | 'INTRA_US'
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  } | null
}

const scopeLabels: Record<NonNullable<SetMeta['costBase']>['scope'], string> = {
  CROSS_BORDER: 'Cross-border',
  DRAYAGE: 'Drayage',
  LOCAL: 'Local',
  INTRA_MEX: 'Intra-México',
  INTRA_US: 'Intra-EE. UU.',
}

export async function generateMetadata(
  { params }: { params: Promise<{ setId: string }> },
): Promise<Metadata> {
  try {
    const { setId } = await params
    const sets = await api<SetMeta[]>('/assumptions/sets')
    const set = sets.find((s) => s.id === setId)
    return { title: set ? `${set.name} · Supuestos` : 'Supuestos' }
  } catch {
    return { title: 'Supuestos' }
  }
}

export default async function AssumptionsEditorPage(
  { params }: { params: Promise<{ setId: string }> },
) {
  const { setId } = await params
  let set: SetMeta | null = null
  let grouped: Grouped | null = null
  let canEdit = false
  try {
    const [sets, user] = await Promise.all([
      api<SetMeta[]>('/assumptions/sets'),
      api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
    ])
    canEdit = user.role === 'ADMIN'
    set = sets.find((s) => s.id === setId) ?? null
    if (!set) notFound()
    grouped = await api<Grouped>(`/assumptions/sets/${setId}/params`)
  } catch {
    notFound()
  }
  // Build a sorted list of sections (stable order so the UI doesn't jump).
  const sections = Object.keys(grouped).sort()
  const total = sections.reduce((n, s) => n + (grouped[s]?.length ?? 0), 0)
  const outOfRange = sections.reduce(
    (n, s) => n + (grouped[s]?.filter((p: Param) => p.outOfRange).length ?? 0),
    0,
  )
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4">
      <header className="mb-4 border-b pb-3">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span>Control de costos</span>
          <span aria-hidden="true">/</span>
          <Link href="/assumptions" className="hover:text-foreground">Supuestos</Link>
          {set.costBase ? <><span aria-hidden="true">/</span><span>{set.costBase.code}</span></> : null}
        </div>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
          <span>{set.costBase?.name ?? set.name}</span>
          <span className="text-sm font-normal text-muted-foreground">v{set.version}</span>
          {set.isActive && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Activa
            </span>
          )}
          {set.status === 'PUBLISHED' && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Publicada · bloqueada</span>}
          {set.status === 'ARCHIVED' && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Archivada · bloqueada</span>}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {set.costBase ? `${scopeLabels[set.costBase.scope]} · ` : ''}{total} parámetros · {outOfRange} fuera del rango recomendado · agrupados por sección
        </p>
        {set.notes ? <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{set.notes}</p> : null}
      </header>
      {(set.status !== 'DRAFT' || !canEdit) && (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-50/40 px-3 py-2 text-sm text-muted-foreground dark:bg-amber-950/20">
          {canEdit
            ? <>Esta versión está {set.status === 'PUBLISHED' ? 'publicada' : 'archivada'} y no puede modificarse. Crea un nuevo borrador desde{' '}<Link href="/cost-bases" className="font-medium text-foreground underline underline-offset-2">Bases de costo</Link> para realizar cambios.</>
            : 'Modo consulta: sólo un administrador puede modificar versiones de supuestos.'}
        </div>
      )}
      <Editor setId={setId} initial={grouped} sections={sections} readOnly={set.status !== 'DRAFT' || !canEdit} />
    </main>
  )
}
