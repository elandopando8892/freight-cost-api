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

const { resolveUser } = await import("../src/modules/auth/supabase.service.js");

function claims(sub = "new-supabase-subject") {
  return {
    sub,
    email: "pilot@example.com",
    role: "authenticated" as const,
    session_id: "session-1",
    is_anonymous: false as const,
  };
}

describe("Supabase identity resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.assumptionSet.findFirst.mockResolvedValue({ id: "set-1" });
    process.env.SUPABASE_URL = "https://fcm-auth.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    delete process.env.SUPABASE_EXPECTED_PROJECT_REF;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "new-supabase-subject",
            email: "pilot@example.com",
            email_confirmed_at: "2026-08-30T12:00:00.000Z",
          }),
          { status: 200 },
        ),
      ),
    );
  });

  it("never reassigns an email already linked to another Supabase subject", async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "existing-user",
      orgId: "org-existing",
      email: "pilot@example.com",
      role: "ADMIN",
      supabaseId: "different-supabase-subject",
    });

    await expect(resolveUser(claims(), "token-1")).rejects.toThrow(/already linked/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("links an existing unlinked user by verified Supabase email without changing tenant or role", async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: "existing-user",
      orgId: "org-existing",
      email: "pilot@example.com",
      role: "OPERATOR",
      supabaseId: null,
    });
    prisma.user.update.mockResolvedValueOnce({
      id: "existing-user",
      orgId: "org-existing",
      role: "OPERATOR",
      supabaseId: "new-supabase-subject",
    });

    await expect(resolveUser(claims(), "token-1")).resolves.toEqual({
      id: "existing-user",
      orgId: "org-existing",
      role: "OPERATOR",
      supabaseId: "new-supabase-subject",
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "existing-user" },
      data: { supabaseId: "new-supabase-subject" },
    });
  });

  it("accepts a pending invitation before considering a new organization", async () => {
    acceptPendingOrganizationInvitation.mockResolvedValueOnce({
      id: "invited-user",
      orgId: "org-pilot",
      role: "ADMIN",
      supabaseId: "new-supabase-subject",
    });

    await expect(resolveUser(claims(), "token-1")).resolves.toEqual({
      id: "invited-user",
      orgId: "org-pilot",
      role: "ADMIN",
      supabaseId: "new-supabase-subject",
    });
    expect(acceptPendingOrganizationInvitation).toHaveBeenCalledWith(
      "new-supabase-subject",
      "pilot@example.com",
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("does not link an unconfirmed Supabase email to an existing tenant", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "new-supabase-subject",
          email: "pilot@example.com",
          email_confirmed_at: null,
        }),
        { status: 200 },
      ),
    );

    await expect(resolveUser(claims(), "token-1")).rejects.toThrow(/confirmed matching email/i);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(acceptPendingOrganizationInvitation).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
