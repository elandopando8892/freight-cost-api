import { prisma } from "../../config/prisma.js";
import {
  normalizeInvitationEmail,
  type OrganizationInvitationActor,
} from "./organization-invitations.js";

/**
 * Consume a pending invite during Kinde sign-in. If a valid invite exists, the
 * identity joins that tenant atomically; a failed acceptance never falls
 * through to creation of a different organization.
 */
export async function acceptPendingOrganizationInvitation(
  kindeSub: string,
  rawEmail: string,
): Promise<OrganizationInvitationActor | null> {
  const email = normalizeInvitationEmail(rawEmail);
  if (!email) return null;

  const candidate = await prisma.organizationInvitation.findUnique({
    where: { email },
    select: { id: true, status: true, expiresAt: true },
  });
  if (
    !candidate ||
    candidate.status !== "PENDING" ||
    candidate.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.organizationInvitation.findUnique({
        where: { email },
      });
      if (
        !invitation ||
        invitation.status !== "PENDING" ||
        invitation.expiresAt.getTime() <= Date.now()
      ) {
        throw new Error("Organization invitation is no longer available.");
      }
      const user = await tx.user.create({
        data: {
          orgId: invitation.orgId,
          kindeId: kindeSub,
          email,
          passwordHash: null,
          role: invitation.role,
        },
      });
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedById: user.id,
          acceptedAt: new Date(),
        },
      });
      return {
        id: user.id,
        orgId: user.orgId,
        role: user.role,
        kindeId: kindeSub,
      };
    });
  } catch {
    const raced = await prisma.user.findUnique({ where: { kindeId: kindeSub } });
    if (raced) {
      return {
        id: raced.id,
        orgId: raced.orgId,
        role: raced.role,
        kindeId: kindeSub,
      };
    }
    throw new Error("Failed to accept organization invitation.");
  }
}
