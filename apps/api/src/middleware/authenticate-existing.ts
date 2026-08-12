import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../config/prisma.js";
import { verifyKindeToken } from "../modules/auth/kinde.service.js";
import type { JwtPayload } from "../modules/auth/auth.schema.js";

/**
 * Read-only staging authentication. Unlike the normal application middleware,
 * it never provisions a user, organization or assumption set.
 */
export async function authenticateExisting(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  try {
    const claims = await verifyKindeToken(auth.slice("Bearer ".length).trim());
    const user = await prisma.user.findUnique({
      where: { kindeId: claims.sub },
      select: { id: true, orgId: true, role: true, kindeId: true },
    });
    if (!user?.kindeId) {
      return reply.status(403).send({
        error: "Staging actor must be provisioned before read-only preflight.",
      });
    }
    request.user = {
      sub: user.id,
      orgId: user.orgId,
      role: user.role,
      kindeId: user.kindeId,
    } as JwtPayload;
  } catch (err) {
    request.log.warn(
      { err: (err as Error).message },
      "read-only staging auth failed",
    );
    return reply.status(401).send({ error: "Unauthorized" });
  }
}
