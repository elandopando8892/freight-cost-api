-- Candidate only. Do not apply to a shared database without separate approval.
-- V2 research evidence is isolated from MXN-only TireCohortSourceSnapshot/Head.

CREATE TABLE "TireCohortV2ResearchSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "comparisonKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "commandFingerprint" TEXT NOT NULL,
    "aggregationFingerprint" TEXT NOT NULL,
    "snapshotFingerprint" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TireCohortV2ResearchSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TireCohortV2ResearchSnapshot_version_check" CHECK ("version" > 0),
    CONSTRAINT "TireCohortV2ResearchSnapshot_commandFingerprint_check" CHECK ("commandFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCohortV2ResearchSnapshot_aggregationFingerprint_check" CHECK ("aggregationFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCohortV2ResearchSnapshot_snapshotFingerprint_check" CHECK ("snapshotFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCohortV2ResearchSnapshot_payload_version_check" CHECK (("payload"->>'schemaVersion' = '2') IS TRUE AND ("payload"->>'researchOnly' = 'true') IS TRUE)
);

CREATE TABLE "TireCohortV2ResearchHead" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "comparisonKey" TEXT NOT NULL,
    "currentSnapshotId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TireCohortV2ResearchHead_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TireCohortV2ResearchHead_revision_check" CHECK ("revision" > 0)
);

CREATE UNIQUE INDEX "TireCohortV2ResearchSnapshot_orgId_comparisonKey_version_key" ON "TireCohortV2ResearchSnapshot"("orgId", "comparisonKey", "version");
CREATE UNIQUE INDEX "TireCohortV2ResearchSnapshot_orgId_requestId_key" ON "TireCohortV2ResearchSnapshot"("orgId", "requestId");
CREATE UNIQUE INDEX "TireCohortV2ResearchSnapshot_orgId_comparisonKey_id_key" ON "TireCohortV2ResearchSnapshot"("orgId", "comparisonKey", "id");
CREATE INDEX "TireCohortV2ResearchSnapshot_orgId_comparisonKey_createdAt_idx" ON "TireCohortV2ResearchSnapshot"("orgId", "comparisonKey", "createdAt");
CREATE UNIQUE INDEX "TireCohortV2ResearchHead_orgId_comparisonKey_key" ON "TireCohortV2ResearchHead"("orgId", "comparisonKey");
CREATE UNIQUE INDEX "TireCohortV2ResearchHead_orgId_id_key" ON "TireCohortV2ResearchHead"("orgId", "id");

ALTER TABLE "TireCohortV2ResearchSnapshot" ADD CONSTRAINT "TireCohortV2ResearchSnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCohortV2ResearchSnapshot" ADD CONSTRAINT "TireCohortV2ResearchSnapshot_orgId_createdById_fkey" FOREIGN KEY ("orgId", "createdById") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCohortV2ResearchHead" ADD CONSTRAINT "TireCohortV2ResearchHead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCohortV2ResearchHead" ADD CONSTRAINT "TireCohortV2ResearchHead_currentSnapshot_fkey" FOREIGN KEY ("orgId", "comparisonKey", "currentSnapshotId") REFERENCES "TireCohortV2ResearchSnapshot"("orgId", "comparisonKey", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCohortV2ResearchHead" ADD CONSTRAINT "TireCohortV2ResearchHead_orgId_updatedById_fkey" FOREIGN KEY ("orgId", "updatedById") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE "TireCohortV2ResearchSnapshot" FROM PUBLIC;
REVOKE ALL ON TABLE "TireCohortV2ResearchHead" FROM PUBLIC;
ALTER TABLE "TireCohortV2ResearchSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TireCohortV2ResearchSnapshot" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TireCohortV2ResearchHead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TireCohortV2ResearchHead" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tire_v2_snapshot_select_same_tenant" ON "TireCohortV2ResearchSnapshot" FOR SELECT
USING ("orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR', 'VIEWER'));
CREATE POLICY "tire_v2_snapshot_insert_author" ON "TireCohortV2ResearchSnapshot" FOR INSERT
WITH CHECK ("orgId" = current_setting('app.current_org_id', true)
  AND "createdById" = current_setting('app.current_user_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR'));
CREATE POLICY "tire_v2_head_select_same_tenant" ON "TireCohortV2ResearchHead" FOR SELECT
USING ("orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR', 'VIEWER'));
CREATE POLICY "tire_v2_head_insert_author" ON "TireCohortV2ResearchHead" FOR INSERT
WITH CHECK ("orgId" = current_setting('app.current_org_id', true)
  AND "updatedById" = current_setting('app.current_user_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR'));
CREATE POLICY "tire_v2_head_update_author" ON "TireCohortV2ResearchHead" FOR UPDATE
USING ("orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR'))
WITH CHECK ("orgId" = current_setting('app.current_org_id', true)
  AND "updatedById" = current_setting('app.current_user_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR'));

CREATE TRIGGER "TireCohortV2ResearchSnapshot_append_only"
BEFORE UPDATE OR DELETE ON "TireCohortV2ResearchSnapshot"
FOR EACH ROW EXECUTE FUNCTION "fcm_prevent_tire_calibration_evidence_mutation"();

COMMENT ON TABLE "TireCohortV2ResearchSnapshot" IS 'Immutable tenant-scoped tire research v2 evidence; no parameter or quote authority.';
COMMENT ON TABLE "TireCohortV2ResearchHead" IS 'Current v2 research snapshot pointer per tenant and comparison key.';
