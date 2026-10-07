import type { ReactNode } from 'react'
import './fixture.css'

export default function FixtureLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body><p className="border-b bg-muted px-6 py-3 text-sm">QA aislado · consultas fallidas · sin sesión ni datos reales</p>{children}</body></html>
}
