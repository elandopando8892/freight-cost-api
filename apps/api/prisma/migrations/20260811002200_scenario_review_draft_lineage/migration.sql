ALTER TABLE "ScenarioReview" ADD COLUMN "derivedAssumptionSetId" TEXT;

CREATE UNIQUE INDEX "ScenarioReview_derivedAssumptionSetId_key" ON "ScenarioReview"("derivedAssumptionSetId");

ALTER TABLE "ScenarioReview" ADD CONSTRAINT "ScenarioReview_derivedAssumptionSetId_fkey" FOREIGN KEY ("derivedAssumptionSetId") REFERENCES "AssumptionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
