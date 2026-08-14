"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCivilDate } from "@/lib/civil-date";
import { fetcher } from "@/lib/fetcher";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export interface RateBookEntry {
  id: string;
  origin: string;
  destination: string;
  operation: string;
  service: string;
  equipment: string | null;
  config: string | null;
  publishedTariff: number;
  currency: string;
  sourceQuoteId: string;
}
export interface RateBook {
  id: string;
  code: string;
  name: string;
  currency: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  status: Status;
  notes: string | null;
  publicationNote: string | null;
  publishedAt: string | null;
  costBase: {
    id: string;
    code: string;
    name: string;
    scope: string;
    status: string;
  };
  set: { id: string; name: string; version: number; status: string };
  _count: { entries: number };
  entries?: RateBookEntry[];
}
export interface CostBaseOption {
  id: string;
  code: string;
  name: string;
  currency: string;
  status: string;
  scope: string;
  versions: {
    id: string;
    name: string;
    version: number;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }[];
}
interface Candidate {
  id: string;
  label: string | null;
  operation: string;
  service: string;
  requiredTariffUsd: number;
  requiredTariffMxn: number;
  lane: { origin: string; destination: string; config: string } | null;
  productionRoute: {
    origin: string;
    destination: string;
    config: string;
  } | null;
}
interface RateBookLineage {
  policy: "READ_ONLY_LINEAGE_NO_RATEWARE_DELIVERY";
  rateBook: {
    id: string;
    code: string;
    status: Status;
    sourceRateBook: {
      id: string;
      code: string;
      name: string;
      status: Status;
    } | null;
    costBase: { code: string; name: string; scope: string; status: string };
    set: {
      id: string;
      name: string;
      version: number;
      status: string;
      scenarioReviewSource: {
        id: string;
        status: string;
        sourceChecksum: string;
        quoteId: string;
        reviewedAt: string | null;
      } | null;
    };
    ratewareDeliveries: {
      id: string;
      status: "DELIVERED" | "FAILED";
      approvalRequestId: string | null;
      receiptId: string | null;
      attemptedAt: string;
      deliveredAt: string | null;
      error: string | null;
      approvalRequest: {
        id: string;
        status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
        requestNote: string;
        decisionNote: string | null;
        reviewedAt: string | null;
        requestedBy: { email: string };
        reviewedBy: { email: string } | null;
      } | null;
    }[];
  };
}
const selectCls =
  "h-9 rounded-md border border-input bg-background px-3 text-sm";

function isValidCivilDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const STATUS_LABEL: Record<Status, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

export function RateBooksBoard({
  initial,
  bases,
  role,
  headerActions,
  children,
  defaultEffectiveFrom,
}: {
  initial: RateBook[];
  bases: CostBaseOption[];
  role: "ADMIN" | "OPERATOR" | "VIEWER";
  headerActions?: ReactNode;
  children?: ReactNode;
  defaultEffectiveFrom: string;
}) {
  const [books, setBooks] = useState(initial);
  const [open, setOpen] = useState(initial.length === 0);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [baseId, setBaseId] = useState("");
  const [setId, setSetId] = useState("");
  const [currency, setCurrency] = useState<"USD" | "MXN">("USD");
  const [effectiveFrom, setEffectiveFrom] = useState(defaultEffectiveFrom);
  const [detail, setDetail] = useState<RateBook | null>(null);
  const [lineage, setLineage] = useState<RateBookLineage | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [contextBaseId, setContextBaseId] = useState(
    initial[0]?.costBase.id ?? bases[0]?.id ?? "",
  );
  const activeBases = useMemo(
    () =>
      bases.filter(
        (base) =>
          base.status === "ACTIVE" &&
          base.versions.some((version) => version.status === "PUBLISHED"),
      ),
    [bases],
  );
  const selectedBase = activeBases.find((base) => base.id === baseId);
  const publishedVersions =
    selectedBase?.versions.filter(
      (version) => version.status === "PUBLISHED",
    ) ?? [];
  const bookCountsByBase = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      counts.set(book.costBase.id, (counts.get(book.costBase.id) ?? 0) + 1);
    }
    return counts;
  }, [books]);
  const contextBase = bases.find((base) => base.id === contextBaseId) ?? null;
  const contextBooks = useMemo(
    () =>
      contextBaseId
        ? books.filter((book) => book.costBase.id === contextBaseId)
        : books,
    [books, contextBaseId],
  );
  const contextDrafts = contextBooks.filter((book) => book.status === "DRAFT").length;
  const contextPublished = contextBooks.filter((book) => book.status === "PUBLISHED").length;
  const contextRoutes = contextBooks.reduce((total, book) => total + book._count.entries, 0);
  const replaceBook = (book: RateBook) =>
    setBooks((items) => [book, ...items.filter((item) => item.id !== book.id)]);
  const create = useMutation({
    mutationFn: () =>
      fetcher<RateBook>("/api/v1/ratebooks", {
        method: "POST",
        json: {
          code: code.trim(),
          name: name.trim(),
          costBaseId: baseId,
          assumptionSetId: setId,
          currency,
          effectiveFrom: effectiveFrom.trim(),
        },
      }),
    onSuccess: (book) => {
      replaceBook(book);
      setContextBaseId(book.costBase.id);
      setDetail(book);
      setOpen(false);
      setCode("");
      setName("");
    },
  });
  const load = useMutation({
    mutationFn: async (id: string) => {
      const book = await fetcher<RateBook>(`/api/v1/ratebooks/${id}`);
      const [candidates, lineage] = await Promise.all([
        book.status === "DRAFT"
          ? fetcher<Candidate[]>(`/api/v1/ratebooks/${id}/candidates`)
          : [],
        fetcher<RateBookLineage>(`/api/v1/ratebooks/${id}/lineage`),
      ]);
      return { book, candidates, lineage };
    },
    onSuccess: ({ book, candidates, lineage }) => {
      setDetail(book);
      setLineage(lineage);
      setCandidates(candidates);
      setSelected(new Set());
      setNote("");
    },
  });
  const addEntries = useMutation({
    mutationFn: () =>
      fetcher<RateBook>(`/api/v1/ratebooks/${detail!.id}/entries`, {
        method: "POST",
        json: { quoteIds: [...selected] },
      }),
    onSuccess: (book) => {
      setDetail(book);
      replaceBook(book);
      setCandidates((items) => items.filter((item) => !selected.has(item.id)));
      setSelected(new Set());
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      fetcher<RateBook>(`/api/v1/ratebooks/${detail!.id}/publish`, {
        method: "POST",
        json: { note },
      }),
    onSuccess: (book) => {
      setDetail(book);
      replaceBook(book);
      setCandidates([]);
      setNote("");
    },
  });
  const requestApproval = useMutation({
    mutationFn: (action: "RATEBOOK_PUBLISH" | "RATEWARE_DELIVERY") =>
      fetcher(`/api/v1/ratebooks/${detail!.id}/approval-requests`, {
        method: "POST",
        json: { action, note },
      }),
    onSuccess: () => setNote(""),
  });
  const draftCount = books.filter((book) => book.status === "DRAFT").length;
  const publishedCount = books.filter((book) => book.status === "PUBLISHED").length;
  const normalizedCode = code.trim();
  const normalizedName = name.trim();
  const normalizedEffectiveFrom = effectiveFrom.trim();
  const canCreate =
    normalizedCode.length > 0 &&
    normalizedName.length > 0 &&
    baseId.length > 0 &&
    setId.length > 0 &&
    isValidCivilDateKey(normalizedEffectiveFrom) &&
    !create.isPending;

  return (
    <div className="grid gap-3">
      <header className="flex flex-col justify-between gap-3 border-b pb-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Catálogo comercial</p>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary"><BookOpen className="size-4" /></span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">RateBook</h1>
              <p className="text-xs text-muted-foreground">Tarifarios gobernados por base, versión y vigencia.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          <span className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">{draftCount} borradores</span>
          <span className="rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">{publishedCount} publicados</span>
          <Button onClick={() => setOpen(!open)}>
            <Plus className="mr-1 h-4 w-4" />
          Nuevo RateBook
          </Button>
        </div>
      </header>
      {children}
      {open && (
        <Card className="border-primary/20">
          <CardHeader className="border-b bg-muted/25 pb-4">
            <CardTitle>Crear borrador tarifario</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 md:grid-cols-3">
            <label className="grid gap-1 text-xs font-medium" htmlFor="ratebook-code">
              Código del RateBook
              <Input
                id="ratebook-code"
                placeholder="p. ej. MX-2026-Q4"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium" htmlFor="ratebook-name">
              Nombre comercial
              <Input
                id="ratebook-name"
                placeholder="Nombre del tarifario"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium" htmlFor="ratebook-effective-from">
              Inicio de vigencia
              <Input
                id="ratebook-effective-from"
                type="date"
                required
                aria-invalid={!isValidCivilDateKey(normalizedEffectiveFrom)}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium" htmlFor="ratebook-base">
              Base de costos activa
              <select
                id="ratebook-base"
                className={selectCls}
                value={baseId}
                onChange={(e) => {
                  setBaseId(e.target.value);
                  setSetId("");
                  const base = activeBases.find(
                    (item) => item.id === e.target.value,
                  );
                  if (base) setCurrency(base.currency === "MXN" ? "MXN" : "USD");
                }}
              >
                <option value="">Selecciona una base…</option>
                {activeBases.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.code} — {base.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium" htmlFor="ratebook-version">
              Versión publicada
              <select
                id="ratebook-version"
                className={selectCls}
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                disabled={!selectedBase}
              >
                <option value="">Selecciona una versión…</option>
                {publishedVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name} v{version.version}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium" htmlFor="ratebook-currency">
              Moneda
              <select
                id="ratebook-currency"
                className={selectCls}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USD" | "MXN")}
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
              </select>
            </label>
            <div className="md:col-span-3">
              <Button
                disabled={!canCreate}
                onClick={() => create.mutate()}
              >
                Crear borrador
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-lg border bg-card p-2 lg:sticky lg:top-16">
          <div className="px-2 pb-2 pt-1">
            <p className="text-xs font-semibold">Bases de costos</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Selecciona el contexto tarifario.
            </p>
          </div>
          <div className="grid gap-1">
            {bases.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                No hay bases disponibles.
              </p>
            ) : (
              bases.map((base) => {
                const isCurrent = base.id === contextBaseId;
                return (
                  <button
                    key={base.id}
                    type="button"
                    aria-pressed={isCurrent}
                    className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                      isCurrent
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-transparent hover:border-border hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setContextBaseId(base.id);
                      setDetail(null);
                      setLineage(null);
                      setCandidates([]);
                      setSelected(new Set());
                    }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">
                        {base.code}
                      </span>
                      <span className="rounded bg-background/70 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {bookCountsByBase.get(base.id) ?? 0}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {base.name}
                    </span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                      {base.scope} · {base.status === "ACTIVE" ? "Activa" : base.status}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="grid min-w-0 gap-3">
          <section className="rounded-lg border bg-card p-3" aria-label="Resumen de la base seleccionada">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Contexto tarifario
                </p>
                <h2 className="mt-0.5 text-base font-semibold">
                  {contextBase
                    ? `${contextBase.code} — ${contextBase.name}`
                    : "Sin base seleccionada"}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {contextBase
                    ? `${contextBase.scope} · ${contextBase.currency} · ${contextBase.versions.length} versiones registradas`
                    : "Selecciona una base para revisar sus versiones comerciales."}
                </p>
              </div>
              {contextBase && (
                <span className="rounded-md border px-2 py-1 text-[11px] font-medium">
                  {contextBase.status === "ACTIVE" ? "Base activa" : contextBase.status}
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="RateBooks" value={contextBooks.length} />
              <Metric label="Publicados" value={contextPublished} tone="success" />
              <Metric label="Borradores" value={contextDrafts} tone="warning" />
              <Metric label="Rutas" value={contextRoutes} />
            </div>
          </section>

          <Card className="overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">RateBook</th>
                <th className="px-3 py-2.5 text-left font-medium">Versión</th>
                <th className="px-3 py-2.5 text-left font-medium">Vigencia</th>
                <th className="px-3 py-2.5 text-left font-medium">Rutas</th>
                <th className="px-3 py-2.5 text-left font-medium">Estado</th>
                <th className="px-3 py-2.5 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {contextBooks.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-10 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    Esta base aún no tiene RateBooks. Crea un borrador para comenzar.
                  </td>
                </tr>
              ) : contextBooks.map((book) => (
                <tr
                  key={book.id}
                  className={`border-b transition-colors hover:bg-muted/40 ${
                    detail?.id === book.id ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-medium">
                    {book.code}
                    <span className="block text-[11px] text-muted-foreground">
                      {book.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {book.set.name} · v{book.set.version}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatCivilDate(book.effectiveFrom)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{book._count.entries}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={book.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => load.mutate(book.id)}
                      disabled={load.isPending}
                    >
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {detail && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {detail.code} <StatusBadge status={detail.status} />
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.costBase.name} · {detail.set.name} v
                  {detail.set.version} · {detail.currency}
                </p>
              </div>
              {detail.status === "DRAFT" && role === "ADMIN" && (
                <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                  <Input
                    aria-label="Nota de publicación"
                    className="w-full sm:w-64"
                    placeholder="Nota de publicación"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    disabled={
                      !note || detail.entries?.length === 0 || publish.isPending
                    }
                    onClick={() => publish.mutate()}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Publicar
                  </Button>
                </div>
              )}
              {detail.status === "DRAFT" && role === "OPERATOR" && (
                <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                  <Input
                    aria-label="Motivo para solicitar aprobación de publicación"
                    className="w-full sm:w-64"
                    placeholder="Motivo para aprobación"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button
                    disabled={
                      note.trim().length < 3 || requestApproval.isPending
                    }
                    onClick={() => requestApproval.mutate("RATEBOOK_PUBLISH")}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Solicitar publicación
                  </Button>
                </div>
              )}
              {detail.status === "PUBLISHED" &&
                (role === "OPERATOR" || role === "ADMIN") && (
                  <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                    <Input
                      aria-label="Motivo para solicitar aprobación de entrega"
                      className="w-full sm:w-64"
                      placeholder="Motivo para aprobación"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <Button
                      disabled={
                        note.trim().length < 3 || requestApproval.isPending
                      }
                      onClick={() =>
                        requestApproval.mutate("RATEWARE_DELIVERY")
                      }
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Solicitar entrega
                    </Button>
                  </div>
                )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {detail.status === "DRAFT" && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">
                  Cotizaciones confirmadas compatibles
                </p>
                {candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay cotizaciones confirmadas con esta misma base y
                    versión.
                  </p>
                ) : (
                  <>
                    <div className="max-h-48 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sr-only">
                          <tr>
                            <th scope="col">Seleccionar</th>
                            <th scope="col">Ruta</th>
                            <th scope="col">Operación</th>
                            <th scope="col">Tarifa requerida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidates.map((candidate) => {
                            const route =
                              candidate.productionRoute ?? candidate.lane;
                            return (
                              <tr key={candidate.id} className="border-b">
                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Seleccionar cotización ${candidate.label ?? candidate.id}: ${route ? `${route.origin} a ${route.destination}` : "ruta no disponible"}`}
                                    checked={selected.has(candidate.id)}
                                    onChange={() =>
                                      setSelected((items) => {
                                        const next = new Set(items);
                                        if (next.has(candidate.id)) {
                                          next.delete(candidate.id);
                                        } else {
                                          next.add(candidate.id);
                                        }
                                        return next;
                                      })
                                    }
                                  />
                                </td>
                                <td>
                                  {route
                                    ? `${route.origin} → ${route.destination}`
                                    : "Ruta no disponible"}
                                </td>
                                <td>{candidate.operation}</td>
                                <td className="text-right">
                                  {currency === "MXN"
                                    ? candidate.requiredTariffMxn.toLocaleString(
                                        "en-US",
                                        { style: "currency", currency: "MXN" },
                                      )
                                    : candidate.requiredTariffUsd.toLocaleString(
                                        "en-US",
                                        { style: "currency", currency: "USD" },
                                      )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      className="mt-3"
                      size="sm"
                      disabled={selected.size === 0 || addEntries.isPending}
                      onClick={() => addEntries.mutate()}
                    >
                      Agregar snapshots seleccionados
                    </Button>
                  </>
                )}
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium">
                Entradas publicables (snapshot)
              </p>
              {detail.entries?.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay rutas agregadas.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="p-2 text-left">Ruta</th>
                        <th className="text-left">Operación</th>
                        <th className="text-left">Servicio</th>
                        <th className="p-2 text-right">Tarifa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.entries?.map((entry) => (
                        <tr key={entry.id} className="border-b">
                          <td className="p-2">
                            {entry.origin} → {entry.destination}
                          </td>
                          <td>{entry.operation}</td>
                          <td>{entry.service}</td>
                          <td className="p-2 text-right">
                            {entry.publishedTariff.toLocaleString("en-US", {
                              style: "currency",
                              currency: entry.currency,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
          {lineage && <RateBookLineagePanel lineage={lineage} />}
        </div>
      </div>
    </div>
  );
}
function RateBookLineagePanel({ lineage }: { lineage: RateBookLineage }) {
  const { rateBook } = lineage;
  const review = rateBook.set.scenarioReviewSource;
  const delivery = rateBook.ratewareDeliveries[0];
  return (
    <div className="rounded-md border bg-muted/20 p-3 text-sm">
      <p className="font-medium">Trazabilidad operativa</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Base {rateBook.costBase.code} · versión {rateBook.set.name} v
        {rateBook.set.version}
        {rateBook.sourceRateBook
          ? ` · regenerado desde ${rateBook.sourceRateBook.code}`
          : ""}
      </p>
      {review ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Escenario aprobado: {review.id.slice(0, 8)} · cotización{" "}
          {review.quoteId.slice(0, 8)} · checksum{" "}
          {review.sourceChecksum.slice(0, 12)}…
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Esta versión no proviene de un paquete de escenario.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Rateware:{" "}
        {delivery
          ? `${delivery.status.toLowerCase()} · ${new Date(delivery.attemptedAt).toLocaleString()}`
          : "sin entrega registrada"}
        . Esta vista no envía información.
      </p>
      <RatewareDeliveryHistory deliveries={rateBook.ratewareDeliveries} />
    </div>
  );
}

function RatewareDeliveryHistory({
  deliveries,
}: {
  deliveries: RateBookLineage["rateBook"]["ratewareDeliveries"];
}) {
  if (deliveries.length === 0) return null;
  return (
    <div className="mt-3 rounded-md border bg-background/50 p-2 text-xs">
      <p className="font-medium">Historial Rateware</p>
      <div className="mt-2 grid gap-2">
        {deliveries.map((delivery) => (
          <div
            className="border-t pt-2 first:border-t-0 first:pt-0"
            key={delivery.id}
          >
            <p>
              <span
                className={
                  delivery.status === "DELIVERED"
                    ? "font-medium text-emerald-700 dark:text-emerald-300"
                    : "font-medium text-rose-700 dark:text-rose-300"
                }
              >
                {delivery.status === "DELIVERED" ? "Recibido" : "Fallido"}
              </span>{" "}
              · {new Date(delivery.attemptedAt).toLocaleString()}
              {delivery.receiptId ? ` · recibo ${delivery.receiptId}` : ""}
            </p>
            {delivery.approvalRequest ? (
              <p className="mt-1 text-muted-foreground">
                Aprobación {delivery.approvalRequest.id.slice(0, 8)}: solicitó{" "}
                {delivery.approvalRequest.requestedBy.email}; revisó{" "}
                {delivery.approvalRequest.reviewedBy?.email ?? "sin revisor"}
                {delivery.approvalRequest.decisionNote
                  ? ` · ${delivery.approvalRequest.decisionNote}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">
                Entrega histórica sin referencia de aprobación.
              </p>
            )}
            {delivery.error && (
              <p className="mt-1 text-rose-700 dark:text-rose-300">
                {delivery.error}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const cls =
    status === "PUBLISHED"
      ? "bg-emerald-500/10 text-emerald-700"
      : status === "DRAFT"
        ? "bg-amber-500/10 text-amber-700"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-foreground";
  return (
    <div className="rounded-md border bg-muted/20 px-2.5 py-2">
      <p className={`text-base font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
