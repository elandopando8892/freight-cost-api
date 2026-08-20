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
 * `updatedAt` is the frozen export timestamp. The idempotency key binds the
 * tenant, RateBook id and complete payload checksum, so any lineage or tariff
 * drift creates a different key while an exact retry remains byte-identical.
 */
export function buildRatewareDeliveryEnvelope(input: {
  orgId: string;
  book: DeliveryBook;
}) {
  const payload = buildRatewareRateBookContract(
    input.book,
    input.book.updatedAt,
    input.orgId,
  );
  const payloadChecksum = sha256(JSON.stringify(payload));
  const idempotencyKey = sha256(
    `${RATEWARE_RATEBOOK_CONTRACT_VERSION}:${input.orgId}:${input.book.id}:${payloadChecksum}`,
  );

  return { idempotencyKey, payload, payloadChecksum };
}
