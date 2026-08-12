ALTER TABLE "Quote"
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "confirmedById" TEXT,
  ADD COLUMN "confirmationNote" TEXT;

CREATE INDEX "Quote_confirmedById_idx" ON "Quote"("confirmedById");
CREATE INDEX "Quote_orgId_status_idx" ON "Quote"("orgId", "status");

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
