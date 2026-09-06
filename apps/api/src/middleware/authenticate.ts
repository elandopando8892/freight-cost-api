import { FastifyRequest, FastifyReply } from "fastify";
import { verifySupabaseToken, resolveUser } from "../modules/auth/supabase.service.js";
import type { JwtPayload } from "../modules/auth/auth.schema.js";

/**
 * Authenticate via a Supabase access token (Bearer). Verifies the token against
 * Supabase's JWKS, maps its subject to our User/Organization (auto-provisioning
 * on first sight), and populates request.user with our internal identity so the
 * downstream routes keep reading { sub, orgId, role } unchanged.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const token = auth.slice("Bearer ".length).trim();
  try {
    const claims = await verifySupabaseToken(token);
    const user = await resolveUser(claims, token);
    request.user = {
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      supabaseId: user.supabaseId,
    } as JwtPayload;
  } catch (err) {
    request.log.warn({ err: (err as Error).message }, "supabase auth failed");
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
