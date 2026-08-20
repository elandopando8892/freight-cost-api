import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import type { JwtPayload } from "../auth/auth.schema.js";
import {
  buildRatewareCustomerQuoteEmailDraftContract,
  customerQuoteEmailPayloadChecksum,
} from "./customer-quote-email-outbox.js";
import {
  deliverCustomerQuoteEmail,
  reconcileCustomerQuoteEmailDelivery,
} from "./customer-quote-email-delivery.js";
import { customerQuoteTransitionBlocker } from "./customer-quote-lifecycle.js";

const Line = z.object({
  origin: z.string().trim().min(2),
  destination: z.string().trim().min(2),
  equipment: z.string().trim().min(2),
  config: z.string().trim().min(2),
  operation: z.string().trim().min(2),
  service: z.string().trim().min(2),
  tariff: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  borderCrossing: z.string().trim().max(120).optional().nullable(),
  distance: z.string().trim().max(80).optional().nullable(),
});
const Input = z.object({
  clientName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().max(160).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  quoteType: z.string().trim().min(2).max(80).default("Spot"),
  goodsValue: z.string().trim().max(120).optional().nullable(),
  validUntil: z.coerce.date(),
  notes: z.string().trim().max(4000).optional().nullable(),
  lines: z.array(Line).min(1).max(15),
});
const TemplateInput = z.object({
  name: z.string().trim().min(2).max(120),
  subjectTemplate: z.string().trim().min(2).max(240),
  htmlTemplate: z.string().trim().min(20).max(80_000),
});
const PrepareEmailDraft = z.object({ templateId: z.string().min(1) }).strict();
const SendEmailDraft = z
  .object({
    expectedPayloadChecksum: z.string().trim().min(1).optional(),
  })
  .strict();
const TransitionCustomerQuote = z
  .object({ status: z.enum(["REVIEW", "APPROVED", "ARCHIVED"]) })
  .strict();
const SYSTEM_TEMPLATE_ID = "system:marksman-xbf-proposal";

const SYSTEM_TEMPLATE = {
  id: SYSTEM_TEMPLATE_ID,
  name: "MARKSMAN XBF — Propuesta comercial",
  subjectTemplate:
    "Propuesta de cotización {{FOLIO_COTIZACION}} | {{NOMBRE_CLIENTE}}",
  htmlTemplate: `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#f4f6f8;color:#18212b;font:14px Arial,sans-serif}.page{max-width:900px;margin:24px auto;background:#fff;padding:32px}.eyebrow{color:#68707a;font-size:12px;letter-spacing:.08em;text-transform:uppercase}h1{margin:8px 0;font-size:28px}h2{margin-top:30px;font-size:17px}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#142c45;color:#fff;text-align:left}th,td{padding:9px;border:1px solid #dce2e8;vertical-align:top}.meta td{border:0;padding:3px 12px 3px 0}.footer{margin-top:26px;color:#59636f;font-size:12px;line-height:1.55}</style></head><body><main class="page"><div class="eyebrow">MARKSMAN · XBF SISTEMAS LOGÍSTICOS</div><h1>Propuesta de Cotización</h1><p><strong>{{FOLIO_COTIZACION}}</strong><br>Fecha: {{FECHA_COTIZACION}} &nbsp; | &nbsp; Vigente hasta: {{VIGENCIA}}</p><p>Buen día {{NOMBRE_CONTACTO}},</p><p>Gracias por la oportunidad de apoyar a <strong>{{NOMBRE_CLIENTE}}</strong>. Con base en la información disponible, compartimos la siguiente propuesta preliminar de tarifa.</p><table class="meta"><tr><td><strong>Tipo</strong><br>{{TIPO_COTIZACION}}</td><td><strong>Operación</strong><br>{{OPERACION}}</td><td><strong>Valor mercancía</strong><br>{{VALOR_MERCANCIA}}</td><td><strong>Cotizó</strong><br>{{COTIZADO_POR}}</td></tr></table><h2>Oferta de Ruta y Tarifa</h2><table><thead><tr><th>#</th><th>Origen</th><th>Destino</th><th>Equipo</th><th>Config.</th><th>Operación</th><th>Servicio</th><th>Tarifa</th><th>Moneda</th><th>Cruce</th><th>Km/Millas</th></tr></thead><tbody>{{RUTAS_TABLA}}</tbody></table><h2>Términos de Cotización</h2><p>La tarifa aplica únicamente al cliente, ruta, equipo, perfil de carga, modalidad y vigencia indicados. Está sujeta a capacidad, equipo, documentación, cruce/frontera, validación de crédito y confirmación escrita aplicable.</p><p>Peajes, impuestos, aduana, inspecciones, storage, patio, transfer, transload, custodia, permisos, redocumentación y costos de terceros se excluyen salvo inclusión expresa. La cotización no activa por sí misma un servicio, unidad, capacidad ni obligación de ejecución.</p><p>Para proceder, favor de responder confirmando aceptación y proporcionar la información completa de booking. El servicio sólo se activa mediante la confirmación escrita aplicable.</p><p class="footer">Esta cotización es confidencial y se dirige únicamente al destinatario. Los cargos extraordinarios se clasifican por ambiente operativo, equipo, perfil de riesgo y fuente de costo. Para tramos U.S. brokerage aplicables, la entidad correspondiente actúa sólo conforme al instrumento escrito aplicable.</p></main></body></html>`,
  system: true,
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

// Email layouts are user content. Keep only inert markup; all quote values are escaped separately.
function sanitizeEmailHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|iframe|object|embed|form|input|button|base|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      "",
    )
    .replace(
      /<\/?(script|iframe|object|embed|form|input|button|base|svg|math)\b[^>]*>/gi,
      "",
    )
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s+(?:src|href)\s*=\s*(?:"\s*(?:javascript|data):[^"]*"|'\s*(?:javascript|data):[^']*'|\s*(?:javascript|data):[^\s>]+)/gi,
      "",
    );
}

function quoteRows(
  lines: Array<{
    origin: string;
    destination: string;
    equipment: string;
    config: string;
    operation: string;
    service: string;
    tariff: number;
    currency: string;
    borderCrossing: string | null;
    distance: string | null;
  }>,
) {
  return lines
    .map(
      (line, index) =>
        `<tr><td>${index + 1}</td><td>${escapeHtml(line.origin)}</td><td>${escapeHtml(line.destination)}</td><td>${escapeHtml(line.equipment)}</td><td>${escapeHtml(line.config)}</td><td>${escapeHtml(line.operation)}</td><td>${escapeHtml(line.service)}</td><td>${escapeHtml(line.tariff.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td><td>${escapeHtml(line.currency)}</td><td>${escapeHtml(line.borderCrossing)}</td><td>${escapeHtml(line.distance)}</td></tr>`,
    )
    .join("");
}

function renderTemplate(
  template: { subjectTemplate: string; htmlTemplate: string },
  quote: {
    folio: string;
    clientName: string;
    contactName: string | null;
    quoteType: string;
    goodsValue: string | null;
    validUntil: Date;
    lines: Array<{
      origin: string;
      destination: string;
      equipment: string;
      config: string;
      operation: string;
      service: string;
      tariff: number;
      currency: string;
      borderCrossing: string | null;
      distance: string | null;
    }>;
  },
  senderEmail: string,
) {
  const firstLine = quote.lines[0];
  const values: Record<string, string> = {
    FOLIO_COTIZACION: quote.folio,
    FECHA_COTIZACION: new Intl.DateTimeFormat("es-MX", {
      dateStyle: "long",
    }).format(new Date()),
    VIGENCIA: new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(
      quote.validUntil,
    ),
    NOMBRE_CLIENTE: quote.clientName,
    NOMBRE_CONTACTO: quote.contactName || quote.clientName,
    TIPO_COTIZACION: quote.quoteType,
    OPERACION: firstLine?.operation || "",
    VALOR_MERCANCIA: quote.goodsValue || "No declarado",
    COTIZADO_POR: senderEmail,
  };
  quote.lines.forEach((line, index) => {
    const n = index + 1;
    Object.assign(values, {
      [`ORIGEN_${n}`]: line.origin,
      [`DESTINO_${n}`]: line.destination,
      [`EQUIPO_${n}`]: line.equipment,
      [`CONFIG_${n}`]: line.config,
      [`OPERACION_${n}`]: line.operation,
      [`SERVICIO_${n}`]: line.service,
      [`TARIFA_${n}`]: line.tariff.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      [`MONEDA_${n}`]: line.currency,
      [`CRUCE_FRONTERA_${n}`]: line.borderCrossing || "",
      [`KM_MILLAS_${n}`]: line.distance || "",
    });
  });
  const replaceHtml = (_match: string, key: string) =>
    key === "RUTAS_TABLA"
      ? quoteRows(quote.lines)
      : escapeHtml(values[key] || "");
  const replaceText = (_match: string, key: string) =>
    escapeHtml(values[key] || "");
  const html = sanitizeEmailHtml(template.htmlTemplate).replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    replaceHtml,
  );
  const subject = template.subjectTemplate.replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    replaceText,
  );
  const csp =
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:;\">";
  const withCsp = /<head\b[^>]*>/i.test(html)
    ? html.replace(/<head\b[^>]*>/i, (head) => `${head}${csp}`)
    : /<html\b[^>]*>/i.test(html)
      ? html.replace(/<html\b[^>]*>/i, (tag) => `${tag}<head>${csp}</head>`)
      : `<!doctype html><html><head>${csp}</head><body>${html}</body></html>`;
  return {
    subject,
    html: withCsp,
    text: html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

export async function customerQuotesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.get("/customer-quote-templates", async (request) => {
    const orgId = (request.user as JwtPayload).orgId;
    const rows = await prisma.customerQuoteTemplate.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
    });
    return [SYSTEM_TEMPLATE, ...rows];
  });
  app.post(
    "/customer-quote-templates",
    { preHandler: requireRole("ADMIN", "OPERATOR") },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const input = TemplateInput.parse(request.body);
      const row = await prisma.customerQuoteTemplate.create({
        data: {
          ...input,
          htmlTemplate: sanitizeEmailHtml(input.htmlTemplate),
          orgId: user.orgId,
          createdById: user.sub,
        },
      });
      return reply.status(201).send(row);
    },
  );
  app.get("/customer-quotes/:id/preview", async (request) => {
    const user = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const { templateId = SYSTEM_TEMPLATE_ID } = request.query as {
      templateId?: string;
    };
    const quote = await prisma.customerQuote.findFirstOrThrow({
      where: { id, orgId: user.orgId },
      include: { lines: { orderBy: { position: "asc" } } },
    });
    const template =
      templateId === SYSTEM_TEMPLATE_ID
        ? SYSTEM_TEMPLATE
        : await prisma.customerQuoteTemplate.findFirstOrThrow({
            where: { id: templateId, orgId: user.orgId },
          });
    const sender = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { email: true },
    });
    return {
      template: { id: template.id, name: template.name },
      ...renderTemplate(template, quote, sender?.email || "Cotizaciones"),
    };
  });
  app.get("/customer-quotes/:id/email-drafts", async (request) => {
    const user = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    await prisma.customerQuote.findFirstOrThrow({
      where: { id, orgId: user.orgId },
      select: { id: true },
    });
    return prisma.customerQuoteEmailDraft.findMany({
      where: { orgId: user.orgId, customerQuoteId: id },
      select: {
        id: true,
        templateId: true,
        templateName: true,
        toEmail: true,
        subject: true,
        payloadChecksum: true,
        status: true,
        responseCode: true,
        receiptId: true,
        providerMessageId: true,
        providerThreadId: true,
        error: true,
        attemptedAt: true,
        sentAt: true,
        createdAt: true,
        createdBy: { select: { email: true } },
        sentBy: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });
  app.get(
    "/integration/rateware/customer-quote-email-drafts/:id",
    async (request) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const draft = await prisma.customerQuoteEmailDraft.findFirstOrThrow({
        where: { id, orgId: user.orgId },
        include: {
          customerQuote: { select: { folio: true } },
          createdBy: { select: { email: true } },
        },
      });
      return buildRatewareCustomerQuoteEmailDraftContract(draft);
    },
  );
  app.post(
    "/customer-quotes/:id/email-drafts",
    { preHandler: requireRole("ADMIN", "OPERATOR") },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const { templateId } = PrepareEmailDraft.parse(request.body);
      const quote = await prisma.customerQuote.findFirstOrThrow({
        where: { id, orgId: user.orgId },
        include: { lines: { orderBy: { position: "asc" } } },
      });
      if (!quote.contactEmail)
        throw Object.assign(
          new Error(
            "A recipient email is required before preparing a Gmail draft.",
          ),
          { statusCode: 422 },
        );
      const template =
        templateId === SYSTEM_TEMPLATE_ID
          ? SYSTEM_TEMPLATE
          : await prisma.customerQuoteTemplate.findFirst({
              where: { id: templateId, orgId: user.orgId },
            });
      if (!template)
        throw Object.assign(
          new Error("Selected email template was not found in this organization."),
          { statusCode: 404 },
        );
      const sender = await prisma.user.findUnique({
        where: { id: user.sub },
        select: { email: true },
      });
      const rendered = renderTemplate(
        template,
        quote,
        sender?.email || "Cotizaciones",
      );
      const payloadChecksum = customerQuoteEmailPayloadChecksum({
        toEmail: quote.contactEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      const draft = await prisma.customerQuoteEmailDraft.create({
        data: {
          orgId: user.orgId,
          customerQuoteId: quote.id,
          templateId: template.id,
          templateName: template.name,
          toEmail: quote.contactEmail,
          subject: rendered.subject,
          htmlBody: rendered.html,
          textBody: rendered.text,
          payloadChecksum,
          createdById: user.sub,
        },
      });
      return reply.status(201).send({
        id: draft.id,
        status: draft.status,
        toEmail: draft.toEmail,
        subject: draft.subject,
        payloadChecksum: draft.payloadChecksum,
        createdAt: draft.createdAt,
        policy: "PREPARED_ONLY_RATEWARE_GMAIL_DELIVERY_CONTRACT_REQUIRED",
      });
    },
  );
  app.post(
    "/customer-quote-email-drafts/:id/send",
    { preHandler: requireRole("ADMIN", "OPERATOR") },
    async (request) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const { expectedPayloadChecksum } = SendEmailDraft.parse(request.body || {});
      const actorBearer = request.headers.authorization;
      if (!actorBearer)
        throw Object.assign(
          new Error("A Kinde bearer token is required for Gmail delivery."),
          { statusCode: 401 },
        );
      const actor = await prisma.user.findUnique({
        where: { id: user.sub },
        select: { email: true },
      });
      const draft = await prisma.customerQuoteEmailDraft.findFirstOrThrow({
        where: { id, orgId: user.orgId },
        include: {
          customerQuote: {
            include: { lines: { orderBy: { position: "asc" } } },
          },
        },
      });
      if (!draft.customerQuote.contactEmail) {
        throw Object.assign(
          new Error(
            "The recipient email is missing. Prepare a new draft after updating contact email.",
          ),
          { statusCode: 409 },
        );
      }
      if (!draft.customerQuote.lines.length) {
        throw Object.assign(
          new Error("The quote has no route lines to compute a fresh payload."),
          { statusCode: 409 },
        );
      }
      const template =
        draft.templateId === SYSTEM_TEMPLATE_ID
          ? SYSTEM_TEMPLATE
          : await prisma.customerQuoteTemplate.findFirstOrThrow({
              where: { id: draft.templateId, orgId: user.orgId },
            });
      const quote = draft.customerQuote;
      const rendered = renderTemplate(template, quote, actor?.email || "Cotizaciones");
      const currentPayloadChecksum = customerQuoteEmailPayloadChecksum({
        toEmail: draft.customerQuote.contactEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      if (currentPayloadChecksum !== draft.payloadChecksum) {
        throw Object.assign(
          new Error(
            "El contenido del correo cambió desde la preparación; prepara de nuevo antes de enviar.",
          ),
          { statusCode: 409 },
        );
      }
      if (expectedPayloadChecksum && expectedPayloadChecksum !== draft.payloadChecksum) {
        throw Object.assign(
          new Error(
            "La sesión de envío cambió mientras preparabas el borrador. Vuelve a preparar.",
          ),
          { statusCode: 409 },
        );
      }
      return deliverCustomerQuoteEmail({
        orgId: user.orgId,
        actorId: user.sub,
        actorBearer,
        draftId: id,
      });
    },
  );
  app.post(
    "/customer-quote-email-drafts/:id/reconcile",
    { preHandler: requireRole("ADMIN", "OPERATOR") },
    async (request) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const actorBearer = request.headers.authorization;
      if (!actorBearer)
        throw Object.assign(
          new Error("A Kinde bearer token is required for Gmail reconciliation."),
          { statusCode: 401 },
        );
      return reconcileCustomerQuoteEmailDelivery({
        orgId: user.orgId,
        actorId: user.sub,
        actorBearer,
        draftId: id,
      });
    },
  );
  app.patch(
    "/customer-quotes/:id/status",
    { preHandler: requireRole("ADMIN", "OPERATOR") },
    async (request) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const { status: target } = TransitionCustomerQuote.parse(request.body);
      const quote = await prisma.customerQuote.findFirstOrThrow({
        where: { id, orgId: user.orgId },
        select: { id: true, status: true },
      });
      const blocker = customerQuoteTransitionBlocker({
        current: quote.status,
        target,
        role: user.role,
      });
      if (blocker)
        throw Object.assign(new Error(blocker), { statusCode: 409 });
      const now = new Date();
      const changed = await prisma.customerQuote.updateMany({
        where: { id, orgId: user.orgId, status: quote.status },
        data: {
          status: target,
          ...(target === "REVIEW"
            ? { reviewRequestedAt: now, reviewRequestedById: user.sub }
            : {}),
          ...(target === "APPROVED"
            ? { approvedAt: now, approvedById: user.sub }
            : {}),
        },
      });
      if (changed.count !== 1)
        throw Object.assign(
          new Error("Customer quote changed while the transition was being applied."),
          { statusCode: 409 },
        );
      return prisma.customerQuote.findFirstOrThrow({
        where: { id, orgId: user.orgId },
        include: {
          lines: { orderBy: { position: "asc" } },
          reviewRequestedBy: { select: { email: true } },
          approvedBy: { select: { email: true } },
        },
      });
    },
  );
  app.get("/customer-quotes", async (request) =>
    prisma.customerQuote.findMany({
      where: { orgId: (request.user as JwtPayload).orgId },
      include: {
        lines: true,
        reviewRequestedBy: { select: { email: true } },
        approvedBy: { select: { email: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  );
  app.get("/customer-quotes/:id", async (request) =>
    prisma.customerQuote.findFirstOrThrow({
      where: {
        id: (request.params as { id: string }).id,
        orgId: (request.user as JwtPayload).orgId,
      },
      include: { lines: { orderBy: { position: "asc" } } },
    }),
  );
  app.post(
    "/customer-quotes",
    { preHandler: requireRole("ADMIN", "OPERATOR") },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const input = Input.parse(request.body);
      const folio = `CQ-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const quote = await prisma.customerQuote.create({
        data: {
          ...input,
          folio,
          orgId: user.orgId,
          createdById: user.sub,
          lines: {
            create: input.lines.map((line, position) => ({
              ...line,
              position,
              currency: line.currency.toUpperCase(),
            })),
          },
        },
        include: { lines: true },
      });
      return reply.status(201).send(quote);
    },
  );
}
