export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4" aria-busy="true" aria-label="Cargando cotización">
      <header className="mb-4 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
          <div className="h-6 w-52 animate-pulse rounded bg-muted" />
          <div className="h-3 w-80 max-w-[70vw] animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-44 animate-pulse rounded border bg-muted/50" />
      </header>

      <div className="mb-4 grid max-w-xl grid-cols-2 gap-1 rounded-md border bg-muted/30 p-1">
        <div className="h-14 animate-pulse rounded bg-background shadow-sm" />
        <div className="h-14 animate-pulse rounded bg-muted/20" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="grid gap-4 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="h-12 animate-pulse rounded border bg-muted/40" />
              <div className="h-12 animate-pulse rounded border bg-muted/40" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="h-12 animate-pulse rounded border bg-muted/40" />
              <div className="h-12 animate-pulse rounded border bg-muted/40" />
            </div>
            <div className="h-16 animate-pulse rounded border bg-muted/25" />
            <div className="flex justify-end">
              <div className="h-9 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </section>

        <aside className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="grid gap-4 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid gap-1">
                <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
            ))}
            <div className="mt-2 h-12 animate-pulse rounded bg-muted/50" />
          </div>
        </aside>
      </div>
      <span className="sr-only" aria-live="polite">Cargando datos de la cotización y bases de costo…</span>
    </main>
  )
}
