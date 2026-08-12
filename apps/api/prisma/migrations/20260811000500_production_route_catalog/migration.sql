CREATE TYPE "ProductionRouteStatus" AS ENUM ('DRAFT', 'PRODUCTION', 'ARCHIVED');
CREATE TYPE "RouteGeography" AS ENUM ('MX', 'US', 'CROSS_BORDER');

CREATE TABLE "ProductionRoute" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "routeKey" TEXT NOT NULL,
  "code" TEXT,
  "origin" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "mexBorder" TEXT,
  "usaBorder" TEXT,
  "geography" "RouteGeography" NOT NULL,
  "operation" TEXT NOT NULL,
  "service" TEXT NOT NULL DEFAULT 'One Way',
  "truckType" TEXT NOT NULL DEFAULT 'Truck',
  "trailerType" TEXT NOT NULL DEFAULT 'Trailer',
  "config" TEXT NOT NULL DEFAULT 'Single',
  "driverType" TEXT NOT NULL DEFAULT 'Company',
  "suggestedCostBaseId" TEXT,
  "confirmedCostBaseId" TEXT,
  "confirmedAssumptionSetId" TEXT,
  "status" "ProductionRouteStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionRoute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionRoute_orgId_routeKey_key" ON "ProductionRoute"("orgId", "routeKey");
CREATE INDEX "ProductionRoute_orgId_status_idx" ON "ProductionRoute"("orgId", "status");
CREATE INDEX "ProductionRoute_orgId_geography_idx" ON "ProductionRoute"("orgId", "geography");
CREATE INDEX "ProductionRoute_suggestedCostBaseId_idx" ON "ProductionRoute"("suggestedCostBaseId");
CREATE INDEX "ProductionRoute_confirmedCostBaseId_idx" ON "ProductionRoute"("confirmedCostBaseId");
CREATE INDEX "ProductionRoute_confirmedAssumptionSetId_idx" ON "ProductionRoute"("confirmedAssumptionSetId");

ALTER TABLE "ProductionRoute" ADD CONSTRAINT "ProductionRoute_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRoute" ADD CONSTRAINT "ProductionRoute_suggestedCostBaseId_fkey"
  FOREIGN KEY ("suggestedCostBaseId") REFERENCES "CostBase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionRoute" ADD CONSTRAINT "ProductionRoute_confirmedCostBaseId_fkey"
  FOREIGN KEY ("confirmedCostBaseId") REFERENCES "CostBase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductionRoute" ADD CONSTRAINT "ProductionRoute_confirmedAssumptionSetId_fkey"
  FOREIGN KEY ("confirmedAssumptionSetId") REFERENCES "AssumptionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
