import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { Editor, type Param, type Grouped } from './editor'
import { defaultProfile, type CostBaseProfile } from '../../cost-bases/cost-base-profile'

interface SetMeta {
  id: string
  name: string
  version: number
  isActive: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: string | null
  notes: string | null
  applicabilityContext: CostBaseProfile | null
  costBase: {
    id: string
    code: string
    name: string
    scope: 'CROSS_BORDER' | 'DRAYAGE' | 'LOCAL' | 'INTRA_MEX' | 'INTRA_US'
    defaultPolicy: 'OPERATIONAL_V3' | 'WORKBOOK_V3'
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
  const notApplicable = sections.reduce(
    (n, s) => n + (grouped[s]?.filter((p: Param) => p.applicability === 'NOT_APPLICABLE').length ?? 0),
    0,
  )
  const required = sections.reduce(
    (n, s) => n + (grouped[s]?.filter((p: Param) => p.applicability === 'REQUIRED').length ?? 0),
    0,
  )
  const conditional = sections.reduce(
    (n, s) => n + (grouped[s]?.filter((p: Param) => p.applicability === 'CONDITIONAL').length ?? 0),
    0,
  )
  const optional = sections.reduce(
    (n, s) => n + (grouped[s]?.filter((p: Param) => p.applicability === 'OPTIONAL').length ?? 0),
    0,
  )
  const notImplemented = sections.reduce(
    (n, s) => n + (grouped[s]?.filter((p: Param) => p.applicability === 'NOT_IMPLEMENTED').length ?? 0),
    0,
  )
  const outOfRange = sections.reduce(
    (n, s) => n + (grouped[s]?.filter((p: Param) => p.outOfRange).length ?? 0),
    0,
  )
  const readOnlyReason = set.status === 'PUBLISHED'
    ? 'PUBLISHED' as const
    : set.status === 'ARCHIVED'
      ? 'ARCHIVED' as const
      : !canEdit
        ? 'PERMISSION' as const
        : null
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
          {set.costBase ? `${scopeLabels[set.costBase.scope]} · ` : ''}{required} requeridos · {conditional} condicionales · {optional} opcionales · {notImplemented} sin efecto matemático · {notApplicable} no aplican · {total} en snapshot · {outOfRange} fuera de rango
        </p>
        {set.notes ? <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{set.notes}</p> : null}
      </header>
      {readOnlyReason && (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-50/40 px-3 py-2 text-sm text-muted-foreground dark:bg-amber-950/20">
          {readOnlyReason === 'PERMISSION' ? (
            'Modo consulta: sólo un administrador puede modificar versiones de supuestos.'
          ) : canEdit ? (
            <>Esta versión está {readOnlyReason === 'PUBLISHED' ? 'publicada' : 'archivada'} y no puede modificarse. Crea un nuevo borrador desde{' '}<Link href="/cost-bases" className="font-medium text-foreground underline underline-offset-2">Bases de costo</Link> para realizar cambios.</>
          ) : (
            <>Esta versión está {readOnlyReason === 'PUBLISHED' ? 'publicada' : 'archivada'} y no puede modificarse. Solicita a un administrador que cree un nuevo borrador.</>
          )}
        </div>
      )}
      <Editor
        setId={setId}
        costBaseId={set.costBase?.id ?? null}
        initialProfile={set.costBase ? (set.applicabilityContext ?? defaultProfile(set.costBase.scope, set.costBase.defaultPolicy)) : null}
        initialProfilePersisted={Boolean(set.applicabilityContext)}
        initial={grouped}
        sections={sections}
        readOnly={readOnlyReason !== null}
        readOnlyReason={readOnlyReason}
      />
    </main>
  )
}
