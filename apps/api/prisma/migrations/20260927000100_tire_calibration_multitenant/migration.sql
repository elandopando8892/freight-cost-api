-- Candidate only: shared deployment is not authorized by this artifact.
-- Supabase Auth supplies identity, while Neon/Prisma remains the operational
-- database. RLS therefore consumes transaction-local context set by the API;
-- it does not depend on Supabase-only database helpers or JWT metadata.

CREATE TABLE "TireCohortSourceSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "cohortKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "commandFingerprint" TEXT NOT NULL,
    "aggregationFingerprint" TEXT NOT NULL,
    "recordsSnapshot" JSONB NOT NULL,
    "statisticsPolicy" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TireCohortSourceSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TireCohortSourceSnapshot_version_check" CHECK ("version" > 0),
    CONSTRAINT "TireCohortSourceSnapshot_commandFingerprint_check" CHECK ("commandFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCohortSourceSnapshot_aggregationFingerprint_check" CHECK ("aggregationFingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "TireCohortSourceHead" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "cohortKey" TEXT NOT NULL,
    "currentSnapshotId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TireCohortSourceHead_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TireCohortSourceHead_revision_check" CHECK ("revision" > 0)
);

CREATE TABLE "TireCalibrationDossier" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "proposalFingerprint" TEXT NOT NULL,
    "sourceAggregationFingerprint" TEXT NOT NULL,
    "sourceSnapshotId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "economicOwnerId" TEXT,
    "independentReviewerId" TEXT,
    "proposalSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TireCalibrationDossier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TireCalibrationDossier_version_check" CHECK ("version" > 0),
    CONSTRAINT "TireCalibrationDossier_revision_check" CHECK ("revision" >= 0),
    CONSTRAINT "TireCalibrationDossier_status_check" CHECK ("status" IN ('DRAFT', 'PENDING_ECONOMIC', 'PENDING_INDEPENDENT', 'RETURNED', 'REJECTED', 'REVIEWED')),
    CONSTRAINT "TireCalibrationDossier_proposalFingerprint_check" CHECK ("proposalFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCalibrationDossier_sourceAggregationFingerprint_check" CHECK ("sourceAggregationFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCalibrationDossier_author_owner_distinct_check" CHECK ("economicOwnerId" IS NULL OR "authorId" <> "economicOwnerId"),
    CONSTRAINT "TireCalibrationDossier_author_reviewer_distinct_check" CHECK ("independentReviewerId" IS NULL OR "authorId" <> "independentReviewerId"),
    CONSTRAINT "TireCalibrationDossier_owner_reviewer_distinct_check" CHECK ("economicOwnerId" IS NULL OR "independentReviewerId" IS NULL OR "economicOwnerId" <> "independentReviewerId")
);

CREATE TABLE "TireCalibrationReviewEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "payload" JSONB,
    "previousEventHash" TEXT,
    "eventHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TireCalibrationReviewEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TireCalibrationReviewEvent_sequence_check" CHECK ("sequence" > 0),
    CONSTRAINT "TireCalibrationReviewEvent_action_check" CHECK ("action" IN ('DRAFT_OPENED', 'REVIEWERS_ASSIGNED', 'ECONOMIC_APPROVED', 'ECONOMIC_RETURNED', 'ECONOMIC_REJECTED', 'INDEPENDENT_APPROVED', 'INDEPENDENT_RETURNED', 'INDEPENDENT_REJECTED', 'PACKAGE_CREATED')),
    CONSTRAINT "TireCalibrationReviewEvent_fromStatus_check" CHECK ("fromStatus" IS NULL OR "fromStatus" IN ('DRAFT', 'PENDING_ECONOMIC', 'PENDING_INDEPENDENT', 'RETURNED', 'REJECTED', 'REVIEWED')),
    CONSTRAINT "TireCalibrationReviewEvent_toStatus_check" CHECK ("toStatus" IS NULL OR "toStatus" IN ('DRAFT', 'PENDING_ECONOMIC', 'PENDING_INDEPENDENT', 'RETURNED', 'REJECTED', 'REVIEWED')),
    CONSTRAINT "TireCalibrationReviewEvent_previousEventHash_check" CHECK ("previousEventHash" IS NULL OR "previousEventHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCalibrationReviewEvent_eventHash_check" CHECK ("eventHash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "TireCalibrationApprovalPackage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "proposalFingerprint" TEXT NOT NULL,
    "sourceAggregationFingerprint" TEXT NOT NULL,
    "ledgerHeadHash" TEXT NOT NULL,
    "packageFingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "quoteEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TireCalibrationApprovalPackage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TireCalibrationApprovalPackage_proposalFingerprint_check" CHECK ("proposalFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCalibrationApprovalPackage_sourceAggregationFingerprint_check" CHECK ("sourceAggregationFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCalibrationApprovalPackage_ledgerHeadHash_check" CHECK ("ledgerHeadHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCalibrationApprovalPackage_packageFingerprint_check" CHECK ("packageFingerprint" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "TireCalibrationApprovalPackage_quoteEligible_check" CHECK ("quoteEligible" = false)
);

CREATE INDEX "TireCohortSourceSnapshot_orgId_cohortKey_createdAt_idx" ON "TireCohortSourceSnapshot"("orgId", "cohortKey", "createdAt");
CREATE INDEX "TireCohortSourceSnapshot_createdById_idx" ON "TireCohortSourceSnapshot"("createdById");
CREATE UNIQUE INDEX "TireCohortSourceSnapshot_orgId_cohortKey_version_key" ON "TireCohortSourceSnapshot"("orgId", "cohortKey", "version");
CREATE UNIQUE INDEX "TireCohortSourceSnapshot_orgId_requestId_key" ON "TireCohortSourceSnapshot"("orgId", "requestId");
CREATE UNIQUE INDEX "TireCohortSourceSnapshot_orgId_id_key" ON "TireCohortSourceSnapshot"("orgId", "id");
CREATE INDEX "TireCohortSourceHead_currentSnapshotId_idx" ON "TireCohortSourceHead"("currentSnapshotId");
CREATE INDEX "TireCohortSourceHead_updatedById_idx" ON "TireCohortSourceHead"("updatedById");
CREATE UNIQUE INDEX "TireCohortSourceHead_orgId_cohortKey_key" ON "TireCohortSourceHead"("orgId", "cohortKey");
CREATE UNIQUE INDEX "TireCohortSourceHead_orgId_id_key" ON "TireCohortSourceHead"("orgId", "id");
CREATE INDEX "TireCalibrationDossier_orgId_status_updatedAt_idx" ON "TireCalibrationDossier"("orgId", "status", "updatedAt");
CREATE INDEX "TireCalibrationDossier_sourceSnapshotId_idx" ON "TireCalibrationDossier"("sourceSnapshotId");
CREATE INDEX "TireCalibrationDossier_economicOwnerId_idx" ON "TireCalibrationDossier"("economicOwnerId");
CREATE INDEX "TireCalibrationDossier_independentReviewerId_idx" ON "TireCalibrationDossier"("independentReviewerId");
CREATE UNIQUE INDEX "TireCalibrationDossier_orgId_proposalId_key" ON "TireCalibrationDossier"("orgId", "proposalId");
CREATE UNIQUE INDEX "TireCalibrationDossier_orgId_id_key" ON "TireCalibrationDossier"("orgId", "id");
CREATE INDEX "TireCalibrationReviewEvent_orgId_createdAt_idx" ON "TireCalibrationReviewEvent"("orgId", "createdAt");
CREATE INDEX "TireCalibrationReviewEvent_actorId_idx" ON "TireCalibrationReviewEvent"("actorId");
CREATE UNIQUE INDEX "TireCalibrationReviewEvent_orgId_requestId_key" ON "TireCalibrationReviewEvent"("orgId", "requestId");
CREATE UNIQUE INDEX "TireCalibrationReviewEvent_dossierId_sequence_key" ON "TireCalibrationReviewEvent"("dossierId", "sequence");
CREATE UNIQUE INDEX "TireCalibrationReviewEvent_dossierId_eventHash_key" ON "TireCalibrationReviewEvent"("dossierId", "eventHash");
CREATE INDEX "TireCalibrationApprovalPackage_orgId_createdAt_idx" ON "TireCalibrationApprovalPackage"("orgId", "createdAt");
CREATE INDEX "TireCalibrationApprovalPackage_createdById_idx" ON "TireCalibrationApprovalPackage"("createdById");
CREATE UNIQUE INDEX "TireCalibrationApprovalPackage_orgId_dossierId_key" ON "TireCalibrationApprovalPackage"("orgId", "dossierId");
CREATE UNIQUE INDEX "TireCalibrationApprovalPackage_orgId_packageFingerprint_key" ON "TireCalibrationApprovalPackage"("orgId", "packageFingerprint");
CREATE UNIQUE INDEX "User_orgId_id_key" ON "User"("orgId", "id");

ALTER TABLE "TireCohortSourceSnapshot" ADD CONSTRAINT "TireCohortSourceSnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCohortSourceSnapshot" ADD CONSTRAINT "TireCohortSourceSnapshot_orgId_createdById_fkey" FOREIGN KEY ("orgId", "createdById") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCohortSourceHead" ADD CONSTRAINT "TireCohortSourceHead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCohortSourceHead" ADD CONSTRAINT "TireCohortSourceHead_orgId_currentSnapshotId_fkey" FOREIGN KEY ("orgId", "currentSnapshotId") REFERENCES "TireCohortSourceSnapshot"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCohortSourceHead" ADD CONSTRAINT "TireCohortSourceHead_orgId_updatedById_fkey" FOREIGN KEY ("orgId", "updatedById") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationDossier" ADD CONSTRAINT "TireCalibrationDossier_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationDossier" ADD CONSTRAINT "TireCalibrationDossier_orgId_sourceSnapshotId_fkey" FOREIGN KEY ("orgId", "sourceSnapshotId") REFERENCES "TireCohortSourceSnapshot"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationDossier" ADD CONSTRAINT "TireCalibrationDossier_orgId_authorId_fkey" FOREIGN KEY ("orgId", "authorId") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationDossier" ADD CONSTRAINT "TireCalibrationDossier_orgId_economicOwnerId_fkey" FOREIGN KEY ("orgId", "economicOwnerId") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationDossier" ADD CONSTRAINT "TireCalibrationDossier_orgId_independentReviewerId_fkey" FOREIGN KEY ("orgId", "independentReviewerId") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationReviewEvent" ADD CONSTRAINT "TireCalibrationReviewEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationReviewEvent" ADD CONSTRAINT "TireCalibrationReviewEvent_orgId_dossierId_fkey" FOREIGN KEY ("orgId", "dossierId") REFERENCES "TireCalibrationDossier"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationReviewEvent" ADD CONSTRAINT "TireCalibrationReviewEvent_orgId_actorId_fkey" FOREIGN KEY ("orgId", "actorId") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationApprovalPackage" ADD CONSTRAINT "TireCalibrationApprovalPackage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationApprovalPackage" ADD CONSTRAINT "TireCalibrationApprovalPackage_orgId_dossierId_fkey" FOREIGN KEY ("orgId", "dossierId") REFERENCES "TireCalibrationDossier"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TireCalibrationApprovalPackage" ADD CONSTRAINT "TireCalibrationApprovalPackage_orgId_createdById_fkey" FOREIGN KEY ("orgId", "createdById") REFERENCES "User"("orgId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE "TireCohortSourceSnapshot" FROM PUBLIC;
REVOKE ALL ON TABLE "TireCohortSourceHead" FROM PUBLIC;
REVOKE ALL ON TABLE "TireCalibrationDossier" FROM PUBLIC;
REVOKE ALL ON TABLE "TireCalibrationReviewEvent" FROM PUBLIC;
REVOKE ALL ON TABLE "TireCalibrationApprovalPackage" FROM PUBLIC;

ALTER TABLE "TireCohortSourceSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TireCohortSourceSnapshot" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TireCohortSourceHead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TireCohortSourceHead" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TireCalibrationDossier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TireCalibrationDossier" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TireCalibrationReviewEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TireCalibrationReviewEvent" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TireCalibrationApprovalPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TireCalibrationApprovalPackage" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tire_source_snapshot_select_same_tenant" ON "TireCohortSourceSnapshot"
FOR SELECT
USING (
  "orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR', 'VIEWER')
);

CREATE POLICY "tire_source_snapshot_insert_author" ON "TireCohortSourceSnapshot"
FOR INSERT
WITH CHECK (
  "orgId" = current_setting('app.current_org_id', true)
  AND "createdById" = current_setting('app.current_user_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR')
);

CREATE POLICY "tire_source_head_select_same_tenant" ON "TireCohortSourceHead"
FOR SELECT
USING (
  "orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR', 'VIEWER')
);

CREATE POLICY "tire_source_head_insert_author" ON "TireCohortSourceHead"
FOR INSERT
WITH CHECK (
  "orgId" = current_setting('app.current_org_id', true)
  AND "updatedById" = current_setting('app.current_user_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR')
);

CREATE POLICY "tire_source_head_update_author" ON "TireCohortSourceHead"
FOR UPDATE
USING (
  "orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR')
)
WITH CHECK (
  "orgId" = current_setting('app.current_org_id', true)
  AND "updatedById" = current_setting('app.current_user_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR')
);

CREATE POLICY "tire_dossier_select_same_tenant" ON "TireCalibrationDossier"
FOR SELECT
USING (
  current_setting('app.current_org_id', true) IS NOT NULL
  AND current_setting('app.current_org_id', true) <> ''
  AND "orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR', 'VIEWER')
);

CREATE POLICY "tire_dossier_insert_author" ON "TireCalibrationDossier"
FOR INSERT
WITH CHECK (
  "orgId" = current_setting('app.current_org_id', true)
  AND "authorId" = current_setting('app.current_user_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR')
);

CREATE POLICY "tire_dossier_update_assigned" ON "TireCalibrationDossier"
FOR UPDATE
USING (
  "orgId" = current_setting('app.current_org_id', true)
  AND (
    (current_setting('app.current_role', true) = 'OPERATOR' AND "authorId" = current_setting('app.current_user_id', true))
    OR
    (current_setting('app.current_role', true) = 'ADMIN' AND current_setting('app.current_user_id', true) IN ("authorId", "economicOwnerId", "independentReviewerId"))
  )
)
WITH CHECK (
  "orgId" = current_setting('app.current_org_id', true)
  AND (
    (current_setting('app.current_role', true) = 'OPERATOR' AND "authorId" = current_setting('app.current_user_id', true))
    OR
    (current_setting('app.current_role', true) = 'ADMIN' AND current_setting('app.current_user_id', true) IN ("authorId", "economicOwnerId", "independentReviewerId"))
  )
);

CREATE POLICY "tire_event_select_same_tenant" ON "TireCalibrationReviewEvent"
FOR SELECT
USING (
  "orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR', 'VIEWER')
);

CREATE POLICY "tire_event_insert_assigned_actor" ON "TireCalibrationReviewEvent"
FOR INSERT
WITH CHECK (
  "orgId" = current_setting('app.current_org_id', true)
  AND "actorId" = current_setting('app.current_user_id', true)
  AND EXISTS (
    SELECT 1
    FROM "TireCalibrationDossier" dossier
    WHERE dossier."orgId" = "TireCalibrationReviewEvent"."orgId"
      AND dossier."id" = "TireCalibrationReviewEvent"."dossierId"
      AND (
        (current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR')
          AND dossier."authorId" = current_setting('app.current_user_id', true)
          AND "TireCalibrationReviewEvent"."action" IN ('DRAFT_OPENED', 'REVIEWERS_ASSIGNED'))
        OR
        (current_setting('app.current_role', true) = 'ADMIN'
          AND (
            (dossier."economicOwnerId" = current_setting('app.current_user_id', true) AND "TireCalibrationReviewEvent"."action" IN ('ECONOMIC_APPROVED', 'ECONOMIC_RETURNED', 'ECONOMIC_REJECTED'))
            OR
            (dossier."independentReviewerId" = current_setting('app.current_user_id', true) AND "TireCalibrationReviewEvent"."action" IN ('INDEPENDENT_APPROVED', 'INDEPENDENT_RETURNED', 'INDEPENDENT_REJECTED', 'PACKAGE_CREATED'))
          ))
      )
  )
);

CREATE POLICY "tire_package_select_same_tenant" ON "TireCalibrationApprovalPackage"
FOR SELECT
USING (
  "orgId" = current_setting('app.current_org_id', true)
  AND current_setting('app.current_role', true) IN ('ADMIN', 'OPERATOR', 'VIEWER')
);

CREATE POLICY "tire_package_insert_independent_reviewer" ON "TireCalibrationApprovalPackage"
FOR INSERT
WITH CHECK (
  "orgId" = current_setting('app.current_org_id', true)
  AND "createdById" = current_setting('app.current_user_id', true)
  AND current_setting('app.current_role', true) = 'ADMIN'
  AND EXISTS (
    SELECT 1
    FROM "TireCalibrationDossier" dossier
    WHERE dossier."orgId" = "TireCalibrationApprovalPackage"."orgId"
      AND dossier."id" = "TireCalibrationApprovalPackage"."dossierId"
      AND dossier."independentReviewerId" = current_setting('app.current_user_id', true)
      AND dossier."status" = 'REVIEWED'
  )
);

CREATE FUNCTION "fcm_prevent_tire_calibration_evidence_mutation"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'Tire calibration evidence is append-only'
    USING ERRCODE = '55000';
END;
$$;

REVOKE ALL ON FUNCTION "fcm_prevent_tire_calibration_evidence_mutation"() FROM PUBLIC;

CREATE TRIGGER "TireCalibrationReviewEvent_append_only"
BEFORE UPDATE OR DELETE ON "TireCalibrationReviewEvent"
FOR EACH ROW EXECUTE FUNCTION "fcm_prevent_tire_calibration_evidence_mutation"();

CREATE TRIGGER "TireCohortSourceSnapshot_append_only"
BEFORE UPDATE OR DELETE ON "TireCohortSourceSnapshot"
FOR EACH ROW EXECUTE FUNCTION "fcm_prevent_tire_calibration_evidence_mutation"();

CREATE TRIGGER "TireCalibrationApprovalPackage_append_only"
BEFORE UPDATE OR DELETE ON "TireCalibrationApprovalPackage"
FOR EACH ROW EXECUTE FUNCTION "fcm_prevent_tire_calibration_evidence_mutation"();

COMMENT ON TABLE "TireCalibrationDossier" IS 'Tenant-scoped tire calibration projection; not a published cost base.';
COMMENT ON TABLE "TireCohortSourceSnapshot" IS 'Immutable tenant-scoped source records and statistical policy for tire calibration.';
COMMENT ON TABLE "TireCohortSourceHead" IS 'Mutable pointer to the current authoritative source snapshot for one cohort.';
COMMENT ON TABLE "TireCalibrationReviewEvent" IS 'Append-only tire calibration review ledger.';
COMMENT ON TABLE "TireCalibrationApprovalPackage" IS 'Reviewed evidence package; quoteEligible is permanently false.';
