import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import type { JwtPayload } from "../auth/auth.schema.js";
import { buildRatewareRateBookContract } from "./rateware-ratebook-contract.js";
import { deliverRateBookToRateware } from "./rateware-delivery.js";
import { ratewareDeliveryApprovalBlocker } from "./rateware-delivery-approval.js";
import { ratewareDeliveryEvidenceCsv } from "./rateware-delivery-evidence.js";

const CreateRateBook = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  costBaseId: z.string().cuid(),
  assumptionSetId: z.string().cuid(),
  currency: z.enum(["USD", "MXN"]).default("USD"),
  effectiveFrom: z.coerce.date(),
  effectiveUntil: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
const AddEntries = z.object({
  quoteIds: z.array(z.string().cuid()).min(1).max(250),
});
const Publication = z.object({ note: z.string().trim().min(3).max(2000) });
const RegenerationDraft = z.object({
  note: z.string().trim().min(3).max(2000),
  effectiveFrom: z.coerce.date(),
  quoteIds: z.array(z.string().cuid()).min(1).max(250),
});

const bookInclude = {
  costBase: {
    select: { id: true, code: true, name: true, scope: true, status: true },
  },
  set: { select: { id: true, name: true, version: true, status: true } },
  _count: { select: { entries: true } },
} satisfies Prisma.RateBookInclude;
const bookDetailInclude = {
  ...bookInclude,
  entries: {
    orderBy: [{ operation: "asc" }, { origin: "asc" }, { destination: "asc" }],
  },
} satisfies Prisma.RateBookInclude;
const quoteInclude = {
  lane: { select: { origin: true, destination: true, config: true } },
  productionRoute: {
    select: {
      id: true,
      origin: true,
      destination: true,
      truckType: true,
      trailerType: true,
      config: true,
    },
  },
} satisfies Prisma.QuoteInclude;

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}
function csvCell(value: unknown) {
  const text = String(value ?? "");
  const formulaSafe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(formulaSafe)
    ? `"${formulaSafe.replace(/"/g, '""')}"`
    : formulaSafe;
}
function csvDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
async function governedBook(orgId: string, id: string) {
  return prisma.rateBook.findFirstOrThrow({
    where: { id, orgId },
    include: bookDetailInclude,
  });
}
async function assertPublishableLineage(
  orgId: string,
  costBaseId: string,
  assumptionSetId: string,
) {
  const [base, set] = await Promise.all([
    prisma.costBase.findFirst({
      where: { id: costBaseId, orgId },
      select: { id: true, status: true },
    }),
    prisma.assumptionSet.findFirst({
      where: { id: assumptionSetId, orgId },
      select: { id: true, status: true, costBaseId: true },
    }),
  ]);
  if (!base) throw httpError("Cost base not found in this organization.", 404);
  if (!set)
    throw httpError("Assumption version not found in this organization.", 404);
  if (base.status !== "ACTIVE")
    throw httpError("A RateBook requires an active cost base.", 422);
  if (set.status !== "PUBLISHED" || set.costBaseId !== base.id)
    throw httpError(
      "A RateBook requires a published assumption version belonging to its cost base.",
      422,
    );
}
async function regenerationPreview(orgId: string, id: string) {
  const source = await governedBook(orgId, id);
  if (source.status !== "PUBLISHED")
    throw httpError(
      "Only a published RateBook can be assessed for regeneration.",
      409,
    );
  const activeSet = await prisma.assumptionSet.findFirst({
    where: {
      orgId,
      costBaseId: source.costBaseId,
      status: "PUBLISHED",
      isActive: true,
    },
    select: { id: true, name: true, version: true, status: true },
  });
  const sourceRouteIds = source.entries
    .map((entry) => entry.sourceProductionRouteId)
    .filter((id): id is string => Boolean(id));
  const sourceRoutes = sourceRouteIds.length
    ? await prisma.productionRoute.findMany({
        where: { orgId, id: { in: sourceRouteIds } },
        select: { id: true, status: true, revision: true },
      })
    : [];
  const routeById = new Map(sourceRoutes.map((route) => [route.id, route]));
  const entries = source.entries.map((entry) => {
    const route = entry.sourceProductionRouteId
      ? routeById.get(entry.sourceProductionRouteId)
      : null;
    const reasons = [
      ...(activeSet?.id !== source.assumptionSetId
        ? ["ASSUMPTION_VERSION_CHANGED"]
        : []),
      ...(route && route.status !== "PRODUCTION"
        ? [`SOURCE_ROUTE_${route.status}`]
        : []),
      ...(!route && entry.sourceProductionRouteId
        ? ["SOURCE_ROUTE_MISSING"]
        : []),
    ];
    return {
      id: entry.id,
      origin: entry.origin,
      destination: entry.destination,
      operation: entry.operation,
      sourceQuoteId: entry.sourceQuoteId,
      current: reasons.length === 0,
      reasons,
    };
  });
  const requiresRegeneration = entries.some((entry) => !entry.current);
  const candidates =
    activeSet && requiresRegeneration
      ? await prisma.quote.findMany({
          where: {
            orgId,
            status: "CONFIRMED",
            costBaseId: source.costBaseId,
            assumptionSetId: activeSet.id,
          },
          include: quoteInclude,
          orderBy: { confirmedAt: "desc" },
        })
      : [];
  return {
    source: {
      id: source.id,
      code: source.code,
      name: source.name,
      assumptionSetId: source.assumptionSetId,
      entryCount: source.entries.length,
    },
    activeSet,
    requiresRegeneration,
    entries,
    candidates,
  };
}

export async function rateBooksRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.get("/ratebooks", async (request) =>
    prisma.rateBook.findMany({
      where: { orgId: (request.user as JwtPayload).orgId },
      include: bookInclude,
      orderBy: [{ status: "asc" }, { effectiveFrom: "desc" }],
    }),
  );
  app.get("/ratebooks/:id/export.csv", async (request, reply) => {
    const { orgId } = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const book = await prisma.rateBook.findFirstOrThrow({
      where: { id, orgId },
      include: {
        costBase: { select: { code: true, name: true, scope: true } },
        set: { select: { name: true, version: true } },
        entries: {
          orderBy: [
            { operation: "asc" },
            { origin: "asc" },
            { destination: "asc" },
            { id: "asc" },
          ],
        },
      },
    });
    if (book.status !== "PUBLISHED")
      throw httpError(
        "Only a published RateBook can be exported operationally.",
        409,
      );
    const header = [
      "RateBook Code",
      "RateBook Name",
      "RateBook Status",
      "Effective From",
      "Effective Until",
      "Cost Base Code",
      "Cost Base Name",
      "Cost Base Scope",
      "Assumption Set",
      "Assumption Version",
      "Origin",
      "Destination",
      "Operation",
      "Service",
      "Equipment",
      "Config",
      "Published Tariff",
      "Currency",
      "Source Tariff USD",
      "Source Tariff MXN",
      "FX Used",
      "Source Quote ID",
      "Source Quote Version",
      "Source Production Route ID",
    ];
    const rows = book.entries.map((entry) =>
      [
        book.code,
        book.name,
        book.status,
        csvDate(book.effectiveFrom),
        csvDate(book.effectiveUntil),
        book.costBase.code,
        book.costBase.name,
        book.costBase.scope,
        book.set.name,
        book.set.version,
        entry.origin,
        entry.destination,
        entry.operation,
        entry.service,
        entry.equipment,
        entry.config,
        entry.publishedTariff,
        entry.currency,
        entry.sourceTariffUsd,
        entry.sourceTariffMxn,
        entry.fxRateUsed,
        entry.sourceQuoteId,
        entry.sourceQuoteVersion,
        entry.sourceProductionRouteId,
      ]
        .map(csvCell)
        .join(","),
    );
    const filename = `${book.code.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}-${csvDate(book.effectiveFrom) || "ratebook"}.csv`;
    reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", `attachment; filename="${filename}"`)
      .header("cache-control", "no-store");
    return reply.send(
      `\uFEFF${[header.map(csvCell).join(","), ...rows].join("\r\n")}\r\n`,
    );
  });
  app.get("/integration/rateware/ratebooks/:id", async (request) => {
    const { orgId } = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const book = await prisma.rateBook.findFirstOrThrow({
      where: { id, orgId },
      include: {
        costBase: {
          select: {
            id: true,
            code: true,
            name: true,
            scope: true,
            status: true,
          },
        },
        set: { select: { id: true, name: true, version: true, status: true } },
        entries: {
          orderBy: [
            { operation: "asc" },
            { origin: "asc" },
            { destination: "asc" },
            { id: "asc" },
          ],
        },
      },
    });
    if (book.status !== "PUBLISHED")
      throw httpError(
        "Only a published RateBook can be packaged for Rateware.",
        409,
      );
    return buildRatewareRateBookContract(book);
  });
  app.get("/integration/rateware/ratebooks/:id/deliveries", async (request) => {
    const { orgId } = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    await prisma.rateBook.findFirstOrThrow({
      where: { id, orgId },
      select: { id: true },
    });
    return prisma.ratewareDelivery.findMany({
      where: { orgId, rateBookId: id },
      orderBy: { attemptedAt: "desc" },
      take: 20,
    });
  });
  app.get(
    "/integration/rateware/ratebooks/:id/deliveries/evidence.csv",
    async (request, reply) => {
      const { orgId } = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const book = await prisma.rateBook.findFirstOrThrow({
        where: { id, orgId },
        select: { code: true },
      });
      const deliveries = await prisma.ratewareDelivery.findMany({
        where: { orgId, rateBookId: id },
        select: {
          id: true,
          status: true,
          attemptedAt: true,
          deliveredAt: true,
          responseCode: true,
          receiptId: true,
          payloadChecksum: true,
          error: true,
          approvalRequest: {
            select: {
              id: true,
              status: true,
              requestNote: true,
              decisionNote: true,
              reviewedAt: true,
              requestedBy: { select: { email: true } },
              reviewedBy: { select: { email: true } },
            },
          },
        },
        orderBy: { attemptedAt: "desc" },
        take: 100,
      });
      const filename = `fcm-rateware-evidence-${book.code.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}.csv`;
      return reply
        .header("cache-control", "no-store")
        .header("content-disposition", `attachment; filename="${filename}"`)
        .type("text/csv; charset=utf-8")
        .send(
          ratewareDeliveryEvidenceCsv({
            generatedAt: new Date(),
            rateBookCode: book.code,
            deliveries,
          }),
        );
    },
  );
  app.post(
    "/integration/rateware/ratebooks/:id/deliver",
    { preHandler: requireRole("ADMIN") },
    async (request) => {
      const { orgId } = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const actorBearer = request.headers.authorization;
      if (!actorBearer?.startsWith("Bearer "))
        throw httpError(
          "A Kinde bearer token is required for Rateware delivery.",
          401,
        );
      const book = await prisma.rateBook.findFirstOrThrow({
        where: { id, orgId },
        include: {
          costBase: {
            select: {
              id: true,
              code: true,
              name: true,
              scope: true,
              status: true,
            },
          },
          set: {
            select: { id: true, name: true, version: true, status: true },
          },
          entries: {
            orderBy: [
              { operation: "asc" },
              { origin: "asc" },
              { destination: "asc" },
              { id: "asc" },
            ],
          },
        },
      });
      if (book.status !== "PUBLISHED")
        throw httpError(
          "Only a published RateBook can be delivered to Rateware.",
          409,
        );
      const approval = await prisma.approvalRequest.findFirst({
        where: {
          orgId,
          rateBookId: book.id,
          action: "RATEWARE_DELIVERY",
          status: "APPROVED",
        },
        select: { id: true, reviewedAt: true },
        orderBy: { reviewedAt: "desc" },
      });
      const approvalBlocker = ratewareDeliveryApprovalBlocker(approval);
      if (approvalBlocker || !approval)
        throw httpError(
          approvalBlocker ??
            "Rateware delivery requires an approved delivery request.",
          422,
        );
      return deliverRateBookToRateware({
        orgId,
        actorId: (request.user as JwtPayload).sub,
        actorBearer,
        approvalRequestId: approval.id,
        book,
      });
    },
  );
  app.get("/ratebooks/:id", async (request) =>
    governedBook(
      (request.user as JwtPayload).orgId,
      (request.params as { id: string }).id,
    ),
  );
  // Evidence-only view for the operator before export or Rateware delivery.
  app.get("/ratebooks/:id/lineage", async (request) => {
    const { orgId } = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const book = await prisma.rateBook.findFirstOrThrow({
      where: { id, orgId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        sourceRateBookId: true,
        sourceRateBook: {
          select: { id: true, code: true, name: true, status: true },
        },
        costBase: {
          select: {
            id: true,
            code: true,
            name: true,
            scope: true,
            status: true,
          },
        },
        set: {
          select: {
            id: true,
            name: true,
            version: true,
            status: true,
            scenarioReviewSource: {
              select: {
                id: true,
                status: true,
                sourceChecksum: true,
                quoteId: true,
                reviewedAt: true,
              },
            },
          },
        },
        ratewareDeliveries: {
          select: {
            id: true,
            status: true,
            approvalRequestId: true,
            receiptId: true,
            attemptedAt: true,
            deliveredAt: true,
            error: true,
            approvalRequest: {
              select: {
                id: true,
                status: true,
                requestNote: true,
                decisionNote: true,
                reviewedAt: true,
                requestedBy: { select: { email: true } },
                reviewedBy: { select: { email: true } },
              },
            },
          },
          orderBy: { attemptedAt: "desc" },
          take: 10,
        },
      },
    });
    return { policy: "READ_ONLY_LINEAGE_NO_RATEWARE_DELIVERY", rateBook: book };
  });
  app.post(
    "/ratebooks",
    { preHandler: requireRole("ADMIN") },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const input = CreateRateBook.parse(request.body);
      if (input.effectiveUntil && input.effectiveUntil < input.effectiveFrom)
        throw httpError("Effective end date must follow the start date.", 422);
      await assertPublishableLineage(
        user.orgId,
        input.costBaseId,
        input.assumptionSetId,
      );
      return reply.status(201).send(
        await prisma.rateBook.create({
          data: { ...input, orgId: user.orgId },
          include: bookDetailInclude,
        }),
      );
    },
  );
  app.get("/ratebooks/:id/candidates", async (request) => {
    const { orgId } = request.user as JwtPayload;
    const book = await governedBook(
      orgId,
      (request.params as { id: string }).id,
    );
    if (book.status !== "DRAFT")
      throw httpError("Only a draft RateBook can change its entries.", 409);
    const used = book.entries.map((entry) => entry.sourceQuoteId);
    return prisma.quote.findMany({
      where: {
        orgId,
        status: "CONFIRMED",
        costBaseId: book.costBaseId,
        assumptionSetId: book.assumptionSetId,
        ...(used.length ? { id: { notIn: used } } : {}),
      },
      include: quoteInclude,
      orderBy: { confirmedAt: "desc" },
    });
  });
  app.get("/ratebooks/:id/regeneration-preview", async (request) =>
    regenerationPreview(
      (request.user as JwtPayload).orgId,
      (request.params as { id: string }).id,
    ),
  );
  app.post(
    "/ratebooks/:id/regeneration-drafts",
    { preHandler: requireRole("ADMIN") },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const source = await governedBook(
        user.orgId,
        (request.params as { id: string }).id,
      );
      if (source.status !== "PUBLISHED")
        throw httpError(
          "Only a published RateBook can create a regeneration draft.",
          409,
        );
      const preview = await regenerationPreview(user.orgId, source.id);
      if (!preview.requiresRegeneration || !preview.activeSet)
        throw httpError(
          "This RateBook has no detected regeneration requirement.",
          409,
        );
      const input = RegenerationDraft.parse(request.body);
      const quotes = await prisma.quote.findMany({
        where: {
          id: { in: input.quoteIds },
          orgId: user.orgId,
          status: "CONFIRMED",
          costBaseId: source.costBaseId,
          assumptionSetId: preview.activeSet.id,
        },
        include: quoteInclude,
      });
      if (quotes.length !== input.quoteIds.length)
        throw httpError(
          "Every selected quote must be confirmed and use the active published assumption version.",
          422,
        );
      const priorDrafts = await prisma.rateBook.count({
        where: { orgId: user.orgId, sourceRateBookId: source.id },
      });
      const code = `${source.code.slice(0, 34)}-R${priorDrafts + 1}`;
      const draft = await prisma.$transaction(async (tx) => {
        const created = await tx.rateBook.create({
          data: {
            orgId: user.orgId,
            sourceRateBookId: source.id,
            regenerationNote: input.note,
            code,
            name: `${source.name} · Regeneration ${priorDrafts + 1}`,
            costBaseId: source.costBaseId,
            assumptionSetId: preview.activeSet!.id,
            currency: source.currency,
            effectiveFrom: input.effectiveFrom,
            effectiveUntil: source.effectiveUntil,
            notes: `Proposed from ${source.code}. Review and publish explicitly.`,
          },
          include: bookDetailInclude,
        });
        for (const quote of quotes) {
          const route = quote.productionRoute ?? quote.lane;
          if (!route?.origin || !route.destination)
            throw httpError(
              `Quote ${quote.id} has no route endpoints to snapshot.`,
              422,
            );
          await tx.rateBookEntry.create({
            data: {
              rateBookId: created.id,
              sourceQuoteId: quote.id,
              sourceProductionRouteId: quote.productionRouteId,
              sourceQuoteVersion: quote.version,
              origin: route.origin,
              destination: route.destination,
              operation: quote.operation,
              service: quote.service,
              equipment: quote.productionRoute
                ? `${quote.productionRoute.truckType} / ${quote.productionRoute.trailerType}`
                : null,
              config: route.config ?? null,
              publishedTariff:
                source.currency === "MXN"
                  ? quote.requiredTariffMxn
                  : quote.requiredTariffUsd,
              currency: source.currency,
              sourceTariffUsd: quote.requiredTariffUsd,
              sourceTariffMxn: quote.requiredTariffMxn,
              fxRateUsed: quote.fxRateUsed,
            },
          });
        }
        return tx.rateBook.findUniqueOrThrow({
          where: { id: created.id },
          include: bookDetailInclude,
        });
      });
      return reply.status(201).send(draft);
    },
  );
  app.post(
    "/ratebooks/:id/entries",
    { preHandler: requireRole("ADMIN") },
    async (request) => {
      const user = request.user as JwtPayload;
      const book = await governedBook(
        user.orgId,
        (request.params as { id: string }).id,
      );
      if (book.status !== "DRAFT")
        throw httpError("Only a draft RateBook can change its entries.", 409);
      const { quoteIds } = AddEntries.parse(request.body);
      const quotes = await prisma.quote.findMany({
        where: {
          id: { in: quoteIds },
          orgId: user.orgId,
          status: "CONFIRMED",
          costBaseId: book.costBaseId,
          assumptionSetId: book.assumptionSetId,
        },
        include: quoteInclude,
      });
      if (quotes.length !== quoteIds.length)
        throw httpError(
          "Every selected quote must be confirmed and match the RateBook base/version.",
          422,
        );
      await prisma.$transaction(async (tx) => {
        for (const quote of quotes) {
          const source = quote.productionRoute ?? quote.lane;
          if (!source?.origin || !source.destination)
            throw httpError(
              `Quote ${quote.id} has no route endpoints to snapshot.`,
              422,
            );
          await tx.rateBookEntry.create({
            data: {
              rateBookId: book.id,
              sourceQuoteId: quote.id,
              sourceProductionRouteId: quote.productionRouteId,
              sourceQuoteVersion: quote.version,
              origin: source.origin,
              destination: source.destination,
              operation: quote.operation,
              service: quote.service,
              equipment: quote.productionRoute
                ? `${quote.productionRoute.truckType} / ${quote.productionRoute.trailerType}`
                : null,
              config: source.config ?? null,
              publishedTariff:
                book.currency === "MXN"
                  ? quote.requiredTariffMxn
                  : quote.requiredTariffUsd,
              currency: book.currency,
              sourceTariffUsd: quote.requiredTariffUsd,
              sourceTariffMxn: quote.requiredTariffMxn,
              fxRateUsed: quote.fxRateUsed,
            },
          });
        }
      });
      return governedBook(user.orgId, book.id);
    },
  );
  app.post(
    "/ratebooks/:id/publish",
    { preHandler: requireRole("ADMIN") },
    async (request) => {
      const user = request.user as JwtPayload;
      const book = await governedBook(
        user.orgId,
        (request.params as { id: string }).id,
      );
      if (book.status !== "DRAFT")
        throw httpError("Only a draft RateBook can be published.", 409);
      if (!book.entries.length)
        throw httpError(
          "Add at least one confirmed quote before publishing.",
          422,
        );
      await assertPublishableLineage(
        user.orgId,
        book.costBaseId,
        book.assumptionSetId,
      );
      const { note } = Publication.parse(request.body);
      return prisma.rateBook.update({
        where: { id: book.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          publishedById: user.sub,
          publicationNote: note,
        },
        include: bookDetailInclude,
      });
    },
  );
  app.post(
    "/ratebooks/:id/archive",
    { preHandler: requireRole("ADMIN") },
    async (request) => {
      const user = request.user as JwtPayload;
      const book = await governedBook(
        user.orgId,
        (request.params as { id: string }).id,
      );
      if (book.status === "ARCHIVED")
        throw httpError("RateBook is already archived.", 409);
      const { note } = Publication.parse(request.body);
      return prisma.rateBook.update({
        where: { id: book.id },
        data: {
          status: "ARCHIVED",
          publicationNote:
            `${book.publicationNote ?? ""}\nArchived: ${note}`.trim(),
        },
        include: bookDetailInclude,
      });
    },
  );
}
