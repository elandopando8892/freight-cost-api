import Link from 'next/link'
import { redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface Me { id: string; email: string; role: string; orgId: string }

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/assumptions', label: 'Assumptions' },
  { href: '/quote', label: 'Quote' },
  { href: '/fuel', label: 'Fuel' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let me: Me
  try {
    me = await api<Me>('/auth/me')
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect('/login')
    throw err
  }
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold tracking-tight">Freight Cost Model</Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-foreground">{n.label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{me.email}</span>
            <form action="/api/auth/logout" method="POST">
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  )
}
