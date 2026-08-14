'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-[1440px] place-items-center px-3 py-8 sm:px-4">
      <section className="w-full max-w-xl rounded-lg border bg-card p-5 text-center" role="alert" aria-labelledby="workspace-error-title">
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
        </span>
        <h1 id="workspace-error-title" className="mt-3 text-lg font-semibold">
          No se pudo cargar este workspace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tus datos no fueron modificados. Puedes reintentar la consulta o volver al inicio.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">Referencia: {error.digest}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>Reintentar</Button>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>Volver al inicio</Link>
        </div>
      </section>
    </main>
  )
}
