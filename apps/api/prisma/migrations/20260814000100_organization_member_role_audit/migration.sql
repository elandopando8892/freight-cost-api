CREATE TABLE "OrganizationMemberRoleAudit" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "previousRole" "Role" NOT NULL,
  "nextRole" "Role" NOT NULL,
  "confirmation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrganizationMemberRoleAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationMemberRoleAudit_orgId_createdAt_idx"
  ON "OrganizationMemberRoleAudit"("orgId", "createdAt");
CREATE INDEX "OrganizationMemberRoleAudit_memberId_createdAt_idx"
  ON "OrganizationMemberRoleAudit"("memberId", "createdAt");
CREATE INDEX "OrganizationMemberRoleAudit_actorId_createdAt_idx"
  ON "OrganizationMemberRoleAudit"("actorId", "createdAt");

ALTER TABLE "OrganizationMemberRoleAudit" ADD CONSTRAINT "OrganizationMemberRoleAudit_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMemberRoleAudit" ADD CONSTRAINT "OrganizationMemberRoleAudit_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMemberRoleAudit" ADD CONSTRAINT "OrganizationMemberRoleAudit_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
