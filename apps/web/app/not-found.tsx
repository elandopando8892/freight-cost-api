import Link from 'next/link'
import type { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>404 — Page not found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 text-sm">
          <Link href="/" className="rounded-md border bg-background px-3 py-1.5 shadow-sm hover:bg-accent">
            Go to Dashboard
          </Link>
          <Link href="/login" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
