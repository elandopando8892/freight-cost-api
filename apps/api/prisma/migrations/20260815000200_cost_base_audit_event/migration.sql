CREATE TYPE "CostBaseAuditAction" AS ENUM (
  'CREATED',
  'METADATA_UPDATED',
  'VERSION_ACTIVATED',
  'DEFAULT_REPLACED',
  'ARCHIVED'
);

CREATE TABLE "CostBaseAuditEvent" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "costBaseId" TEXT NOT NULL,
  "action" "CostBaseAuditAction" NOT NULL,
  "actorId" TEXT,
  "fromStatus" "CostBaseStatus",
  "toStatus" "CostBaseStatus",
  "note" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CostBaseAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CostBaseAuditEvent_costBaseId_createdAt_idx" ON "CostBaseAuditEvent"("costBaseId", "createdAt");
CREATE INDEX "CostBaseAuditEvent_orgId_createdAt_idx" ON "CostBaseAuditEvent"("orgId", "createdAt");
CREATE INDEX "CostBaseAuditEvent_actorId_idx" ON "CostBaseAuditEvent"("actorId");

ALTER TABLE "CostBaseAuditEvent" ADD CONSTRAINT "CostBaseAuditEvent_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostBaseAuditEvent" ADD CONSTRAINT "CostBaseAuditEvent_costBaseId_fkey"
  FOREIGN KEY ("costBaseId") REFERENCES "CostBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostBaseAuditEvent" ADD CONSTRAINT "CostBaseAuditEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
