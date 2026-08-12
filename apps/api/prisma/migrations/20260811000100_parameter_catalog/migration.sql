-- Canonical, source-versioned definitions for every editable FCM parameter.
-- Existing AssumptionParam records remain valid; the nullable link is backfilled
-- by `npm run db:sync-catalog` after this migration is applied.

CREATE TYPE "ParameterKind" AS ENUM ('ASSUMPTION', 'COST_CARD');

CREATE TABLE "ParameterDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "field" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "ParameterKind" NOT NULL,
    "defaultValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "low" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "updateFrequency" TEXT,
    "costBehavior" TEXT,
    "activation" TEXT,
    "sourceSheet" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParameterDefinition_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AssumptionParam" ADD COLUMN "definitionId" TEXT;

CREATE UNIQUE INDEX "ParameterDefinition_key_key" ON "ParameterDefinition"("key");
CREATE UNIQUE INDEX "ParameterDefinition_section_field_key" ON "ParameterDefinition"("section", "field");
CREATE INDEX "ParameterDefinition_section_displayOrder_idx" ON "ParameterDefinition"("section", "displayOrder");
CREATE INDEX "ParameterDefinition_kind_idx" ON "ParameterDefinition"("kind");
CREATE INDEX "AssumptionParam_definitionId_idx" ON "AssumptionParam"("definitionId");

ALTER TABLE "AssumptionParam" ADD CONSTRAINT "AssumptionParam_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "ParameterDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
