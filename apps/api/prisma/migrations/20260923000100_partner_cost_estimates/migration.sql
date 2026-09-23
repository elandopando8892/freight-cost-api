CREATE TABLE "PartnerCostEstimate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "previousId" TEXT,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "actorId" TEXT NOT NULL,
  "saveKey" TEXT NOT NULL,
  "intentHash" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerCostEstimate_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerCostEstimate_orgId_id_key" UNIQUE ("orgId", "id"),
  CONSTRAINT "PartnerCostEstimate_orgId_saveKey_key" UNIQUE ("orgId", "saveKey"),
  CONSTRAINT "PartnerCostEstimate_orgId_previousId_key" UNIQUE ("orgId", "previousId"),
  CONSTRAINT "PartnerCostEstimate_orgId_previousId_fkey" FOREIGN KEY ("orgId", "previousId") REFERENCES "PartnerCostEstimate"("orgId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX "PartnerCostEstimate_orgId_createdAt_id_idx" ON "PartnerCostEstimate"("orgId", "createdAt", "id");

-- No endpoint updates/deletes versions. Even accidental SQL updates fail closed.
CREATE FUNCTION "fcm_partner_estimate_no_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Partner cost versions are immutable'; END;
$$;
CREATE TRIGGER "PartnerCostEstimate_no_update" BEFORE UPDATE ON "PartnerCostEstimate"
FOR EACH ROW EXECUTE FUNCTION "fcm_partner_estimate_no_update"();
