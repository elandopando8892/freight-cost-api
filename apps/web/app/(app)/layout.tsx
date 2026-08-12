import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components'
import { buttonVariants } from '@/components/ui/button'
import { NavLink } from './nav-link'
import { ThemeToggle } from './theme-toggle'

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/assumptions', label: 'Assumptions' },
  { href: '/cost-bases', label: 'Bases' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/production', label: 'Rutas' },
  { href: '/quote', label: 'Quote' },
  { href: '/quotes', label: 'History' },
  { href: '/ratebooks', label: 'RateBook' },
  { href: '/market-intelligence', label: 'Market' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/pilot-readiness', label: 'Pilot' },
  { href: '/assistant', label: 'AI' },
  { href: '/scenarios', label: 'Scenarios' },
  { href: '/fuel', label: 'Fuel' },
]

function initials(name: string, email: string): string {
  const base = (name || email || '?').trim()
  const parts = base.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { getUser, isAuthenticated } = getKindeServerSession()
  // proxy.ts already gates these routes; this is a belt-and-suspenders check.
  if (!(await isAuthenticated())) redirect('/login')
  const user = await getUser()
  const email = user?.email ?? ''
  const name = [user?.given_name, user?.family_name].filter(Boolean).join(' ') || email
  const init = initials(name, email)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            {/* Mobile: hamburger dropdown (zero-JS via <details>) */}
            <details className="relative md:hidden">
              <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border text-muted-foreground">
                <span aria-hidden>☰</span>
              </summary>
              <nav className="absolute left-0 z-20 mt-2 grid w-44 gap-1 rounded-md border bg-popover p-2 text-sm shadow-md">
                {NAV.map((n) => <NavLink key={n.href} {...n} variant="mobile" />)}
                <NavLink href="/settings" label="Settings" variant="mobile" />
                <div className="my-1 border-t" />
                <div className="px-2 py-1 text-xs text-muted-foreground truncate">{email}</div>
                <LogoutLink className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'justify-start' })}>
                  Sign out
                </LogoutLink>
              </nav>
            </details>
            <Link href="/" className="truncate text-sm font-semibold tracking-tight">Freight Cost Model</Link>
            {/* Desktop nav */}
            <nav className="hidden items-center gap-4 text-sm md:flex">
              {NAV.map((n) => <NavLink key={n.href} {...n} />)}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <Link href="/settings" title="Settings" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{init}</span>
              <span className="hidden max-w-[140px] truncate text-muted-foreground sm:inline">{name}</span>
            </Link>
            <LogoutLink className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Sign out
            </LogoutLink>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  )
}
