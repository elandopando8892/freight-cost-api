import Link from 'next/link'
import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Not found' }

export default function AppNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>404 — Not found</CardTitle>
          <CardDescription>
            We couldn&apos;t find that page. It may have moved or you may not have access to it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Link href="/" className="rounded-md border bg-background px-3 py-1.5 shadow-sm hover:bg-accent">
            Dashboard
          </Link>
          <Link href="/assumptions" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">
            Assumptions
          </Link>
          <Link href="/quote" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">
            Quote
          </Link>
          <Link href="/quotes" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">
            History
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
