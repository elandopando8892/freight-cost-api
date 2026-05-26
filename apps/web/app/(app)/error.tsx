'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>The page hit an unexpected error. You can try again, or head back to the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">{error.message}</pre>
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => { window.location.href = '/' }}>Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
