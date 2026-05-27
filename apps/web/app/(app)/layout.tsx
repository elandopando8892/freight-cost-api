import Link from 'next/link'
import { redirect } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import { SignOutButton } from './sign-out-button'
import { NavLink } from './nav-link'

interface Me { id: string; email: string; role: string; orgId: string }

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/assumptions', label: 'Assumptions' },
  { href: '/quote', label: 'Quote' },
  { href: '/quotes', label: 'History' },
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
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            {/* Mobile: hamburger dropdown (zero-JS via <details>) */}
            <details className="relative md:hidden">
              <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border text-muted-foreground">
                <span aria-hidden>☰</span>
              </summary>
              <nav className="absolute left-0 z-20 mt-2 grid w-44 gap-1 rounded-md border bg-popover p-2 text-sm shadow-md">
                {NAV.map((n) => <NavLink key={n.href} {...n} variant="mobile" />)}
                <div className="my-1 border-t" />
                <div className="px-2 py-1 text-xs text-muted-foreground truncate">{me.email}</div>
                <div className="px-1">
                  <SignOutButton />
                </div>
              </nav>
            </details>
            <Link href="/" className="truncate text-sm font-semibold tracking-tight">Freight Cost Model</Link>
            {/* Desktop nav */}
            <nav className="hidden items-center gap-4 text-sm md:flex">
              {NAV.map((n) => <NavLink key={n.href} {...n} />)}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden truncate text-muted-foreground sm:inline">{me.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  )
}
