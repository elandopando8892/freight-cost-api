import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Menu } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../auth/actions'
import { AppNavigation } from './app-navigation'
import { ThemeToggle } from './theme-toggle'

function initials(name: string, email: string): string {
  const base = (name || email || '?').trim()
  const parts = base.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

interface OrgContext { name: string }
interface UserContext { role: string }

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [org, me] = await Promise.all([
    api<OrgContext>('/org').catch(() => null),
    api<UserContext>('/auth/me').catch(() => null),
  ])
  const email = user.email ?? ''
  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
  const name = metadataName || email
  const init = initials(name, email)

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[12.25rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Ir al contenido principal
      </a>
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r bg-sidebar px-2.5 py-3.5 print:hidden lg:flex lg:flex-col">
        <Link href="/" className="mb-3 block border-b border-sidebar-border px-1 pb-3 pt-1">
          <span className="block rounded-sm bg-[#efefef] px-2.5 py-2">
            <Image
              src="/brand/marksman-logo.png"
              alt="MARKSMAN — Precision Freight Networks"
              width={458}
              height={54}
              priority
              className="h-auto w-full"
            />
          </span>
          <span className="mt-2 block px-1 font-mono text-[9px] font-bold tracking-[0.14em] text-sidebar-foreground/65 uppercase">
            Freight Cost Model
          </span>
        </Link>
        <div className="min-h-0 flex-1">
          <AppNavigation />
        </div>
        <div className="mt-3 border-t px-2 pt-3">
          <Link href="/settings" className="flex items-center gap-2 rounded-md hover:text-sidebar-accent-foreground">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">{init}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-foreground">{name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{me?.role ?? email}</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b bg-card/95 print:hidden backdrop-blur">
          <div className="flex h-12 items-center justify-between gap-3 px-[18px]">
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
                    <form action={logout}>
                      <button className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-full justify-start' })}>
                        Cerrar sesión
                      </button>
                    </form>
                  </div>
                </div>
              </details>
              <div className="min-w-0 lg:flex lg:items-baseline lg:gap-2">
                <p className="hidden text-xs text-muted-foreground lg:block">Organización</p>
                <Link href="/" className="block truncate text-sm font-semibold tracking-tight lg:hidden">MARKSMAN · Freight Cost Model</Link>
                <p className="hidden text-sm font-medium lg:block">{org?.name ?? 'Workspace operativo'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ThemeToggle />
              <Link href="/settings" title="Configuración" aria-label="Abrir configuración de cuenta" className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-accent">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">{init}</span>
                <span className="hidden max-w-[150px] truncate text-muted-foreground xl:inline">{name}</span>
              </Link>
              <form action={logout} className="hidden sm:block">
                <button className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </header>
        <div id="main-content" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </div>
      </div>
    </div>
  )
}
