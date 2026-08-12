CREATE TYPE "QuoteAuditAction" AS ENUM ('CREATED', 'CONFIRMED');

CREATE TABLE "QuoteAuditEvent" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "action" "QuoteAuditAction" NOT NULL,
  "actorId" TEXT,
  "note" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuoteAuditEvent_quoteId_createdAt_idx" ON "QuoteAuditEvent"("quoteId", "createdAt");
CREATE INDEX "QuoteAuditEvent_orgId_createdAt_idx" ON "QuoteAuditEvent"("orgId", "createdAt");
CREATE INDEX "QuoteAuditEvent_actorId_idx" ON "QuoteAuditEvent"("actorId");

ALTER TABLE "QuoteAuditEvent" ADD CONSTRAINT "QuoteAuditEvent_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteAuditEvent" ADD CONSTRAINT "QuoteAuditEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
