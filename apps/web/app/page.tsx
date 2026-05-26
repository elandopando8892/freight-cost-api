import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

interface Me { id: string; email: string; role: string; orgId: string }

export default async function HomePage() {
  let me: Me
  try {
    me = await api<Me>('/auth/me')
  } catch (err) {
    // No session / expired — proxy.ts should also catch this, but defensive.
    if (err instanceof ApiError && err.status === 401) redirect('/login')
    throw err
  }
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Freight Cost Model</h1>
        <form action="/api/auth/logout" method="POST">
          <Button variant="ghost" type="submit">Sign out</Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Signed in</CardTitle>
          <CardDescription>Session active — JWT held server-side in an httpOnly cookie.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <div><span className="text-muted-foreground">User:</span> {me.email}</div>
          <div><span className="text-muted-foreground">Role:</span> {me.role}</div>
          <div><span className="text-muted-foreground">Org:</span> {me.orgId}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next</CardTitle>
          <CardDescription>
            Editor de assumptions (con recommended/rango/reset), cotización por ruta (ZIP → metro), desglose
            MX/USA + sell tiers + ReferenceKey, dashboard de fuel. Llegamos en las próximas iteraciones.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
