import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  $queryRaw: vi.fn(),
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
    vi.resetAllMocks();
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.assumptionSet.findFirst.mockResolvedValue({ id: "set-1" });
    process.env.SUPABASE_URL = "https://fcm-auth.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    delete process.env.SUPABASE_EXPECTED_PROJECT_REF;
    delete process.env.FCM_PREVIEW_EXISTING_USERS_ONLY;
    delete process.env.VERCEL_ENV;
    delete process.env.FCM_AUTH_ACCESS_SCOPE;
    delete process.env.FCM_AUTH_SCOPE_REQUIRED;
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

  it('rejects an excluded historical actor before any DB, invitation or provisioning call', async () => {
    process.env.FCM_AUTH_ACCESS_SCOPE = JSON.stringify({ version: 1, users: [
      { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
      { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
    ] })
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'historic', orgId: 'historic-org', role: 'ADMIN' })
    await expect(resolveUser(claims(), 'token')).rejects.toThrow('FCM_ACCESS_NOT_AUTHORIZED')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(prisma.assumptionSet.findFirst).not.toHaveBeenCalled()
    expect(acceptPendingOrganizationInvitation).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves a scoped actor tenant and role without touching economic defaults', async () => {
    const subject = '00000000-0000-4000-8000-000000000001'
    process.env.FCM_AUTH_ACCESS_SCOPE = JSON.stringify({ version: 1, users: [
      { email: 'sales@heymarksman.com', subject },
      { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
    ] })
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'original-user', orgId: 'original-org', role: 'OPERATOR',
      email: 'sales@heymarksman.com', supabaseId: subject })
    await expect(resolveUser({ ...claims(subject), email: 'sales@heymarksman.com' }, 'token')).resolves.toEqual({
      id: 'original-user', orgId: 'original-org', role: 'OPERATOR', supabaseId: subject,
    })
    expect(prisma.assumptionSet.findFirst).not.toHaveBeenCalled()
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not self-provision an approved subject whose app membership is still missing', async () => {
    const subject = '00000000-0000-4000-8000-000000000002'
    process.env.FCM_AUTH_ACCESS_SCOPE = JSON.stringify({ version: 1, users: [
      { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
      { email: 'jgonzalez@xbfreight.com', subject },
    ] })
    await expect(resolveUser({ ...claims(subject), email: 'jgonzalez@xbfreight.com' }, 'token'))
      .rejects.toThrow('FCM_SCOPED_MEMBERSHIP_REQUIRED')
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
    expect(acceptPendingOrganizationInvitation).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("never reassigns an email already linked to another Supabase subject", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: "existing-user",
        orgId: "org-existing",
        role: "ADMIN",
        identityLinked: true,
      },
    ]);

    await expect(resolveUser(claims(), "token-1")).rejects.toThrow(/already linked/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("uses existing preview identities without generating default cost assumptions", async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.FCM_PREVIEW_EXISTING_USERS_ONLY = 'true';
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing', orgId: 'org-preview', role: 'OPERATOR' });
    await expect(resolveUser(claims(), 'token')).resolves.toMatchObject({ id: 'existing', role: 'OPERATOR' });
    expect(prisma.assumptionSet.findFirst).not.toHaveBeenCalled();
    expect(prisma.assumptionSet.create).not.toHaveBeenCalled();
    await expect(resolveUser(claims('unknown'), 'token')).rejects.toThrow('PREVIEW_IDENTITY_NOT_PROVISIONED');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("links an existing unlinked user by verified Supabase email without changing tenant or role", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: "existing-user",
        orgId: "org-existing",
        role: "OPERATOR",
        identityLinked: false,
      },
    ]);
    prisma.$queryRaw.mockResolvedValueOnce([{
      id: "existing-user",
      orgId: "org-existing",
      role: "OPERATOR",
      supabaseId: "new-supabase-subject",
    }]);

    await expect(resolveUser(claims(), "token-1")).resolves.toEqual({
      id: "existing-user",
      orgId: "org-existing",
      role: "OPERATOR",
      supabaseId: "new-supabase-subject",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects ambiguous case-insensitive email matches without choosing a tenant", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { id: "a", orgId: "org-a", role: "ADMIN", identityLinked: false },
      { id: "b", orgId: "org-b", role: "VIEWER", identityLinked: false },
    ]);
    await expect(resolveUser(claims(), "token")).rejects.toThrow(/ambiguous/i);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("fails closed if another identity wins the first-link race", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { id: "a", orgId: "org-a", role: "OPERATOR", identityLinked: false },
    ]).mockResolvedValueOnce([]);
    await expect(resolveUser(claims(), "token")).rejects.toThrow(/link changed/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(acceptPendingOrganizationInvitation).not.toHaveBeenCalled();
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
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(acceptPendingOrganizationInvitation).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
