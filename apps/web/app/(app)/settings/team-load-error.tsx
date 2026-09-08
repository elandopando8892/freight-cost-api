import { buttonVariants } from '@/components/ui/button'

export function TeamLoadError() {
  return (
    <section className="grid gap-4" aria-labelledby="team-members-heading">
      <h3 id="team-members-heading" className="text-sm font-medium">Equipo</h3>
      <div className="rounded-md border border-l-4 border-l-primary p-4">
        <div role="alert">
          <p className="text-sm font-medium">No pudimos cargar el equipo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Reintenta para consultar los integrantes y sus permisos.
          </p>
        </div>
        <form action="/settings" method="get" className="mt-3">
          <button type="submit" className={buttonVariants({ variant: 'outline', className: 'min-h-11' })}>
            Reintentar
          </button>
        </form>
      </div>
    </section>
  )
}
