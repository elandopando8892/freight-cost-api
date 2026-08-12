import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  assumptionSet: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
};
const acceptPendingOrganizationInvitation = vi.fn();

vi.mock("../src/config/prisma.js", () => ({ prisma }));
vi.mock("../src/modules/org/organization-invitations.service.js", () => ({
  acceptPendingOrganizationInvitation,
}));

const { resolveUser } = await import("../src/modules/auth/kinde.service.js");

describe("Kinde identity resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.assumptionSet.findFirst.mockResolvedValue({ id: "set-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ preferred_email: "pilot@example.com" }),
      }),
    );
  });

  it("never reassigns an email already linked to another Kinde subject", async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "existing-user",
      orgId: "org-existing",
      email: "pilot@example.com",
      role: "ADMIN",
      kindeId: "different-kinde-subject",
    });

    await expect(resolveUser("new-kinde-subject", "token")).rejects.toThrow(
      /already linked/i,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("accepts a pending invitation before considering a new organization", async () => {
    acceptPendingOrganizationInvitation.mockResolvedValueOnce({
      id: "invited-user",
      orgId: "org-pilot",
      role: "ADMIN",
      kindeId: "new-kinde-subject",
    });

    await expect(resolveUser("new-kinde-subject", "token")).resolves.toEqual({
      id: "invited-user",
      orgId: "org-pilot",
      role: "ADMIN",
      kindeId: "new-kinde-subject",
    });
    expect(acceptPendingOrganizationInvitation).toHaveBeenCalledWith(
      "new-kinde-subject",
      "pilot@example.com",
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
