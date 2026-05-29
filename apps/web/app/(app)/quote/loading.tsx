export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 grid gap-2">
        <div className="h-7 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[400px_1fr] lg:items-start">
        <div className="h-[420px] animate-pulse rounded-lg border bg-muted/40" />
        <div className="h-72 animate-pulse rounded-lg border bg-muted/40" />
      </div>
    </main>
  )
}
