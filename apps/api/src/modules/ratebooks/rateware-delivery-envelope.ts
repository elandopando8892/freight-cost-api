import { createHash } from "node:crypto";
import { buildRatewareRateBookContract } from "./rateware-ratebook-contract.js";

export const RATEWARE_RATEBOOK_CONTRACT_VERSION = "fcm.rateware-ratebook.v1";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

type DeliveryBook = Parameters<typeof buildRatewareRateBookContract>[0] & {
  updatedAt: Date;
};

/**
 * Build the immutable transport envelope for one local RateBook revision.
 *
 * `updatedAt` is part of the idempotency key, so it is also the contract's
 * export timestamp. A retry for the same revision therefore sends exactly the
 * same JSON and checksum even when the previous response was lost.
 */
export function buildRatewareDeliveryEnvelope(input: {
  orgId: string;
  book: DeliveryBook;
}) {
  const idempotencyKey = sha256(
    `${RATEWARE_RATEBOOK_CONTRACT_VERSION}:${input.orgId}:${input.book.id}:${input.book.updatedAt.toISOString()}`,
  );
  const payload = buildRatewareRateBookContract(
    input.book,
    input.book.updatedAt,
  );
  const payloadChecksum = sha256(JSON.stringify(payload));

  return { idempotencyKey, payload, payloadChecksum };
}
