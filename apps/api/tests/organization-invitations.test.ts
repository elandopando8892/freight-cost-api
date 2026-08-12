import { beforeEach, describe, expect, it, vi } from "vitest";

const invitation = {
  id: "invite-1",
  orgId: "org-pilot",
  email: "pilot@example.com",
  role: "ADMIN" as const,
  status: "PENDING" as const,
  expiresAt: new Date(Date.now() + 60_000),
  invitedById: "admin-1",
  acceptedById: null,
  acceptedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tx = {
  organizationInvitation: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: { create: vi.fn() },
};

const prisma = {
  organizationInvitation: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(async (operation: (client: typeof tx) => unknown) =>
    operation(tx),
  ),
};

vi.mock("../src/config/prisma.js", () => ({ prisma }));

const { acceptPendingOrganizationInvitation } = await import(
  "../src/modules/org/organization-invitations.service.js"
);
const {
  effectiveInvitationStatus,
  organizationInvitationConfirmation,
} = await import("../src/modules/org/organization-invitations.js");

describe("organization invitation acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.organizationInvitation.findUnique.mockResolvedValue(invitation);
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation);
    tx.user.create.mockResolvedValue({
      id: "user-pilot",
      orgId: invitation.orgId,
      role: invitation.role,
    });
    tx.organizationInvitation.update.mockResolvedValue({});
  });

  it("joins the invited tenant and marks the invitation accepted atomically", async () => {
    await expect(
      acceptPendingOrganizationInvitation("kinde-pilot", " Pilot@Example.com "),
    ).resolves.toEqual({
      id: "user-pilot",
      orgId: "org-pilot",
      role: "ADMIN",
      kindeId: "kinde-pilot",
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-pilot",
        kindeId: "kinde-pilot",
        email: "pilot@example.com",
        passwordHash: null,
        role: "ADMIN",
      },
    });
    expect(tx.organizationInvitation.update).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: expect.objectContaining({
        status: "ACCEPTED",
        acceptedById: "user-pilot",
      }),
    });
  });

  it("does not write when an invitation is expired", async () => {
    prisma.organizationInvitation.findUnique.mockResolvedValueOnce({
      ...invitation,
      expiresAt: new Date(Date.now() - 1),
    });
    await expect(
      acceptPendingOrganizationInvitation("kinde-pilot", "pilot@example.com"),
    ).resolves.toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("uses stable confirmation and derived EXPIRED status", () => {
    expect(
      organizationInvitationConfirmation("org-pilot", " Pilot@Example.com "),
    ).toBe("INVITE_MEMBER:org-pilot:pilot@example.com");
    expect(
      effectiveInvitationStatus("PENDING", new Date(Date.now() - 1)),
    ).toBe("EXPIRED");
  });
});
