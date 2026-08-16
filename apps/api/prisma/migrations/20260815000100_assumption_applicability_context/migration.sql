-- Applicability is part of the versioned cost-base evidence. Keeping it on the
-- assumption version prevents later profile changes from reinterpreting a
-- published snapshot.
ALTER TYPE "AssumptionVersionAuditAction"
  ADD VALUE IF NOT EXISTS 'PROFILE_UPDATED';

ALTER TABLE "AssumptionSet"
  ADD COLUMN "applicabilityContext" JSONB;
