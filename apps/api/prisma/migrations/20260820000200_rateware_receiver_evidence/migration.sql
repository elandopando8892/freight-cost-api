ALTER TABLE "RatewareDelivery"
  ADD COLUMN "remotePayloadChecksum" TEXT,
  ADD COLUMN "receiverRevision" TEXT;

ALTER TABLE "RatewareDelivery"
  ADD CONSTRAINT "RatewareDelivery_remotePayloadChecksum_sha256_check"
  CHECK (
    "remotePayloadChecksum" IS NULL
    OR "remotePayloadChecksum" ~ '^[0-9a-f]{64}$'
  );
