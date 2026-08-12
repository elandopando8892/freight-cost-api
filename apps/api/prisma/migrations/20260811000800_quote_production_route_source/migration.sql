ALTER TABLE "Quote" ADD COLUMN "productionRouteId" TEXT;
CREATE INDEX "Quote_productionRouteId_idx" ON "Quote"("productionRouteId");
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_productionRouteId_fkey"
  FOREIGN KEY ("productionRouteId") REFERENCES "ProductionRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
