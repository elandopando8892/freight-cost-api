CREATE TYPE "RateBookStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TABLE "RateBook" (
  "id" TEXT NOT NULL, "orgId" TEXT NOT NULL, "costBaseId" TEXT NOT NULL, "assumptionSetId" TEXT NOT NULL,
  "code" TEXT NOT NULL, "name" TEXT NOT NULL, "currency" TEXT NOT NULL DEFAULT 'USD',
  "effectiveFrom" TIMESTAMP(3) NOT NULL, "effectiveUntil" TIMESTAMP(3), "status" "RateBookStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT, "publicationNote" TEXT, "publishedAt" TIMESTAMP(3), "publishedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateBook_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RateBookEntry" (
  "id" TEXT NOT NULL, "rateBookId" TEXT NOT NULL, "sourceQuoteId" TEXT NOT NULL, "sourceProductionRouteId" TEXT,
  "sourceQuoteVersion" INTEGER NOT NULL, "origin" TEXT NOT NULL, "destination" TEXT NOT NULL, "operation" TEXT NOT NULL,
  "service" TEXT NOT NULL, "equipment" TEXT, "config" TEXT, "publishedTariff" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL, "sourceTariffUsd" DOUBLE PRECISION NOT NULL, "sourceTariffMxn" DOUBLE PRECISION NOT NULL,
  "fxRateUsed" DOUBLE PRECISION NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateBookEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RateBook_orgId_code_key" ON "RateBook"("orgId", "code");
CREATE INDEX "RateBook_orgId_status_effectiveFrom_idx" ON "RateBook"("orgId", "status", "effectiveFrom");
CREATE INDEX "RateBook_costBaseId_assumptionSetId_idx" ON "RateBook"("costBaseId", "assumptionSetId");
CREATE UNIQUE INDEX "RateBookEntry_rateBookId_sourceQuoteId_key" ON "RateBookEntry"("rateBookId", "sourceQuoteId");
CREATE INDEX "RateBookEntry_rateBookId_operation_idx" ON "RateBookEntry"("rateBookId", "operation");
CREATE INDEX "RateBookEntry_sourceProductionRouteId_idx" ON "RateBookEntry"("sourceProductionRouteId");
ALTER TABLE "RateBook" ADD CONSTRAINT "RateBook_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RateBook" ADD CONSTRAINT "RateBook_costBaseId_fkey" FOREIGN KEY ("costBaseId") REFERENCES "CostBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RateBook" ADD CONSTRAINT "RateBook_assumptionSetId_fkey" FOREIGN KEY ("assumptionSetId") REFERENCES "AssumptionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RateBookEntry" ADD CONSTRAINT "RateBookEntry_rateBookId_fkey" FOREIGN KEY ("rateBookId") REFERENCES "RateBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
