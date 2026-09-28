import Link from 'next/link'
import { api } from '@/lib/api'
import { PartnerBaseDetail, PartnerBaseEditor, type TariffBase } from './partner-base-editor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bases de costo · Tarifas de socios' }

export default async function PartnerBasesPage({ searchParams }: {
  searchParams: Promise<{ base?: string; cursor?: string; new?: string }>
}) {
  const query = await searchParams
  const [list, user] = await Promise.all([
    api<{ items: { id: string; code: string; name: string; activeVersionId: string | null; archived: boolean }[]; nextCursor: string | null }>(
      `/partner-bases${typeof query.cursor === 'string' ? `?cursor=${encodeURIComponent(query.cursor)}` : ''}`),
    api<{ role: string }>('/auth/me'),
  ])
  const creating = query.new === '1' && user.role === 'ADMIN'
  const selected = typeof query.base === 'string' ? query.base : list.items[0]?.id
  const base = !creating && selected ? await api<TariffBase>(`/partner-bases/${encodeURIComponent(selected)}`) : null
  return <main className="mx-auto max-w-[1440px] space-y-6 px-3 py-4 sm:px-4">
    <nav aria-label="Modelo de bases" className="flex flex-wrap gap-3 border-b pb-3">
      <Link className="min-h-11 rounded border px-4 py-2" href="/cost-bases">Flota propia</Link>
      <Link aria-current="page" className="min-h-11 rounded bg-primary px-4 py-2 text-primary-foreground" href="/cost-bases/partners">Tarifas de socios</Link>
      <Link className="min-h-11 rounded border px-4 py-2" href="/cost-bases/tires">Calibración de llantas</Link>
    </nav>
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Bases de costo · Tarifas de socios</h1>
      <p className="mt-2 text-sm text-muted-foreground">D2D por ruta y equipo. Conserva tarifas, vigencias y supuestos para reutilizarlos al calcular.</p></div>
      {user.role === 'ADMIN' && <Link className="min-h-11 rounded bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" href="/cost-bases/partners?new=1">Nueva base de socios</Link>}
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-3 rounded border bg-card p-4" aria-label="Bases de tarifas de socios"><h2 className="font-semibold">Bases</h2>
        {!list.items.length && <p className="text-sm text-muted-foreground">Aún no hay bases de socios. No se han cargado tarifas comerciales.</p>}
        {list.items.map(item => <Link key={item.id} href={`/cost-bases/partners?base=${encodeURIComponent(item.id)}`} aria-current={base?.id === item.id ? 'page' : undefined}
          className={`block min-h-11 break-words rounded border p-3 text-sm ${base?.id === item.id ? 'border-primary bg-primary/10' : ''}`}>
          <span className="block font-semibold">{item.name}</span><span className="block text-xs">{item.code} · {item.archived ? 'Retirada · sólo consulta' : item.activeVersionId ? 'Con versión publicada' : 'En preparación'}</span>
        </Link>)}
        {list.nextCursor && <Link className="inline-block min-h-11 py-2 underline" href={`/cost-bases/partners?cursor=${encodeURIComponent(list.nextCursor)}`}>Siguientes bases</Link>}
      </aside>
      {creating ? <PartnerBaseEditor /> : base ? <PartnerBaseDetail key={base.id} base={base} role={user.role} />
        : <section className="rounded border bg-card p-5"><h2 className="font-semibold">Primero configura una base reutilizable</h2><p className="mt-2 text-sm">Necesita ruta, equipo, tarifas MX/US, responsables de cruce, vigencias y supuestos. No se generarán importes predeterminados.</p></section>}
    </div>
  </main>
}
