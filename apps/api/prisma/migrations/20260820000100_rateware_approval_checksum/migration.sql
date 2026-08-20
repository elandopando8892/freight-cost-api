-- Bind a consequential Rateware delivery approval to the exact package reviewed.
ALTER TABLE "ApprovalRequest"
  ADD COLUMN "payloadChecksum" TEXT;

CREATE INDEX "ApprovalRequest_payloadChecksum_idx"
  ON "ApprovalRequest"("payloadChecksum");

ALTER TABLE "ApprovalRequest"
  ADD CONSTRAINT "ApprovalRequest_payloadChecksum_check"
  CHECK (
    "payloadChecksum" IS NULL
    OR "payloadChecksum" ~ '^[0-9a-f]{64}$'
  );
