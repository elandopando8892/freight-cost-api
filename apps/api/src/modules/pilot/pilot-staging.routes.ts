import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { authenticateExisting } from "../../middleware/authenticate-existing.js";
import type { JwtPayload } from "../auth/auth.schema.js";
import { readinessForOrg } from "./pilot.routes.js";

export async function pilotStagingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticateExisting);

  app.get("/pilot/staging-context", async (request) => {
    const user = request.user as JwtPayload;
    return {
      userId: user.sub,
      orgId: user.orgId,
      role: user.role,
      releaseId: env.RELEASE_SHA.toLowerCase(),
    };
  });

  app.get("/pilot/staging-readiness", async (request) => {
    const user = request.user as JwtPayload;
    return readinessForOrg(user.orgId);
  });
}
