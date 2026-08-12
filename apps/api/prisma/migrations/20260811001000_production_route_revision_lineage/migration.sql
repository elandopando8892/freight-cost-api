ALTER TABLE "ProductionRoute" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProductionRoute" ADD COLUMN "supersedesRouteId" TEXT;

DROP INDEX "ProductionRoute_orgId_routeKey_key";
CREATE UNIQUE INDEX "ProductionRoute_orgId_routeKey_revision_key" ON "ProductionRoute"("orgId", "routeKey", "revision");
CREATE INDEX "ProductionRoute_supersedesRouteId_idx" ON "ProductionRoute"("supersedesRouteId");

ALTER TABLE "ProductionRoute" ADD CONSTRAINT "ProductionRoute_supersedesRouteId_fkey"
  FOREIGN KEY ("supersedesRouteId") REFERENCES "ProductionRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
