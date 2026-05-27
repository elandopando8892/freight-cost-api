'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLink({
  href, label, variant = 'desktop',
}: {
  href: string
  label: string
  variant?: 'desktop' | 'mobile'
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href)
  if (variant === 'mobile') {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`rounded px-2 py-1.5 hover:bg-accent ${active ? 'bg-accent font-medium text-foreground' : ''}`}
      >
        {label}
      </Link>
    )
  }
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}
    >
      {label}
    </Link>
  )
}
