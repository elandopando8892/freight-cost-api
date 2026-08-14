import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components'
import { Menu, Waypoints } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AppNavigation } from './app-navigation'
import { ThemeToggle } from './theme-toggle'

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
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r bg-sidebar px-3 py-4 print:hidden lg:flex lg:flex-col">
        <Link href="/" className="mb-6 flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-accent">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Waypoints className="size-4" aria-hidden />
          </span>
          <span className="grid leading-tight">
            <span className="text-sm font-semibold tracking-tight">Freight Cost</span>
            <span className="text-[10px] text-muted-foreground">Rateware family</span>
          </span>
        </Link>
        <div className="min-h-0 flex-1">
          <AppNavigation />
        </div>
        <div className="mt-5 border-t pt-4">
          <Link href="/settings" className="flex items-center gap-2 rounded-lg p-2 hover:bg-accent">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{init}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">{name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{email}</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background/90 print:hidden backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <details className="relative lg:hidden">
                <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg border bg-card text-muted-foreground hover:bg-accent">
                  <Menu className="size-4" aria-hidden />
                  <span className="sr-only">Abrir navegación</span>
                </summary>
                <div className="absolute left-0 z-30 mt-2 max-h-[calc(100dvh-4.5rem)] w-72 overflow-y-auto rounded-xl border bg-popover p-3 shadow-xl">
                  <AppNavigation compact closeOnNavigate />
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-2 truncate px-2.5 text-xs text-muted-foreground">{email}</p>
                    <LogoutLink className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-full justify-start' })}>
                      Cerrar sesión
                    </LogoutLink>
                  </div>
                </div>
              </details>
              <div className="min-w-0">
                <p className="hidden text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:block">Control de costos</p>
                <Link href="/" className="block truncate text-sm font-semibold tracking-tight lg:hidden">Freight Cost Model</Link>
                <p className="hidden text-sm font-medium lg:block">Workspace operativo</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ThemeToggle />
              <Link href="/settings" title="Configuración" aria-label="Abrir configuración de cuenta" className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-accent">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{init}</span>
                <span className="hidden max-w-[150px] truncate text-muted-foreground xl:inline">{name}</span>
              </Link>
              <LogoutLink className={buttonVariants({ variant: 'outline', size: 'sm', className: 'hidden sm:inline-flex' })}>
                Cerrar sesión
              </LogoutLink>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
