import { beforeEach, describe, expect, it, vi } from "vitest";

const jwtVerify = vi.fn();
const createRemoteJWKSet = vi.fn(() => ({ type: "test-jwks" }));

vi.mock("jose", () => ({ jwtVerify, createRemoteJWKSet }));
vi.mock("../src/config/prisma.js", () => ({ prisma: {} }));
vi.mock("../src/modules/org/organization-invitations.service.js", () => ({
  acceptPendingOrganizationInvitation: vi.fn(),
}));

const { verifySupabaseToken } = await import("../src/modules/auth/supabase.service.js");

const permanentClaims = {
  sub: "8a8d2935-fcb8-4f7a-bca9-71948c831bd6",
  email: "pilot@example.com",
  role: "authenticated",
  session_id: "329420f8-a03f-4125-a7b3-92f81c0a6631",
  is_anonymous: false,
};

describe("Supabase access-token verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://fcm-auth.supabase.co";
    delete process.env.SUPABASE_EXPECTED_PROJECT_REF;
    process.env.SUPABASE_JWT_AUDIENCE = "authenticated";
    jwtVerify.mockResolvedValue({ payload: permanentClaims });
  });

  it("accepts a signed permanent-user token for the configured project", async () => {
    await expect(verifySupabaseToken("token")).resolves.toEqual(permanentClaims);
    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL("https://fcm-auth.supabase.co/auth/v1/.well-known/jwks.json"),
    );
    expect(jwtVerify).toHaveBeenCalledWith(
      "token",
      expect.anything(),
      {
        issuer: "https://fcm-auth.supabase.co/auth/v1",
        audience: "authenticated",
      },
    );
  });

  it("rejects anonymous sessions even though Supabase assigns them the authenticated database role", async () => {
    jwtVerify.mockResolvedValueOnce({
      payload: { ...permanentClaims, is_anonymous: true },
    });
    await expect(verifySupabaseToken("anonymous-token")).rejects.toThrow(
      /permanent authenticated-user claims/i,
    );
  });

  it("rejects a token without a durable session id", async () => {
    jwtVerify.mockResolvedValueOnce({
      payload: { ...permanentClaims, session_id: "" },
    });
    await expect(verifySupabaseToken("sessionless-token")).rejects.toThrow(
      /permanent authenticated-user claims/i,
    );
  });

  it("rejects configuration that drifts from the approved Supabase project", async () => {
    process.env.SUPABASE_EXPECTED_PROJECT_REF = "alqjqzqagdmcywpjtnnr";
    await expect(verifySupabaseToken("wrong-project-token")).rejects.toThrow(
      /approved project/i,
    );
    expect(jwtVerify).not.toHaveBeenCalled();
  });
});
