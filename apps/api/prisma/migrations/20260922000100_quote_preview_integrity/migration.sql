CREATE TABLE "QuoteCalculationPreview" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "capture" JSONB NOT NULL,
    "lineage" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuoteCalculationPreview_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Quote"
    ADD COLUMN "previewId" TEXT;

CREATE TABLE "QuoteSaveIntent" (
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "intentHash" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuoteSaveIntent_pkey" PRIMARY KEY ("orgId", "key")
);

CREATE INDEX "QuoteCalculationPreview_orgId_expiresAt_idx" ON "QuoteCalculationPreview"("orgId", "expiresAt");
CREATE INDEX "QuoteSaveIntent_quoteId_idx" ON "QuoteSaveIntent"("quoteId");

ALTER TABLE "QuoteCalculationPreview" ADD CONSTRAINT "QuoteCalculationPreview_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuoteSaveIntent" ADD CONSTRAINT "QuoteSaveIntent_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteSaveIntent" ADD CONSTRAINT "QuoteSaveIntent_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
