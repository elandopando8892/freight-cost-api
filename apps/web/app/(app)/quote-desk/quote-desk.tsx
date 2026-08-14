"use client";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCivilDate } from "@/lib/civil-date";
import { fetcher } from "@/lib/fetcher";

type CustomerQuoteStatus = "DRAFT" | "REVIEW" | "APPROVED" | "ARCHIVED";

export interface CustomerQuote {
  id: string;
  folio: string;
  clientName: string;
  contactName: string | null;
  contactEmail: string | null;
  quoteType: string;
  validUntil: string;
  status: CustomerQuoteStatus;
  lines: {
    id: string;
    origin: string;
    destination: string;
    tariff: number;
    currency: string;
    operation: string;
    service: string;
  }[];
}
export interface CustomerQuoteTemplate {
  id: string;
  name: string;
  subjectTemplate: string;
  htmlTemplate: string;
  system?: boolean;
}
interface Preview {
  template: { id: string; name: string };
  subject: string;
  html: string;
  text: string;
}
interface PreparedEmailDraft {
  id: string;
  status: "PREPARED";
  toEmail: string;
  subject: string;
  payloadChecksum: string;
  createdAt: string;
  policy: string;
}
interface EmailDraftHistoryItem {
  id: string;
  status: "PREPARED";
  templateName: string;
  toEmail: string;
  subject: string;
  payloadChecksum: string;
  createdAt: string;
  createdBy: { email: string };
}
const blank = () => ({
  origin: "",
  destination: "",
  equipment: "Truck Trailer",
  config: "Single",
  operation: "D2D Export",
  service: "One Way",
  tariff: "",
  currency: "USD",
  borderCrossing: "",
  distance: "",
});

export function QuoteDesk({
  initial,
  initialTemplates,
  canEdit,
}: {
  initial: CustomerQuote[];
  initialTemplates: CustomerQuoteTemplate[];
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const lineSequence = useRef(1);
  const [items, setItems] = useState(initial);
  const [templates, setTemplates] = useState(initialTemplates);
  const [open, setOpen] = useState(false);
  const [clientName, setClient] = useState("");
  const [contactName, setContact] = useState("");
  const [contactEmail, setEmail] = useState("");
  const [validUntil, setValid] = useState("");
  const [lines, setLines] = useState([{ ...blank(), clientId: "line-0" }]);
  const newBlankLine = () => ({
    ...blank(),
    clientId: `line-${lineSequence.current++}`,
  });
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [previewFor, setPreviewFor] = useState<CustomerQuote | null>(null);
  const [preparedMessage, setPreparedMessage] = useState<string | null>(null);
  const [preparedDraft, setPreparedDraft] = useState<PreparedEmailDraft | null>(
    null,
  );
  const [selectedTemplate, setSelectedTemplate] = useState(
    initialTemplates[0]?.id ?? "system:marksman-xbf-proposal",
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CustomerQuoteStatus>("ALL");
  const save = useMutation({
    mutationFn: () =>
      fetcher<CustomerQuote>("/api/v1/customer-quotes", {
        method: "POST",
        json: {
          clientName,
          contactName: contactName || null,
          contactEmail: contactEmail || null,
          validUntil,
          lines: lines.map((line) => ({
            origin: line.origin,
            destination: line.destination,
            equipment: line.equipment,
            config: line.config,
            operation: line.operation,
            service: line.service,
            tariff: Number(line.tariff),
            currency: line.currency,
            borderCrossing: line.borderCrossing,
            distance: line.distance,
          })),
        },
      }),
    onSuccess: (q) => {
      setItems((x) => [q, ...x]);
      setOpen(false);
      setClient("");
      setContact("");
      setEmail("");
      setValid("");
      setLines([newBlankLine()]);
    },
  });
  const saveTemplate = useMutation({
    mutationFn: () =>
      fetcher<CustomerQuoteTemplate>("/api/v1/customer-quote-templates", {
        method: "POST",
        json: {
          name: templateName,
          subjectTemplate: templateSubject,
          htmlTemplate: templateHtml,
        },
      }),
    onSuccess: (template) => {
      setTemplates((x) => [...x, template]);
      setSelectedTemplate(template.id);
      setTemplateName("");
      setTemplateSubject("");
      setTemplateHtml("");
    },
  });
  const preview = useMutation({
    mutationFn: ({
      quote,
      templateId,
    }: {
      quote: CustomerQuote;
      templateId: string;
    }) =>
      fetcher<Preview>(
        `/api/v1/customer-quotes/${quote.id}/preview?templateId=${encodeURIComponent(templateId)}`,
      ),
  });
  const openPreview = (quote: CustomerQuote, templateId = selectedTemplate) => {
    setPreparedMessage(null);
    setPreparedDraft(null);
    setPreviewFor(quote);
    preview.mutate({ quote, templateId });
  };
  const emailDraftHistory = useQuery({
    queryKey: ["customer-quote-email-drafts", previewFor?.id],
    queryFn: () =>
      fetcher<EmailDraftHistoryItem[]>(
        `/api/v1/customer-quotes/${previewFor?.id}/email-drafts`,
      ),
    enabled: Boolean(previewFor?.id),
  });
  const prepareGmailDraft = useMutation({
    mutationFn: ({
      quoteId,
      templateId,
    }: {
      quoteId: string;
      templateId: string;
    }) =>
      fetcher<PreparedEmailDraft>(
        `/api/v1/customer-quotes/${quoteId}/email-drafts`,
        { method: "POST", json: { templateId } },
      ),
    onSuccess: (draft, variables) => {
      setPreparedDraft(draft);
      setPreparedMessage(
        `Borrador ${draft.status.toLowerCase()} para ${draft.toEmail}. Todavía no se envió ningún correo.`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["customer-quote-email-drafts", variables.quoteId],
      });
    },
  });
  const downloadRatewareDraft = async (draftId = preparedDraft?.id) => {
    if (!draftId) return;
    const response = await fetch(
      `/api/v1/integration/rateware/customer-quote-email-drafts/${draftId}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const blob = new Blob([JSON.stringify(await response.json(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fcm-rateware-gmail-draft-${draftId.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const draftCount = items.filter((item) => item.status === "DRAFT").length;
  const reviewCount = items.filter((item) => item.status === "REVIEW").length;
  const approvedCount = items.filter((item) => item.status === "APPROVED").length;
  const needle = search.trim().toLowerCase();
  const visibleItems = useMemo(() => items.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (!needle) return true;
    const searchable = [
      item.folio,
      item.clientName,
      item.contactName ?? "",
      item.contactEmail ?? "",
      ...item.lines.flatMap((line) => [line.origin, line.destination]),
    ].join(" ").toLowerCase();
    return searchable.includes(needle);
  }), [items, needle, statusFilter]);

  return (
    <div className="grid gap-3">
      <header className="flex flex-col justify-between gap-3 border-b pb-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Propuestas comerciales</p>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary"><Mail className="size-4" /></span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Quote Desk</h1>
              <p className="text-xs text-muted-foreground">Captura, valida y prepara propuestas sin exponer el costo interno.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">{draftCount} borradores</span>
          {canEdit ? (
            <Button onClick={() => setOpen(!open)}>
              <Plus className="mr-1 h-4 w-4" />
              Nueva cotización
            </Button>
          ) : <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Modo consulta</span>}
        </div>
      </header>
      <div className="grid overflow-hidden rounded-md border bg-card sm:grid-cols-4">
        <DeskMetric label="Borradores" value={draftCount} />
        <DeskMetric label="En revisión" value={reviewCount} tone={reviewCount > 0 ? "warning" : "default"} />
        <DeskMetric label="Aprobadas" value={approvedCount} />
        <DeskMetric label="Plantillas" value={templates.length} last />
      </div>
      {canEdit && open && (
        <Card className="border-primary/20">
          <CardHeader className="border-b bg-muted/25 pb-4">
            <CardTitle>Capturar propuesta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start">
            <div className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-4">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Cliente <span className="sr-only">requerido</span>
              <Input
                aria-label="Cliente"
                placeholder="Cliente"
                value={clientName}
                onChange={(e) => setClient(e.target.value)}
              />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Contacto
              <Input
                aria-label="Contacto"
                placeholder="Contacto"
                value={contactName}
                onChange={(e) => setContact(e.target.value)}
              />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Correo electrónico
              <Input
                aria-label="Correo electrónico"
                placeholder="Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setEmail(e.target.value)}
              />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Vigencia <span className="sr-only">requerida</span>
              <Input
                aria-label="Vigencia"
                type="date"
                value={validUntil}
                onChange={(e) => setValid(e.target.value)}
              />
              </label>
            </div>
            {lines.map((line, i) => (
              <div
                key={line.clientId}
                className="grid gap-2 rounded border p-3 md:grid-cols-5"
              >
                <div className="text-xs font-medium text-foreground md:col-span-5">Ruta {i + 1}</div>
                <label className="grid gap-1 text-[11px] text-muted-foreground">
                  Origen
                <Input
                  aria-label={`Ruta ${i + 1}: origen`}
                  placeholder="Origen"
                  value={line.origin}
                  onChange={(e) =>
                    setLines((x) =>
                      x.map((v, n) =>
                        n === i ? { ...v, origin: e.target.value } : v,
                      ),
                    )
                  }
                />
                </label>
                <label className="grid gap-1 text-[11px] text-muted-foreground">
                  Destino
                <Input
                  aria-label={`Ruta ${i + 1}: destino`}
                  placeholder="Destino"
                  value={line.destination}
                  onChange={(e) =>
                    setLines((x) =>
                      x.map((v, n) =>
                        n === i ? { ...v, destination: e.target.value } : v,
                      ),
                    )
                  }
                />
                </label>
                <label className="grid gap-1 text-[11px] text-muted-foreground">
                  Tarifa
                <Input
                  aria-label={`Ruta ${i + 1}: tarifa`}
                  placeholder="Tarifa"
                  type="number"
                  value={line.tariff}
                  onChange={(e) =>
                    setLines((x) =>
                      x.map((v, n) =>
                        n === i ? { ...v, tariff: e.target.value } : v,
                      ),
                    )
                  }
                />
                </label>
                <label className="grid gap-1 text-[11px] text-muted-foreground">
                  Moneda
                <Input
                  aria-label={`Ruta ${i + 1}: moneda`}
                  placeholder="Moneda"
                  value={line.currency}
                  onChange={(e) =>
                    setLines((x) =>
                      x.map((v, n) =>
                        n === i ? { ...v, currency: e.target.value } : v,
                      ),
                    )
                  }
                />
                </label>
                <Button
                  variant="ghost"
                  className="self-end"
                  disabled={lines.length === 1}
                  onClick={() => setLines((x) => x.filter((_, n) => n !== i))}
                >
                  Quitar
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={lines.length >= 15}
                onClick={() => setLines((x) => [...x, newBlankLine()])}
              >
                Agregar ruta
              </Button>
              <Button
                disabled={
                  !clientName.trim() ||
                  !validUntil ||
                  lines.some((x) => !x.origin.trim() || !x.destination.trim() || !x.tariff) ||
                  save.isPending
                }
                onClick={() => save.mutate()}
              >
                Guardar borrador
              </Button>
            </div>
            </div>
            <CaptureSummary
              clientName={clientName}
              contactName={contactName}
              contactEmail={contactEmail}
              validUntil={validUntil}
              lines={lines}
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="border-b bg-muted/25 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Plantilla de envío
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Plantilla de cotización"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-auto sm:min-w-64"
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                if (previewFor) openPreview(previewFor, e.target.value);
              }}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.system ? " (estándar)" : ""}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              Campos: folio, cliente, vigencia y hasta 15 rutas.
            </span>
          </div>
          {canEdit ? <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Precargar una plantilla HTML propia
            </summary>
            <div className="mt-3 grid gap-2">
              <Input
                aria-label="Nombre de plantilla"
                placeholder="Nombre de plantilla"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Input
                aria-label="Asunto de la plantilla"
                placeholder="Asunto, p. ej. Propuesta {{FOLIO_COTIZACION}}"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
              />
              <textarea
                aria-label="HTML de la plantilla"
                className="min-h-40 rounded-md border bg-background p-3 font-mono text-xs"
                placeholder="HTML con campos como {{NOMBRE_CLIENTE}} y {{RUTAS_TABLA}}"
                value={templateHtml}
                onChange={(e) => setTemplateHtml(e.target.value)}
              />
              <div>
                <Button
                  size="sm"
                  disabled={
                    !templateName ||
                    !templateSubject ||
                    templateHtml.length < 20 ||
                    saveTemplate.isPending
                  }
                  onClick={() => saveTemplate.mutate()}
                >
                  Guardar plantilla
                </Button>
              </div>
            </div>
          </details> : null}
          <p className="text-xs text-muted-foreground">
            Se eliminan scripts, formularios, iframes y URLs ejecutables. La
            previsualización se muestra en un iframe sandbox; guardar una
            plantilla no envía correo.
          </p>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar propuestas"
          placeholder="Buscar folio, cliente, correo o ruta…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 w-full sm:max-w-sm"
        />
        <select
          aria-label="Filtrar propuestas por estado"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "ALL" | CustomerQuoteStatus)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-auto"
        >
          <option value="ALL">Todos los estados</option>
          <option value="DRAFT">Borradores</option>
          <option value="REVIEW">En revisión</option>
          <option value="APPROVED">Aprobadas</option>
          <option value="ARCHIVED">Archivadas</option>
        </select>
        <span className="text-xs text-muted-foreground sm:ml-auto">{visibleItems.length} de {items.length}</span>
      </div>
      <div className={previewFor ? "grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start" : ""}>
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Folio</th>
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Rutas</th>
                <th className="px-3 py-2 text-left font-medium">Vigencia</th>
                <th className="px-3 py-2 text-left font-medium">Estado</th>
                <th className="px-3 py-2 text-right font-medium">Correo</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {items.length === 0 ? "Aún no hay propuestas. Crea un borrador para iniciar el Quote Desk." : "Ninguna propuesta coincide con los filtros."}
                  </td>
                </tr>
              )}
              {visibleItems.map((q) => (
                <tr key={q.id} className="border-b transition-colors hover:bg-muted/40">
                  <td className="px-3 py-2.5 font-medium">{q.folio}</td>
                  <td className="px-3 py-2.5">{q.clientName}</td>
                  <td className="px-3 py-2.5 tabular-nums">{q.lines.length}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{formatCivilDate(q.validUntil)}</td>
                  <td className="px-3 py-2.5"><QuoteStatusBadge status={q.status} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPreview(q)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Vista previa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {previewFor && (
        <Card className="min-w-0 xl:sticky xl:top-16">
          <CardHeader className="border-b bg-muted/25 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Previsualización — {previewFor.folio}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {preview.data?.subject || "Generando…"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit ? <Button
                  size="sm"
                  disabled={
                    !previewFor.contactEmail ||
                    preview.isPending ||
                    prepareGmailDraft.isPending
                  }
                  onClick={() =>
                    prepareGmailDraft.mutate({
                      quoteId: previewFor.id,
                      templateId: selectedTemplate,
                    })
                  }
                >
                  Preparar para Gmail
                </Button> : null}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPreviewFor(null);
                    preview.reset();
                    setPreparedMessage(null);
                    setPreparedDraft(null);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {preview.isError ? (
              <p className="text-sm text-destructive">
                No se pudo generar la vista previa.
              </p>
            ) : (
              <iframe
                title="Previsualización de correo"
                sandbox=""
                className="h-[520px] w-full rounded-md border bg-white"
                srcDoc={preview.data?.html || ""}
              />
            )}
            {!previewFor.contactEmail && (
              <p className="mt-3 text-sm text-amber-700">
                Agrega un email de contacto antes de preparar el borrador.
              </p>
            )}
            {preparedMessage && (
              <p className="mt-3 text-sm text-emerald-700">
                {preparedMessage} La entrega requerirá el contrato explícito del
                broker Gmail de Rateware.
              </p>
            )}
            {preparedDraft && (
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                onClick={() => downloadRatewareDraft()}
              >
                Descargar paquete Rateware
              </Button>
            )}
            {emailDraftHistory.isLoading ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Cargando historial de borradores…
              </p>
            ) : emailDraftHistory.data?.length ? (
              <div className="mt-5 rounded-md border p-3">
                <h3 className="text-sm font-medium">Historial de borradores</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Son snapshots preparados; ninguno equivale a correo enviado.
                </p>
                <div className="mt-3 grid gap-2">
                  {emailDraftHistory.data.map((draft) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
                      key={draft.id}
                    >
                      <div>
                        <p className="font-medium">{draft.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {draft.toEmail} · {draft.templateName} ·{" "}
                          {new Date(draft.createdAt).toLocaleString("es-MX")} ·{" "}
                          {draft.createdBy.email}
                        </p>
                      </div>
                      <Button
                        onClick={() => downloadRatewareDraft(draft.id)}
                        size="sm"
                        variant="outline"
                      >
                        Exportar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {prepareGmailDraft.isError && (
              <p className="mt-3 text-sm text-destructive">
                {prepareGmailDraft.error instanceof Error
                  ? prepareGmailDraft.error.message
                  : "No se pudo preparar el borrador."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

const QUOTE_STATUS: Record<CustomerQuoteStatus, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  REVIEW: { label: "En revisión", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  APPROVED: { label: "Aprobada", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  ARCHIVED: { label: "Archivada", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
};

function QuoteStatusBadge({ status }: { status: CustomerQuoteStatus }) {
  const presentation = QUOTE_STATUS[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${presentation.className}`}>
      {presentation.label}
    </span>
  );
}

function DeskMetric({
  label,
  value,
  tone = "default",
  last = false,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
  last?: boolean;
}) {
  return (
    <div className={`px-3 py-2 ${last ? "" : "border-b sm:border-r sm:border-b-0"}`}>
      <div className={`text-lg font-semibold tabular-nums ${tone === "warning" ? "text-amber-700 dark:text-amber-400" : ""}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CaptureSummary({
  clientName,
  contactName,
  contactEmail,
  validUntil,
  lines,
}: {
  clientName: string;
  contactName: string;
  contactEmail: string;
  validUntil: string;
  lines: ReturnType<typeof blank>[];
}) {
  const completeLines = lines.filter((line) => line.origin.trim() && line.destination.trim() && line.tariff).length;
  return (
    <aside className="grid gap-3 rounded-md border bg-muted/20 p-3 lg:sticky lg:top-16" aria-label="Resumen de la propuesta">
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <h3 className="text-sm font-semibold">Resumen</h3>
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">Sin guardar</span>
      </div>
      <dl className="grid gap-2 text-xs">
        <SummaryRow label="Cliente" value={clientName.trim() || "Pendiente"} />
        <SummaryRow label="Contacto" value={contactName.trim() || contactEmail.trim() || "Pendiente"} />
        <SummaryRow label="Vigencia" value={validUntil ? formatCivilDate(validUntil) : "Pendiente"} />
        <SummaryRow label="Rutas" value={`${completeLines}/${lines.length} completas`} />
      </dl>
      <p className="border-t pt-2 text-[11px] leading-relaxed text-muted-foreground">Guardar crea un borrador comercial; no prepara ni envía correo.</p>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  );
}
