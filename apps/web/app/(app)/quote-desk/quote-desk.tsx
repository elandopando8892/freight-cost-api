"use client";
import { useState } from "react";
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
}: {
  initial: CustomerQuote[];
  initialTemplates: CustomerQuoteTemplate[];
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(initial);
  const [templates, setTemplates] = useState(initialTemplates);
  const [open, setOpen] = useState(false);
  const [clientName, setClient] = useState("");
  const [contactName, setContact] = useState("");
  const [contactEmail, setEmail] = useState("");
  const [validUntil, setValid] = useState("");
  const [lines, setLines] = useState([blank()]);
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
  const save = useMutation({
    mutationFn: () =>
      fetcher<CustomerQuote>("/api/v1/customer-quotes", {
        method: "POST",
        json: {
          clientName,
          contactName: contactName || null,
          contactEmail: contactEmail || null,
          validUntil,
          lines: lines.map((x) => ({ ...x, tariff: Number(x.tariff) })),
        },
      }),
    onSuccess: (q) => {
      setItems((x) => [q, ...x]);
      setOpen(false);
      setClient("");
      setContact("");
      setEmail("");
      setValid("");
      setLines([blank()]);
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

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Propuestas comerciales</p>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Mail className="size-5" /></span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Quote Desk</h1>
              <p className="text-sm text-muted-foreground">Captura, valida y prepara propuestas sin exponer el costo interno.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">{draftCount} borradores</span>
          <Button onClick={() => setOpen(!open)}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva cotización
          </Button>
        </div>
      </div>
      {open && (
        <Card className="border-primary/20">
          <CardHeader className="border-b bg-muted/25 pb-4">
            <CardTitle>Capturar propuesta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-4">
              <Input
                aria-label="Cliente"
                placeholder="Cliente"
                value={clientName}
                onChange={(e) => setClient(e.target.value)}
              />
              <Input
                aria-label="Contacto"
                placeholder="Contacto"
                value={contactName}
                onChange={(e) => setContact(e.target.value)}
              />
              <Input
                aria-label="Correo electrónico"
                placeholder="Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                aria-label="Vigencia"
                type="date"
                value={validUntil}
                onChange={(e) => setValid(e.target.value)}
              />
            </div>
            {lines.map((line, i) => (
              <div
                key={i}
                className="grid gap-2 rounded border p-3 md:grid-cols-5"
              >
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
                <Button
                  variant="ghost"
                  disabled={lines.length === 1}
                  onClick={() => setLines((x) => x.filter((_, n) => n !== i))}
                >
                  Quitar
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={lines.length >= 15}
                onClick={() => setLines((x) => [...x, blank()])}
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
              className="h-9 min-w-64 rounded-md border bg-background px-3 text-sm"
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
          <details className="rounded-md border p-3">
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
          </details>
          <p className="text-xs text-muted-foreground">
            Se eliminan scripts, formularios, iframes y URLs ejecutables. La
            previsualización se muestra en un iframe sandbox; guardar una
            plantilla no envía correo.
          </p>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Folio</th>
                <th className="px-5 py-3 text-left font-medium">Cliente</th>
                <th className="px-5 py-3 text-left font-medium">Rutas</th>
                <th className="px-5 py-3 text-left font-medium">Vigencia</th>
                <th className="px-5 py-3 text-left font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Correo</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Aún no hay propuestas. Crea un borrador para iniciar el Quote Desk.
                  </td>
                </tr>
              )}
              {items.map((q) => (
                <tr key={q.id} className="border-b transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3.5 font-medium">{q.folio}</td>
                  <td className="px-5 py-3.5">{q.clientName}</td>
                  <td className="px-5 py-3.5 tabular-nums">{q.lines.length}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">{formatCivilDate(q.validUntil)}</td>
                  <td className="px-5 py-3.5"><QuoteStatusBadge status={q.status} /></td>
                  <td className="px-5 py-3.5 text-right">
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
        <Card>
          <CardHeader className="border-b bg-muted/25 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Previsualización — {previewFor.folio}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {preview.data?.subject || "Generando…"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
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
                </Button>
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
                className="h-[620px] w-full rounded-md border bg-white"
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
