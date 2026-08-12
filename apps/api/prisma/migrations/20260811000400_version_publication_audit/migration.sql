CREATE TYPE "AssumptionVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AssumptionVersionAuditAction" AS ENUM ('DRAFT_CREATED', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "AssumptionSet"
  ADD COLUMN "status" "AssumptionVersionStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "sourceVersionId" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "publishedById" TEXT;

CREATE TABLE "AssumptionVersionAudit" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "setId" TEXT NOT NULL,
  "action" "AssumptionVersionAuditAction" NOT NULL,
  "fromStatus" "AssumptionVersionStatus",
  "toStatus" "AssumptionVersionStatus",
  "note" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssumptionVersionAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssumptionSet_sourceVersionId_idx" ON "AssumptionSet"("sourceVersionId");
CREATE INDEX "AssumptionSet_publishedById_idx" ON "AssumptionSet"("publishedById");
CREATE INDEX "AssumptionVersionAudit_setId_createdAt_idx" ON "AssumptionVersionAudit"("setId", "createdAt");
CREATE INDEX "AssumptionVersionAudit_orgId_createdAt_idx" ON "AssumptionVersionAudit"("orgId", "createdAt");
CREATE INDEX "AssumptionVersionAudit_actorId_idx" ON "AssumptionVersionAudit"("actorId");

ALTER TABLE "AssumptionSet" ADD CONSTRAINT "AssumptionSet_sourceVersionId_fkey"
  FOREIGN KEY ("sourceVersionId") REFERENCES "AssumptionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssumptionSet" ADD CONSTRAINT "AssumptionSet_publishedById_fkey"
  FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssumptionVersionAudit" ADD CONSTRAINT "AssumptionVersionAudit_setId_fkey"
  FOREIGN KEY ("setId") REFERENCES "AssumptionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssumptionVersionAudit" ADD CONSTRAINT "AssumptionVersionAudit_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
