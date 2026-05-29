export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-4 grid gap-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
        <div className="hidden h-72 animate-pulse rounded-md border bg-muted/40 lg:block" />
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted/40" />
          ))}
        </div>
      </div>
    </main>
  )
}
