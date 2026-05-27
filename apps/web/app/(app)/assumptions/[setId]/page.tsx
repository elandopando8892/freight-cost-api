import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { Editor, type Param, type Grouped } from './editor'

interface SetMeta { id: string; name: string; version: number; isActive: boolean; notes: string | null }

export async function generateMetadata(
  { params }: { params: Promise<{ setId: string }> },
): Promise<Metadata> {
  try {
    const { setId } = await params
    const sets = await api<SetMeta[]>('/assumptions/sets')
    const set = sets.find((s) => s.id === setId)
    return { title: set ? `${set.name} · Assumptions` : 'Assumptions' }
  } catch {
    return { title: 'Assumptions' }
  }
}

export default async function AssumptionsEditorPage(
  { params }: { params: Promise<{ setId: string }> },
) {
  const { setId } = await params
  let set: SetMeta | null = null
  let grouped: Grouped | null = null
  try {
    const sets = await api<SetMeta[]>('/assumptions/sets')
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {set.name} <span className="ml-2 text-sm font-normal text-muted-foreground">v{set.version}</span>
          {set.isActive && (
            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              active
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {total} parameters · {outOfRange} out of recommended range · grouped by section
        </p>
      </header>
      <Editor setId={setId} initial={grouped} sections={sections} />
    </main>
  )
}
