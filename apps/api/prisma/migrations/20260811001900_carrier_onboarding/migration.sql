CREATE TABLE "CarrierProfile" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "legalName" TEXT,
  "operatingName" TEXT,
  "primaryContactName" TEXT,
  "primaryContactEmail" TEXT,
  "primaryContactPhone" TEXT,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
  "operatingScopes" "CostBaseScope"[] DEFAULT ARRAY[]::"CostBaseScope"[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarrierProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarrierProfile_orgId_key" ON "CarrierProfile"("orgId");
ALTER TABLE "CarrierProfile" ADD CONSTRAINT "CarrierProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
