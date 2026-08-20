import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { trustedRatewareEndpoint } from "../ratebooks/rateware-endpoint.js";
import { buildRatewareCustomerQuoteEmailDraftContract } from "./customer-quote-email-outbox.js";

export const RATEWARE_CUSTOMER_QUOTE_EMAIL_CONTRACT_VERSION =
  "fcm.rateware-gmail-send.v1";

type EmailDraftStatus =
  | "PREPARED"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "DELIVERY_UNKNOWN";

type ReconciliationOutcome =
  | "SENT"
  | "FAILED"
  | "NOT_ATTEMPTED"
  | "DELIVERY_UNKNOWN";

type DeliverableEmailDraft = {
  id: string;
  orgId: string;
  customerQuoteId: string;
  templateId: string;
  templateName: string;
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  payloadChecksum: string;
  status: EmailDraftStatus;
  createdAt: Date;
  customerQuote: { folio: string; status: string };
  createdBy: { email: string };
};

const boundedError = (value: string) =>
  value.replace(/[\r\n]+/g, " ").slice(0, 1200);

export function buildCustomerQuoteEmailDeliveryEnvelope(input: {
  orgId: string;
  actorId: string;
  draft: DeliverableEmailDraft;
}) {
  const prepared = buildRatewareCustomerQuoteEmailDraftContract({
    ...input.draft,
    status: "PREPARED",
  });
  const idempotencyKey = createHash("sha256")
    .update(
      `${RATEWARE_CUSTOMER_QUOTE_EMAIL_CONTRACT_VERSION}:${input.orgId}:${input.draft.id}:${input.draft.payloadChecksum}`,
    )
    .digest("hex");
  return {
    idempotencyKey,
    payload: {
      contractVersion: RATEWARE_CUSTOMER_QUOTE_EMAIL_CONTRACT_VERSION,
      mode: "DELIVER" as const,
      idempotencyKey,
      sourceOrganizationId: input.orgId,
      authorization: {
        actorUserId: input.actorId,
        confirmation: "EXPLICIT_QUOTE_DESK_SEND" as const,
      },
      prepared,
    },
  };
}

class RatewareEmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly responseCode: number | undefined,
    readonly uncertain: boolean,
  ) {
    super(message);
  }
}

async function claimExclusivePayloadDelivery(input: {
  orgId: string;
  actorId: string;
  draft: DeliverableEmailDraft;
  idempotencyKey: string;
  attemptedAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const deliveryGroup = `${input.orgId}:${input.draft.customerQuoteId}:${input.draft.payloadChecksum}`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${deliveryGroup}, 0))`;
    const blocker = await tx.customerQuoteEmailDraft.findFirst({
      where: {
        id: { not: input.draft.id },
        orgId: input.orgId,
        customerQuoteId: input.draft.customerQuoteId,
        payloadChecksum: input.draft.payloadChecksum,
        status: { in: ["SENT", "SENDING", "DELIVERY_UNKNOWN"] },
      },
      select: { id: true, status: true },
    });
    if (blocker) return { claimed: false as const, blocker };

    const claim = await tx.customerQuoteEmailDraft.updateMany({
      where: {
        id: input.draft.id,
        orgId: input.orgId,
        status: { in: ["PREPARED", "FAILED"] },
      },
      data: {
        status: "SENDING",
        idempotencyKey: input.idempotencyKey,
        sentById: input.actorId,
        attemptedAt: input.attemptedAt,
        error: null,
      },
    });
    return { claimed: claim.count === 1, blocker: null };
  });
}

export async function deliverCustomerQuoteEmail(input: {
  orgId: string;
  actorId: string;
  actorBearer: string;
  draftId: string;
}) {
  const endpoint = trustedRatewareEndpoint(env.RATEWARE_API_URL, env.NODE_ENV);
  if (!endpoint)
    throw Object.assign(
      new Error("Rateware Gmail delivery is not configured for this environment."),
      { statusCode: 503 },
    );

  const draft = (await prisma.customerQuoteEmailDraft.findFirstOrThrow({
    where: { id: input.draftId, orgId: input.orgId },
    include: {
      customerQuote: { select: { folio: true, status: true } },
      createdBy: { select: { email: true } },
    },
  })) as DeliverableEmailDraft;
  if (draft.customerQuote.status !== "APPROVED")
    throw Object.assign(
      new Error("Only an approved customer quote can be sent."),
      { statusCode: 409 },
    );
  if (draft.status === "SENT") return { delivery: draft, duplicate: true };
  if (draft.status === "DELIVERY_UNKNOWN")
    throw Object.assign(
      new Error(
        "Gmail delivery is uncertain and must be reconciled before another attempt.",
      ),
      { statusCode: 409 },
    );
  if (draft.status === "SENDING")
    throw Object.assign(new Error("Gmail delivery is already in progress."), {
      statusCode: 409,
    });

  const { idempotencyKey, payload } =
    buildCustomerQuoteEmailDeliveryEnvelope({
      orgId: input.orgId,
      actorId: input.actorId,
      draft,
    });
  const attemptedAt = new Date();
  const claim = await claimExclusivePayloadDelivery({
    orgId: input.orgId,
    actorId: input.actorId,
    draft,
    idempotencyKey,
    attemptedAt,
  });
  if (claim.blocker)
    throw Object.assign(
      new Error(
        claim.blocker.status === "SENT"
          ? "This quote payload was already sent from another prepared draft."
          : "Another draft for this quote payload is sending or requires reconciliation.",
      ),
      { statusCode: 409 },
    );
  if (!claim.claimed)
    throw Object.assign(
      new Error("Gmail delivery could not acquire an exclusive send claim."),
      { statusCode: 409 },
    );

  let responseCode: number | undefined;
  let receipt: {
    accepted?: boolean;
    duplicate?: boolean;
    receipt_id?: string;
    provider_message_id?: string;
    provider_thread_id?: string;
    error?: string;
  } = {};
  try {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: input.actorBearer,
          "content-type": "application/json",
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          action: "send_fcm_customer_quote_email",
          idempotency_key: idempotencyKey,
          package: payload,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new RatewareEmailDeliveryError(
        error instanceof Error
          ? error.message
          : "Rateware Gmail did not return a response.",
        undefined,
        true,
      );
    }
    responseCode = response.status;
    const raw = await response.text();
    try {
      receipt = raw ? JSON.parse(raw) : {};
    } catch {
      throw new RatewareEmailDeliveryError(
        "Rateware Gmail returned an invalid response.",
        response.status,
        true,
      );
    }
    if (!response.ok)
      throw new RatewareEmailDeliveryError(
        receipt.error || `Rateware Gmail rejected the message (HTTP ${response.status}).`,
        response.status,
        response.status === 408 || response.status >= 500,
      );
    if (!receipt.accepted || !receipt.receipt_id)
      throw new RatewareEmailDeliveryError(
        receipt.error || "Rateware Gmail did not return a durable receipt.",
        response.status,
        true,
      );
  } catch (error) {
    const deliveryError =
      error instanceof RatewareEmailDeliveryError
        ? error
        : new RatewareEmailDeliveryError(
            error instanceof Error ? error.message : "Unknown Gmail delivery error.",
            responseCode,
            true,
          );
    const message = boundedError(deliveryError.message);
    await prisma.customerQuoteEmailDraft.update({
      where: { id: draft.id },
      data: {
        status: deliveryError.uncertain ? "DELIVERY_UNKNOWN" : "FAILED",
        responseCode: deliveryError.responseCode,
        error: message,
      },
    });
    throw Object.assign(new Error(message), {
      statusCode: deliveryError.uncertain ? 502 : 422,
      deliveryUnknown: deliveryError.uncertain,
    });
  }

  const delivery = await prisma.customerQuoteEmailDraft.update({
    where: { id: draft.id },
    data: {
      status: "SENT",
      responseCode,
      receiptId: receipt.receipt_id,
      providerMessageId: receipt.provider_message_id,
      providerThreadId: receipt.provider_thread_id,
      error: null,
      sentAt: new Date(),
    },
  });
  return { delivery, duplicate: Boolean(receipt.duplicate) };
}

export async function reconcileCustomerQuoteEmailDelivery(input: {
  orgId: string;
  actorId: string;
  actorBearer: string;
  draftId: string;
}) {
  const endpoint = trustedRatewareEndpoint(env.RATEWARE_API_URL, env.NODE_ENV);
  if (!endpoint)
    throw Object.assign(
      new Error("Rateware Gmail delivery is not configured for this environment."),
      { statusCode: 503 },
    );

  const draft = (await prisma.customerQuoteEmailDraft.findFirstOrThrow({
    where: { id: input.draftId, orgId: input.orgId },
    include: {
      customerQuote: { select: { folio: true, status: true } },
      createdBy: { select: { email: true } },
    },
  })) as DeliverableEmailDraft;
  if (draft.status === "SENT")
    return { delivery: draft, outcome: "SENT" as const, retryable: false };
  if (draft.status !== "DELIVERY_UNKNOWN")
    throw Object.assign(
      new Error("Only a delivery with an uncertain outcome can be reconciled."),
      { statusCode: 409 },
    );

  const { idempotencyKey, payload } = buildCustomerQuoteEmailDeliveryEnvelope({
    orgId: input.orgId,
    actorId: input.actorId,
    draft,
  });
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: input.actorBearer,
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        action: "reconcile_fcm_customer_quote_email",
        idempotency_key: idempotencyKey,
        package: payload,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw Object.assign(
      new Error(
        boundedError(
          error instanceof Error
            ? error.message
            : "Rateware reconciliation did not return a response.",
        ),
      ),
      { statusCode: 502 },
    );
  }

  const raw = await response.text();
  let receipt: {
    reconciled?: boolean;
    outcome?: ReconciliationOutcome;
    retryable?: boolean;
    receipt_id?: string | null;
    provider_message_id?: string | null;
    provider_thread_id?: string | null;
    sent_at?: string | null;
    error?: string | null;
  } = {};
  try {
    receipt = raw ? JSON.parse(raw) : {};
  } catch {
    throw Object.assign(
      new Error("Rateware Gmail returned an invalid reconciliation response."),
      { statusCode: 502 },
    );
  }
  if (!response.ok || !receipt.reconciled || !receipt.outcome)
    throw Object.assign(
      new Error(
        boundedError(
          receipt.error ||
            `Rateware Gmail reconciliation failed (HTTP ${response.status}).`,
        ),
      ),
      { statusCode: 502 },
    );

  if (receipt.outcome === "SENT") {
    if (!receipt.receipt_id || !receipt.provider_message_id)
      throw Object.assign(
        new Error("Rateware reconciliation returned SENT without a durable Gmail receipt."),
        { statusCode: 502 },
      );
    const delivery = await prisma.customerQuoteEmailDraft.update({
      where: { id: draft.id },
      data: {
        status: "SENT",
        responseCode: response.status,
        receiptId: receipt.receipt_id,
        providerMessageId: receipt.provider_message_id,
        providerThreadId: receipt.provider_thread_id,
        error: null,
        sentAt: receipt.sent_at ? new Date(receipt.sent_at) : new Date(),
      },
    });
    return { delivery, outcome: "SENT" as const, retryable: false };
  }

  if (receipt.outcome === "NOT_ATTEMPTED" || receipt.outcome === "FAILED") {
    const message = boundedError(
      receipt.error ||
        (receipt.outcome === "NOT_ATTEMPTED"
          ? "Rateware confirmó que Gmail no intentó el envío; se permite un reintento deliberado."
          : "Rateware confirmó que el intento anterior de Gmail falló antes de ser aceptado."),
    );
    const delivery = await prisma.customerQuoteEmailDraft.update({
      where: { id: draft.id },
      data: {
        status: "FAILED",
        responseCode: response.status,
        receiptId: receipt.receipt_id,
        providerMessageId: receipt.provider_message_id,
        providerThreadId: receipt.provider_thread_id,
        error: message,
      },
    });
    return {
      delivery,
      outcome: receipt.outcome,
      retryable: Boolean(receipt.retryable),
    };
  }

  const delivery = await prisma.customerQuoteEmailDraft.update({
    where: { id: draft.id },
    data: {
      status: "DELIVERY_UNKNOWN",
      responseCode: response.status,
      receiptId: receipt.receipt_id,
      providerMessageId: receipt.provider_message_id,
      providerThreadId: receipt.provider_thread_id,
      error: boundedError(
        receipt.error || "Gmail delivery remains uncertain; do not retry.",
      ),
    },
  });
  return { delivery, outcome: "DELIVERY_UNKNOWN" as const, retryable: false };
}
