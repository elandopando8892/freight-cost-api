import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { dateKeyInTimeZone } from '@/lib/civil-date'
import { RegenerationBoard, type PublishedRateBook } from './regeneration-board'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Regeneración de RateBook' }

export default async function RegenerationPage() {
  const [books, user] = await Promise.all([
    api<PublishedRateBook[]>('/ratebooks'),
    api<{ role: 'ADMIN' | 'OPERATOR' | 'VIEWER' }>('/auth/me'),
  ])
  const today = dateKeyInTimeZone(new Date())
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4">
      {user.role === 'ADMIN' ? (
        <RegenerationBoard books={books.filter((book) => book.status === 'PUBLISHED')} today={today} />
      ) : (
        <section className="rounded-lg border bg-card p-5 text-center" aria-labelledby="regeneration-permission-title">
          <h1 id="regeneration-permission-title" className="text-lg font-semibold">Regeneración restringida</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sólo un administrador puede preparar una nueva versión en borrador.</p>
          <Link href="/ratebooks" className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2">Volver a RateBook</Link>
        </section>
      )}
    </main>
  )
}
