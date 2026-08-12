CREATE TYPE "ProductionRouteAuditAction" AS ENUM ('CREATED', 'PRODUCED', 'ARCHIVED', 'REPLACEMENT_PROPOSED');

CREATE TABLE "ProductionRouteAuditEvent" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "action" "ProductionRouteAuditAction" NOT NULL,
  "actorId" TEXT,
  "note" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionRouteAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionRouteAuditEvent_routeId_createdAt_idx" ON "ProductionRouteAuditEvent"("routeId", "createdAt");
CREATE INDEX "ProductionRouteAuditEvent_orgId_createdAt_idx" ON "ProductionRouteAuditEvent"("orgId", "createdAt");
CREATE INDEX "ProductionRouteAuditEvent_actorId_idx" ON "ProductionRouteAuditEvent"("actorId");
ALTER TABLE "ProductionRouteAuditEvent" ADD CONSTRAINT "ProductionRouteAuditEvent_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ProductionRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRouteAuditEvent" ADD CONSTRAINT "ProductionRouteAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
