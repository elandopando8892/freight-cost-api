import { FastifyRequest, FastifyReply } from "fastify";
import {
  verifyKindeToken,
  resolveUser,
} from "../modules/auth/kinde.service.js";
import type { JwtPayload } from "../modules/auth/auth.schema.js";

/**
 * Authenticate via a Kinde access token (Bearer). Verifies the token against
 * Kinde's JWKS, maps the Kinde subject to our User/Organization (auto-provisioning
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
    const claims = await verifyKindeToken(token);
    const user = await resolveUser(claims.sub, token);
    request.user = {
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      kindeId: user.kindeId,
    } as JwtPayload;
  } catch (err) {
    request.log.warn({ err: (err as Error).message }, "kinde auth failed");
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
