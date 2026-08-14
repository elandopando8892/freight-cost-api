'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, GitBranch, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetcher } from '@/lib/fetcher'

export interface PublishedRateBook {
  id: string
  code: string
  name: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  currency: string
  effectiveFrom: string
  _count: { entries: number }
}

interface Candidate {
  id: string
  operation: string
  service: string
  requiredTariffUsd: number
  requiredTariffMxn: number
  lane: { origin: string; destination: string } | null
  productionRoute: { origin: string; destination: string } | null
}

interface Preview {
  source: {
    id: string
    code: string
    name: string
    assumptionSetId: string
    entryCount: number
  }
  activeSet: { id: string; name: string; version: number } | null
  requiresRegeneration: boolean
  entries: {
    id: string
    origin: string
    destination: string
    operation: string
    current: boolean
    reasons: string[]
  }[]
  candidates: Candidate[]
}

export function RegenerationBoard({
  books,
  today,
}: {
  books: PublishedRateBook[]
  today: string
}) {
  const router = useRouter()
  const [bookId, setBookId] = useState(books[0]?.id ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(today)

  const inspect = useMutation({
    mutationFn: (id: string) =>
      fetcher<Preview>(`/api/v1/ratebooks/${id}/regeneration-preview`),
    onSuccess: () => {
      setSelected(new Set())
      setNote('')
    },
  })
  const create = useMutation({
    mutationFn: () =>
      fetcher<{ code: string }>(`/api/v1/ratebooks/${bookId}/regeneration-drafts`, {
        method: 'POST',
        json: { note, effectiveFrom, quoteIds: [...selected] },
      }),
    onSuccess: (draft) => {
      router.push(`/ratebooks?created=${encodeURIComponent(draft.code)}`)
    },
  })
  const preview = inspect.data

  const pick = (id: string) => {
    setSelected((items) => {
      const next = new Set(items)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Regeneración controlada</h1>
          <p className="text-sm text-muted-foreground">
            El sistema propone un borrador; un administrador revisa y publica.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2"
          href="/ratebooks"
        >
          <ArrowLeft className="h-4 w-4" /> RateBook
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <label className="grid gap-1 text-sm">
            <span>RateBook publicado</span>
            <select
              className="h-9 min-w-72 rounded-md border bg-background px-3"
              value={bookId}
              onChange={(event) => {
                setBookId(event.target.value)
                inspect.reset()
                setSelected(new Set())
              }}
            >
              <option value="">Selecciona…</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.code} — {book.name}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={!bookId || inspect.isPending} onClick={() => inspect.mutate(bookId)}>
            Analizar cambios
          </Button>
        </CardContent>
      </Card>

      {books.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay RateBooks publicados para revisar.
          </CardContent>
        </Card>
      )}

      {preview && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TriangleAlert
                  className={
                    preview.requiresRegeneration
                      ? 'h-5 w-5 text-amber-600'
                      : 'h-5 w-5 text-emerald-600'
                  }
                />
                {preview.requiresRegeneration ? 'Revisión requerida' : 'Sin regeneración requerida'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm">
                Fuente: <strong>{preview.source.code}</strong> · {preview.source.entryCount} entradas.
                Versión activa:{' '}
                {preview.activeSet
                  ? `${preview.activeSet.name} v${preview.activeSet.version}`
                  : 'no disponible'}.
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="p-2 text-left" scope="col">Ruta</th>
                      <th className="text-left" scope="col">Operación</th>
                      <th className="text-left" scope="col">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.entries.map((entry) => (
                      <tr key={entry.id} className="border-b">
                        <td className="p-2">{entry.origin} → {entry.destination}</td>
                        <td>{entry.operation}</td>
                        <td>
                          {entry.current ? (
                            <span className="text-emerald-700">Sin cambio detectado</span>
                          ) : (
                            <span className="text-amber-700">{entry.reasons.join(' · ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {preview.requiresRegeneration && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" /> Proponer borrador regenerado
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  Selecciona cotizaciones confirmadas de la versión activa. Se copiarán como
                  snapshots a un nuevo borrador; el libro fuente permanece publicado.
                </p>
                {preview.candidates.length === 0 ? (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                    No hay cotizaciones confirmadas compatibles todavía.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sr-only">
                        <tr>
                          <th scope="col">Seleccionar</th>
                          <th scope="col">Ruta</th>
                          <th scope="col">Operación</th>
                          <th scope="col">Tarifa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.candidates.map((candidate) => {
                          const route = candidate.productionRoute ?? candidate.lane
                          const routeLabel = route
                            ? `${route.origin} a ${route.destination}`
                            : 'ruta no disponible'
                          return (
                            <tr key={candidate.id} className="border-b">
                              <td className="p-2">
                                <input
                                  aria-label={`Seleccionar ${routeLabel}`}
                                  type="checkbox"
                                  checked={selected.has(candidate.id)}
                                  onChange={() => pick(candidate.id)}
                                />
                              </td>
                              <td>{route ? `${route.origin} → ${route.destination}` : 'Ruta no disponible'}</td>
                              <td>{candidate.operation}</td>
                              <td className="p-2 text-right">
                                {candidate.requiredTariffUsd.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid gap-1 text-sm" htmlFor="regeneration-effective-from">
                    <span>Inicio de vigencia</span>
                    <Input
                      id="regeneration-effective-from"
                      className="w-64"
                      type="date"
                      required
                      value={effectiveFrom}
                      onChange={(event) => setEffectiveFrom(event.target.value)}
                    />
                  </label>
                  <label
                    className="grid min-w-72 flex-1 gap-1 text-sm"
                    htmlFor="regeneration-note"
                  >
                    <span>Motivo y alcance</span>
                    <Input
                      id="regeneration-note"
                      placeholder="Motivo de regeneración y alcance revisado"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </label>
                  <Button
                    disabled={
                      selected.size === 0 ||
                      !effectiveFrom ||
                      note.trim().length < 3 ||
                      create.isPending
                    }
                    onClick={() => create.mutate()}
                  >
                    Crear borrador
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
