-- Nullable for historical bases: do not infer a segment from their broad scope.
ALTER TABLE "CostBase" ADD COLUMN "operationalSegment" TEXT;

CREATE INDEX "CostBase_orgId_operationalSegment_status_idx"
    ON "CostBase"("orgId", "operationalSegment", "status");
