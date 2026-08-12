CREATE TYPE "AssistantInteractionStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'REJECTED');

CREATE TABLE "AssistantInteraction" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "focus" TEXT NOT NULL,
  "model" TEXT,
  "inputChars" INTEGER NOT NULL,
  "outputChars" INTEGER,
  "latencyMs" INTEGER,
  "status" "AssistantInteractionStatus" NOT NULL DEFAULT 'STARTED',
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AssistantInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantInteraction_orgId_actorId_createdAt_idx" ON "AssistantInteraction"("orgId", "actorId", "createdAt");
CREATE INDEX "AssistantInteraction_orgId_status_createdAt_idx" ON "AssistantInteraction"("orgId", "status", "createdAt");

ALTER TABLE "AssistantInteraction" ADD CONSTRAINT "AssistantInteraction_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantInteraction" ADD CONSTRAINT "AssistantInteraction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
