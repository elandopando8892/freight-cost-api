import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { RegenerationBoard, type PublishedRateBook } from './regeneration-board'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'RateBook regeneration' }

export default async function RegenerationPage() {
  const books = await api<PublishedRateBook[]>('/ratebooks')
  return <main className="mx-auto w-full max-w-5xl px-4 py-8"><RegenerationBoard books={books.filter((book) => book.status === 'PUBLISHED')} /></main>
}
