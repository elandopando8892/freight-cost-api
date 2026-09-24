-- Additive, local validation only. No own-fleet, Auth or business rows touched.
CREATE TABLE "PartnerTariffBase" (
  "id" TEXT PRIMARY KEY, "orgId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "saveKey" TEXT NOT NULL, "intentHash" TEXT NOT NULL,
  "activeVersionId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerTariffBase_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerTariffBase_orgId_id_key" UNIQUE ("orgId", "id"),
  CONSTRAINT "PartnerTariffBase_orgId_code_key" UNIQUE ("orgId", "code"),
  CONSTRAINT "PartnerTariffBase_orgId_saveKey_key" UNIQUE ("orgId", "saveKey")
);
CREATE TABLE "PartnerTariffVersion" (
  "id" TEXT PRIMARY KEY, "orgId" TEXT NOT NULL, "baseId" TEXT NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0), "terms" JSONB NOT NULL,
  "termsChecksum" TEXT NOT NULL, "actorId" TEXT NOT NULL, "saveKey" TEXT NOT NULL,
  "intentHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'PUBLISHED')),
  "publishedById" TEXT, "publishedAt" TIMESTAMP(3), "publicationNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (("status" = 'DRAFT' AND "publishedById" IS NULL AND "publishedAt" IS NULL AND "publicationNote" IS NULL)
    OR ("status" = 'PUBLISHED' AND "publishedById" IS NOT NULL AND "publishedAt" IS NOT NULL AND "publicationNote" IS NOT NULL)),
  CONSTRAINT "PartnerTariffVersion_orgId_baseId_fkey" FOREIGN KEY ("orgId", "baseId") REFERENCES "PartnerTariffBase"("orgId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerTariffVersion_orgId_baseId_id_key" UNIQUE ("orgId", "baseId", "id"),
  CONSTRAINT "PartnerTariffVersion_orgId_baseId_version_key" UNIQUE ("orgId", "baseId", "version"),
  CONSTRAINT "PartnerTariffVersion_orgId_saveKey_key" UNIQUE ("orgId", "saveKey")
);
ALTER TABLE "PartnerTariffBase" ADD CONSTRAINT "PartnerTariffBase_orgId_id_activeVersionId_fkey"
  FOREIGN KEY ("orgId", "id", "activeVersionId") REFERENCES "PartnerTariffVersion"("orgId", "baseId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE FUNCTION "fcm_partner_tariff_version_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' OR NEW."status" <> 'PUBLISHED'
    OR (to_jsonb(OLD) - ARRAY['status','publishedById','publishedAt','publicationNote'])
       IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['status','publishedById','publishedAt','publicationNote']) THEN
    RAISE EXCEPTION 'Tariff terms are immutable; create a new version';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "PartnerTariffVersion_guard" BEFORE UPDATE ON "PartnerTariffVersion"
FOR EACH ROW EXECUTE FUNCTION "fcm_partner_tariff_version_guard"();

CREATE FUNCTION "fcm_partner_tariff_active_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."activeVersionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "PartnerTariffVersion" WHERE "id" = NEW."activeVersionId"
      AND "orgId" = NEW."orgId" AND "baseId" = NEW."id" AND "status" = 'PUBLISHED'
  ) THEN RAISE EXCEPTION 'Active tariff version must be published in the same base and tenant'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "PartnerTariffBase_active_guard" BEFORE INSERT OR UPDATE ON "PartnerTariffBase"
FOR EACH ROW EXECUTE FUNCTION "fcm_partner_tariff_active_guard"();
