import Link from 'next/link'
import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QuotesList, type SavedQuote } from './quotes-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Historial de cotizaciones' }

export default async function QuotesHistoryPage() {
  const [quotes, user] = await Promise.all([
    api<SavedQuote[]>('/quotes'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
  ])
  const canEdit = user.role !== 'VIEWER'
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Motor de cotización</p>
          <h1 className="text-xl font-semibold tracking-tight">Historial de cotizaciones</h1>
          <p className="mt-1 text-xs text-muted-foreground">Cálculos guardados por la organización, del más reciente al más antiguo.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {quotes.length} guardadas
          </span>
          {canEdit ? <Link
            href="/quote"
            className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent"
          >
            Nueva cotización
          </Link> : <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Modo consulta</span>}
        </div>
      </header>

      {quotes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay cotizaciones guardadas</CardTitle>
            <CardDescription>
              {canEdit ? <>Genera una tarifa y selecciona <strong>Guardar cotización</strong> para conservarla en este historial.</> : 'No hay cotizaciones disponibles para consulta.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canEdit ? <Link href="/quote" className="text-sm underline underline-offset-2">Ir al cotizador →</Link> : null}
          </CardContent>
        </Card>
      ) : (
        <QuotesList initial={quotes} canEdit={canEdit} />
      )}
    </main>
  )
}
