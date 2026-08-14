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
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Catálogo comercial</p>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen className="size-5" /></span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">RateBook</h1>
              <p className="text-sm text-muted-foreground">Tarifarios por base, versión y vigencia.</p>
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
      </div>
      {children}
      {open && (
        <Card className="border-primary/20">
          <CardHeader className="border-b bg-muted/25 pb-4">
            <CardTitle>Crear borrador tarifario</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <label className="sr-only" htmlFor="ratebook-code">
              Código del RateBook
            </label>
            <Input
              id="ratebook-code"
              placeholder="Código, p. ej. MX-2026-Q4"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <label className="sr-only" htmlFor="ratebook-name">
              Nombre comercial
            </label>
            <Input
              id="ratebook-name"
              placeholder="Nombre comercial"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="sr-only" htmlFor="ratebook-effective-from">
              Inicio de vigencia
            </label>
            <Input
              id="ratebook-effective-from"
              type="date"
              required
              aria-invalid={!isValidCivilDateKey(normalizedEffectiveFrom)}
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
            <label className="sr-only" htmlFor="ratebook-base">
              Base de costos activa
            </label>
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
              <option value="">Base activa…</option>
              {activeBases.map((base) => (
                <option key={base.id} value={base.id}>
                  {base.code} — {base.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="ratebook-version">
              Versión publicada
            </label>
            <select
              id="ratebook-version"
              className={selectCls}
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
              disabled={!selectedBase}
            >
              <option value="">Versión publicada…</option>
              {publishedVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name} v{version.version}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="ratebook-currency">
              Moneda
            </label>
            <select
              id="ratebook-currency"
              className={selectCls}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USD" | "MXN")}
            >
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
            </select>
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
      <Card className="overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">RateBook</th>
                <th className="px-5 py-3 text-left font-medium">Base / versión</th>
                <th className="px-5 py-3 text-left font-medium">Vigencia</th>
                <th className="px-5 py-3 text-left font-medium">Rutas</th>
                <th className="px-5 py-3 text-left font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No hay RateBooks todavía. Crea el primer borrador para
                    comenzar.
                  </td>
                </tr>
              ) : books.map((book) => (
                <tr key={book.id} className="border-b transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3.5 font-medium">
                    {book.code}
                    <span className="block text-xs text-muted-foreground">
                      {book.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {book.costBase.code} · v{book.set.version}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">{formatCivilDate(book.effectiveFrom)}</td>
                  <td className="px-5 py-3.5 tabular-nums">{book._count.entries}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={book.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
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
                <div className="flex gap-2">
                  <Input
                    className="w-64"
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
                <div className="flex gap-2">
                  <Input
                    className="w-64"
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
                  <div className="flex gap-2">
                    <Input
                      className="w-64"
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
          Escenario aprobado: {review.id.slice(0, 8)} · quote{" "}
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
                Aprobacion {delivery.approvalRequest.id.slice(0, 8)}: solicito{" "}
                {delivery.approvalRequest.requestedBy.email}; reviso{" "}
                {delivery.approvalRequest.reviewedBy?.email ?? "sin revisor"}
                {delivery.approvalRequest.decisionNote
                  ? ` · ${delivery.approvalRequest.decisionNote}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">
                Entrega historica sin referencia de aprobacion.
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
