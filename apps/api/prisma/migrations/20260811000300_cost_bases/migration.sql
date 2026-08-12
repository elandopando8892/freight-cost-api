CREATE TYPE "CostBaseScope" AS ENUM ('CROSS_BORDER', 'DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US');
CREATE TYPE "CostBaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TABLE "CostBase" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "CostBaseScope" NOT NULL,
    "status" "CostBaseStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultPolicy" "CalculationPolicy" NOT NULL DEFAULT 'OPERATIONAL_V3',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostBase_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AssumptionSet" ADD COLUMN "costBaseId" TEXT;
ALTER TABLE "Lane" ADD COLUMN "costBaseId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "costBaseId" TEXT;

CREATE UNIQUE INDEX "CostBase_orgId_code_key" ON "CostBase"("orgId", "code");
CREATE INDEX "CostBase_orgId_scope_status_idx" ON "CostBase"("orgId", "scope", "status");
CREATE INDEX "CostBase_orgId_scope_isDefault_idx" ON "CostBase"("orgId", "scope", "isDefault");
CREATE UNIQUE INDEX "CostBase_one_default_per_scope_key"
  ON "CostBase"("orgId", "scope") WHERE "isDefault" = true;
CREATE INDEX "AssumptionSet_costBaseId_version_idx" ON "AssumptionSet"("costBaseId", "version");
CREATE INDEX "Lane_costBaseId_idx" ON "Lane"("costBaseId");
CREATE INDEX "Quote_costBaseId_idx" ON "Quote"("costBaseId");

ALTER TABLE "CostBase" ADD CONSTRAINT "CostBase_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssumptionSet" ADD CONSTRAINT "AssumptionSet_costBaseId_fkey"
  FOREIGN KEY ("costBaseId") REFERENCES "CostBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lane" ADD CONSTRAINT "Lane_costBaseId_fkey"
  FOREIGN KEY ("costBaseId") REFERENCES "CostBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_costBaseId_fkey"
  FOREIGN KEY ("costBaseId") REFERENCES "CostBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
