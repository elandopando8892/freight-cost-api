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
  approvedPayloadChecksum: string;
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
  if (input.approvedPayloadChecksum !== payloadChecksum) {
    throw Object.assign(
      new Error("The RateBook package changed after approval. Review the current checksum before delivery."),
      { statusCode: 409 },
    );
  }
  const prior = await prisma.ratewareDelivery.findUnique({
    where: { orgId_idempotencyKey: { orgId: input.orgId, idempotencyKey } },
  });
  if (prior?.status === "DELIVERED")
    return { delivery: prior, duplicate: true };

  let responseCode: number | undefined;
  let receiptId: string | undefined;
  let remotePayloadChecksum: string | undefined;
  let receiverRevision: string | undefined;
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
          payload_checksum?: string;
          receiver_revision?: string;
          duplicate?: boolean;
          error?: string;
        })
      : {};
    if (!response.ok || !receipt.accepted || !receipt.receipt_id)
      throw new Error(
        receipt.error ||
          `Rateware rejected the package (HTTP ${response.status}).`,
      );
    receiptId = receipt.receipt_id;
    remotePayloadChecksum = receipt.payload_checksum;
    receiverRevision = receipt.receiver_revision;
    if (remotePayloadChecksum !== payloadChecksum) {
      throw new Error(
        "Rateware receipt checksum does not match the delivered RateBook package.",
      );
    }
    if (!receiverRevision?.trim()) {
      throw new Error("Rateware receipt is missing the receiver revision.");
    }
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
        receiptId,
        remotePayloadChecksum,
        receiverRevision,
        deliveredAt: new Date(),
      },
      update: {
        approvalRequestId: input.approvalRequestId,
        actorId: input.actorId,
        payloadChecksum,
        status: "DELIVERED",
        responseCode,
        receiptId,
        remotePayloadChecksum,
        receiverRevision,
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
        receiptId,
        remotePayloadChecksum,
        receiverRevision,
        error: message,
      },
      update: {
        approvalRequestId: input.approvalRequestId,
        actorId: input.actorId,
        payloadChecksum,
        status: "FAILED",
        responseCode,
        receiptId,
        remotePayloadChecksum,
        receiverRevision,
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
