ALTER TYPE "CustomerQuoteEmailStatus" ADD VALUE IF NOT EXISTS 'SENDING';
ALTER TYPE "CustomerQuoteEmailStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "CustomerQuoteEmailStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "CustomerQuoteEmailStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_UNKNOWN';

ALTER TABLE "CustomerQuote"
  ADD COLUMN "reviewRequestedAt" TIMESTAMP(3),
  ADD COLUMN "reviewRequestedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

ALTER TABLE "CustomerQuoteEmailDraft"
  ADD COLUMN "sentById" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "responseCode" INTEGER,
  ADD COLUMN "receiptId" TEXT,
  ADD COLUMN "providerMessageId" TEXT,
  ADD COLUMN "providerThreadId" TEXT,
  ADD COLUMN "error" TEXT,
  ADD COLUMN "attemptedAt" TIMESTAMP(3),
  ADD COLUMN "sentAt" TIMESTAMP(3);

CREATE INDEX "CustomerQuote_reviewRequestedById_idx" ON "CustomerQuote"("reviewRequestedById");
CREATE INDEX "CustomerQuote_approvedById_idx" ON "CustomerQuote"("approvedById");
CREATE UNIQUE INDEX "CustomerQuoteEmailDraft_orgId_idempotencyKey_key" ON "CustomerQuoteEmailDraft"("orgId", "idempotencyKey");
CREATE INDEX "CustomerQuoteEmailDraft_orgId_status_attemptedAt_idx" ON "CustomerQuoteEmailDraft"("orgId", "status", "attemptedAt");
CREATE INDEX "CustomerQuoteEmailDraft_sentById_attemptedAt_idx" ON "CustomerQuoteEmailDraft"("sentById", "attemptedAt");

ALTER TABLE "CustomerQuote" ADD CONSTRAINT "CustomerQuote_reviewRequestedById_fkey" FOREIGN KEY ("reviewRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerQuote" ADD CONSTRAINT "CustomerQuote_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerQuoteEmailDraft" ADD CONSTRAINT "CustomerQuoteEmailDraft_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
