import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { buildRatewareRateBookContract } from "./rateware-ratebook-contract.js";
import {
  buildRatewareDeliveryEnvelope,
  RATEWARE_RATEBOOK_CONTRACT_VERSION,
} from "./rateware-delivery-envelope.js";
import { trustedRatewareEndpoint } from "./rateware-endpoint.js";

const boundedError = (value: string) =>
  value.replace(/[\r\n]+/g, " ").slice(0, 1200);

type DeliveryBook = Parameters<typeof buildRatewareRateBookContract>[0] & {
  updatedAt: Date;
};

export async function deliverRateBookToRateware(input: {
  orgId: string;
  actorId: string;
  actorBearer: string;
  approvalRequestId: string;
  book: DeliveryBook;
}) {
  const endpoint = trustedRatewareEndpoint(
    env.RATEWARE_API_URL,
    env.NODE_ENV,
  );
  if (!endpoint)
    throw Object.assign(
      new Error("Rateware delivery is not configured for this environment."),
      { statusCode: 503 },
    );
  const { idempotencyKey, payload, payloadChecksum } =
    buildRatewareDeliveryEnvelope({ orgId: input.orgId, book: input.book });
  const prior = await prisma.ratewareDelivery.findUnique({
    where: { orgId_idempotencyKey: { orgId: input.orgId, idempotencyKey } },
  });
  if (prior?.status === "DELIVERED")
    return { delivery: prior, duplicate: true };

  let responseCode: number | undefined;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: input.actorBearer,
        "content-type": "application/json",
        "x-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        action: "receive_fcm_ratebook",
        idempotency_key: idempotencyKey,
        package: payload,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    responseCode = response.status;
    const raw = await response.text();
    const receipt = raw
      ? (JSON.parse(raw) as {
          accepted?: boolean;
          receipt_id?: string;
          duplicate?: boolean;
          error?: string;
        })
      : {};
    if (!response.ok || !receipt.accepted || !receipt.receipt_id)
      throw new Error(
        receipt.error ||
          `Rateware rejected the package (HTTP ${response.status}).`,
      );
    const delivery = await prisma.ratewareDelivery.upsert({
      where: { orgId_idempotencyKey: { orgId: input.orgId, idempotencyKey } },
      create: {
        orgId: input.orgId,
        rateBookId: input.book.id,
        approvalRequestId: input.approvalRequestId,
        actorId: input.actorId,
        contractVersion: RATEWARE_RATEBOOK_CONTRACT_VERSION,
        idempotencyKey,
        payloadChecksum,
        status: "DELIVERED",
        responseCode,
        receiptId: receipt.receipt_id,
        deliveredAt: new Date(),
      },
      update: {
        approvalRequestId: input.approvalRequestId,
        actorId: input.actorId,
        payloadChecksum,
        status: "DELIVERED",
        responseCode,
        receiptId: receipt.receipt_id,
        error: null,
        attemptedAt: new Date(),
        deliveredAt: new Date(),
      },
    });
    return { delivery, duplicate: Boolean(receipt.duplicate) };
  } catch (error) {
    const message = boundedError(
      error instanceof Error
        ? error.message
        : "Unknown Rateware delivery error.",
    );
    const delivery = await prisma.ratewareDelivery.upsert({
      where: { orgId_idempotencyKey: { orgId: input.orgId, idempotencyKey } },
      create: {
        orgId: input.orgId,
        rateBookId: input.book.id,
        approvalRequestId: input.approvalRequestId,
        actorId: input.actorId,
        contractVersion: RATEWARE_RATEBOOK_CONTRACT_VERSION,
        idempotencyKey,
        payloadChecksum,
        status: "FAILED",
        responseCode,
        error: message,
      },
      update: {
        approvalRequestId: input.approvalRequestId,
        actorId: input.actorId,
        payloadChecksum,
        status: "FAILED",
        responseCode,
        error: message,
        attemptedAt: new Date(),
        deliveredAt: null,
      },
    });
    throw Object.assign(new Error(message), {
      statusCode: responseCode && responseCode < 500 ? 422 : 502,
      deliveryId: delivery.id,
    });
  }
}
