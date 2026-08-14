export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4" aria-busy="true" aria-label="Cargando workspace">
      <div className="mb-3 flex items-center gap-2 border-b pb-3">
        <div className="size-8 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-1.5">
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
          <div className="h-3 w-72 max-w-[70vw] animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="grid content-start gap-1 rounded-lg border bg-card p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted/50" />
          ))}
        </div>
        <div className="grid min-w-0 content-start gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md border bg-muted/40" />
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="h-10 animate-pulse border-b bg-muted/60" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse border-b bg-muted/20 last:border-b-0" />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Cargando información operativa…</span>
    </main>
  )
}
