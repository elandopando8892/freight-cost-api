CREATE TABLE "CustomerQuoteTemplate" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subjectTemplate" TEXT NOT NULL,
  "htmlTemplate" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerQuoteTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerQuoteTemplate_orgId_name_key" ON "CustomerQuoteTemplate"("orgId", "name");
CREATE INDEX "CustomerQuoteTemplate_orgId_updatedAt_idx" ON "CustomerQuoteTemplate"("orgId", "updatedAt");
ALTER TABLE "CustomerQuoteTemplate" ADD CONSTRAINT "CustomerQuoteTemplate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
