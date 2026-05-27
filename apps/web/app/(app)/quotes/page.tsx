import Link from 'next/link'
import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QuotesList, type SavedQuote } from './quotes-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quote history' }

export default async function QuotesHistoryPage() {
  const quotes = await api<SavedQuote[]>('/quotes')
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quote history</h1>
          <p className="text-sm text-muted-foreground">Saved quotes from this org — most recent first.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {quotes.length} saved
          </span>
          <Link
            href="/quote"
            className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent"
          >
            New quote
          </Link>
        </div>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No saved quotes yet</CardTitle>
            <CardDescription>
              Run a quote and click <strong>Save quote</strong> on the result panel to keep a record here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/quote" className="text-sm underline underline-offset-2">Go to Quote →</Link>
          </CardContent>
        </Card>
      ) : (
        <QuotesList initial={quotes} />
      )}
    </main>
  )
}
