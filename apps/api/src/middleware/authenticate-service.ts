import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import type { ServiceApiClient } from "../config/service-clients.js";
import type { JwtPayload } from "../modules/auth/auth.schema.js";
import { authenticate } from "./authenticate.js";

/**
 * Constant-time comparison of two digests. Returns false (never throws) when the
 * lengths differ; a dummy comparison keeps the timing independent of that case.
 */
export function digestsEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Finds the service client whose secret hashes to the presented token. Every
 * configured client is compared (no early exit) so the response time does not
 * reveal which entry matched.
 */
export function matchServiceClient(
  token: string,
  clients: readonly ServiceApiClient[],
): ServiceApiClient | null {
  if (!token || clients.length === 0) return null;
  const presented = createHash("sha256").update(token, "utf8").digest();
  let match: ServiceApiClient | null = null;
  for (const client of clients) {
    if (digestsEqual(presented, client.secretHash) && match === null) {
      match = client;
    }
  }
  return match;
}

function bearerToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

/**
 * preHandler for the routes that accept machine-to-machine credentials
 * (contract fcm.quote-by-route.v1): POST /engine/quote-by-route and GET /catalog/*.
 *
 * A bearer matching SERVICE_API_CLIENTS authenticates as that client's
 * organization without provisioning any user or organization. Anything else
 * falls through to the unchanged Kinde `authenticate`. Never register this on
 * other routes: they must keep requiring a Kinde identity.
 */
export async function authenticateServiceOrKinde(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const token = bearerToken(request);
  const client = token
    ? matchServiceClient(token, env.SERVICE_API_CLIENTS ?? [])
    : null;
  if (!client) return authenticate(request, reply);

  // Fail closed if the configured organization does not (or no longer) exist.
  const org = await prisma.organization.findUnique({
    where: { id: client.orgId },
    select: { id: true },
  });
  if (!org) {
    request.log.warn(
      { serviceClient: client.clientId },
      "service client organization not found",
    );
    return reply.status(401).send({ error: "Unauthorized" });
  }

  request.user = {
    sub: `svc:${client.clientId}`,
    orgId: client.orgId,
    role: client.role,
    kindeId: null,
    service: true,
  } satisfies JwtPayload;

  // Tag every subsequent log line of this request (including Fastify's
  // "request completed") with the client id. The secret is never logged; the
  // Authorization header is redacted by the app logger configuration.
  const child = request.log.child({ serviceClient: client.clientId });
  request.log = child;
  reply.log = child;
  request.log.info("service client authenticated");
}
