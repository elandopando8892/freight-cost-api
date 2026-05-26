export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 grid gap-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    </main>
  )
}
