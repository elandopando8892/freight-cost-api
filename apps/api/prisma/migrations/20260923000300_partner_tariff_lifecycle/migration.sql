ALTER TABLE "PartnerTariffBase" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lifecycleRevision" INTEGER NOT NULL DEFAULT 0 CHECK ("lifecycleRevision" >= 0);
CREATE TABLE "PartnerTariffLifecycle" (
  "id" TEXT PRIMARY KEY, "orgId" TEXT NOT NULL, "baseId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0), "archived" BOOLEAN NOT NULL,
  "actorId" TEXT NOT NULL, "note" TEXT NOT NULL CHECK (length(trim("note")) BETWEEN 10 AND 500),
  "saveKey" TEXT NOT NULL, "intentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerTariffLifecycle_orgId_baseId_fkey" FOREIGN KEY ("orgId", "baseId") REFERENCES "PartnerTariffBase"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerTariffLifecycle_orgId_baseId_revision_key" UNIQUE ("orgId", "baseId", "revision"),
  CONSTRAINT "PartnerTariffLifecycle_orgId_saveKey_key" UNIQUE ("orgId", "saveKey")
);
CREATE FUNCTION "fcm_partner_lifecycle_no_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Partner lifecycle evidence is immutable'; END; $$;
CREATE TRIGGER "PartnerTariffLifecycle_no_update" BEFORE UPDATE ON "PartnerTariffLifecycle"
FOR EACH ROW EXECUTE FUNCTION "fcm_partner_lifecycle_no_update"();
CREATE FUNCTION "fcm_partner_lifecycle_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."archived" IS DISTINCT FROM OLD."archived" OR NEW."lifecycleRevision" <> OLD."lifecycleRevision" THEN
    IF NEW."archived" = OLD."archived" OR NEW."lifecycleRevision" <> OLD."lifecycleRevision" + 1
      OR NOT EXISTS (SELECT 1 FROM "PartnerTariffLifecycle" WHERE "orgId" = NEW."orgId" AND "baseId" = NEW."id"
        AND "revision" = NEW."lifecycleRevision" AND "archived" = NEW."archived") THEN
      RAISE EXCEPTION 'Lifecycle transition requires matching evidence and next revision';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "PartnerTariffBase_lifecycle_guard" BEFORE UPDATE ON "PartnerTariffBase"
FOR EACH ROW EXECUTE FUNCTION "fcm_partner_lifecycle_guard"();
