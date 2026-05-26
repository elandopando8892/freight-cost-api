import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AssumptionSet {
  id: string
  name: string
  version: number
  isActive: boolean
  notes: string | null
  createdAt: string
}

export default async function AssumptionsListPage() {
  const sets = await api<AssumptionSet[]>('/assumptions/sets')
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assumptions</h1>
          <p className="text-sm text-muted-foreground">Choose a set to edit its cost cards, factors, and assumptions.</p>
        </div>
        <span className="text-sm text-muted-foreground">{sets.length} set{sets.length === 1 ? '' : 's'}</span>
      </div>

      {sets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No sets yet</CardTitle>
            <CardDescription>Create your first assumption set to start configuring your model.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <Link key={s.id} href={`/assumptions/${s.id}`} className="block">
              <Card className="h-full transition hover:border-foreground/40">
                <CardHeader>
                  <CardTitle className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{s.name}</span>
                    {s.isActive && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        active
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>v{s.version} · {new Date(s.createdAt).toLocaleDateString()}</CardDescription>
                </CardHeader>
                {s.notes && (
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.notes}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
