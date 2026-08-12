CREATE TYPE "CustomerQuoteEmailStatus" AS ENUM ('PREPARED');

CREATE TABLE "CustomerQuoteEmailDraft" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "customerQuoteId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT NOT NULL,
  "payloadChecksum" TEXT NOT NULL,
  "status" "CustomerQuoteEmailStatus" NOT NULL DEFAULT 'PREPARED',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerQuoteEmailDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerQuoteEmailDraft_orgId_customerQuoteId_createdAt_idx" ON "CustomerQuoteEmailDraft"("orgId", "customerQuoteId", "createdAt");
CREATE INDEX "CustomerQuoteEmailDraft_createdById_createdAt_idx" ON "CustomerQuoteEmailDraft"("createdById", "createdAt");

ALTER TABLE "CustomerQuoteEmailDraft" ADD CONSTRAINT "CustomerQuoteEmailDraft_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerQuoteEmailDraft" ADD CONSTRAINT "CustomerQuoteEmailDraft_customerQuoteId_fkey" FOREIGN KEY ("customerQuoteId") REFERENCES "CustomerQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerQuoteEmailDraft" ADD CONSTRAINT "CustomerQuoteEmailDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
