'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Calculator,
  ChartNoAxesCombined,
  ClipboardList,
  Fuel,
  Gauge,
  History,
  Landmark,
  Layers3,
  LibraryBig,
  MapPinned,
  NotebookTabs,
  Route,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'

type NavigationItem = { href: string; label: string; icon: LucideIcon }

const navigation: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Operación',
    items: [
      { href: '/', label: 'Inicio', icon: Gauge },
      { href: '/quote', label: 'Cotizar', icon: Calculator },
      { href: '/quote-desk', label: 'Quote Desk', icon: NotebookTabs },
      { href: '/quotes', label: 'Historial', icon: History },
    ],
  },
  {
    label: 'Modelo',
    items: [
      { href: '/cost-bases', label: 'Bases de costo', icon: Layers3 },
      { href: '/assumptions', label: 'Supuestos', icon: SlidersHorizontal },
      { href: '/catalog', label: 'Catálogo', icon: ClipboardList },
      { href: '/production', label: 'Rutas', icon: Route },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { href: '/ratebooks', label: 'RateBook', icon: LibraryBig },
      { href: '/market-intelligence', label: 'Mercado', icon: ChartNoAxesCombined },
      { href: '/fuel', label: 'Combustible', icon: Fuel },
      { href: '/scenarios', label: 'Escenarios', icon: Sparkles },
    ],
  },
  {
    label: 'Gobierno',
    items: [
      { href: '/approvals', label: 'Aprobaciones', icon: ShieldCheck },
      { href: '/pilot-readiness', label: 'Piloto', icon: Landmark },
      { href: '/assistant', label: 'Asistente', icon: Bot },
    ],
  },
]

const accountLinks: NavigationItem[] = [
  { href: '/onboarding', label: 'Onboarding', icon: MapPinned },
  { href: '/settings', label: 'Configuración', icon: Settings2 },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavigationLink({
  href,
  label,
  icon: Icon,
  closeOnNavigate = false,
}: NavigationItem & { closeOnNavigate?: boolean }) {
  const pathname = usePathname()
  const active = isActive(pathname, href)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        if (closeOnNavigate) event.currentTarget.closest('details')?.removeAttribute('open')
      }}
      className={[
        'group relative flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
        active
          ? 'bg-sidebar-accent font-medium text-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      ].join(' ')}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  )
}

export function AppNavigation({
  compact = false,
  closeOnNavigate = false,
}: {
  compact?: boolean
  closeOnNavigate?: boolean
}) {
  return (
    <nav aria-label="Navegación principal" className="grid gap-3">
      {navigation.map((group, index) => (
        <section key={group.label} aria-label={group.label} className={`grid gap-0.5 ${index > 0 && !compact ? 'border-t pt-3' : ''}`}>
          {!compact && (
            <h2 className="px-2 pb-1 text-[10px] font-medium tracking-[0.04em] text-muted-foreground uppercase">
              {group.label}
            </h2>
          )}
          {group.items.map((item) => (
            <NavigationLink key={item.href} {...item} closeOnNavigate={closeOnNavigate} />
          ))}
        </section>
      ))}
      <section aria-label="Cuenta" className="grid gap-0.5 border-t pt-3">
        {!compact && <h2 className="px-2.5 pb-1 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">Cuenta</h2>}
        {accountLinks.map((item) => (
          <NavigationLink key={item.href} {...item} closeOnNavigate={closeOnNavigate} />
        ))}
      </section>
    </nav>
  )
}
