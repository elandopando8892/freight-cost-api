'use client'

import Link from 'next/link'

export default function SavedPartnerCostsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
    <h1 className="text-2xl font-semibold">No se pudo consultar la estimación</h1>
    <p role="alert">No pudimos leer el historial. No vuelvas a guardar una captura sólo por este error: reintenta la consulta para comprobar si ya existe.</p>
    <button type="button" onClick={retry} className="min-h-11 rounded bg-primary px-5 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring">Reintentar consulta</button>
    <Link href="/quote/partners/saved" className="block min-h-11 py-2 underline">Volver al historial</Link>
  </main>
}
