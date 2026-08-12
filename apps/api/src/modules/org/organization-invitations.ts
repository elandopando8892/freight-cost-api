import type { OrganizationInvitationStatus, Role } from "@prisma/client";

export const ORGANIZATION_INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function organizationInvitationConfirmation(orgId: string, email: string) {
  return `INVITE_MEMBER:${orgId}:${normalizeInvitationEmail(email)}`;
}

export function organizationInvitationExpiry(now = new Date()) {
  return new Date(now.getTime() + ORGANIZATION_INVITATION_LIFETIME_MS);
}

export function effectiveInvitationStatus(
  status: OrganizationInvitationStatus,
  expiresAt: Date,
  now = new Date(),
): OrganizationInvitationStatus | "EXPIRED" {
  return status === "PENDING" && expiresAt.getTime() <= now.getTime()
    ? "EXPIRED"
    : status;
}

export type OrganizationInvitationActor = {
  id: string;
  orgId: string;
  role: Role;
  kindeId: string;
};
