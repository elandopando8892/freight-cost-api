export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 grid gap-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mb-3 flex gap-2">
        <div className="h-9 w-full max-w-xs animate-pulse rounded-md bg-muted/60" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted/60" />
        <div className="ml-auto h-9 w-28 animate-pulse rounded-md bg-muted/60" />
      </div>
      <div className="rounded-lg border">
        <div className="h-10 animate-pulse rounded-t-lg bg-muted/50" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse border-t bg-muted/20" />
        ))}
      </div>
    </main>
  )
}
