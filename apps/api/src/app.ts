import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { corsOptionsForEnvironment } from "./config/cors.js";
import { prisma } from "./config/prisma.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { orgRoutes } from "./modules/org/org.routes.js";
import { assumptionsRoutes } from "./modules/assumptions/assumptions.routes.js";
import { catalogRoutes } from "./modules/catalog/catalog.routes.js";
import { marketRoutes } from "./modules/market/market.routes.js";
import { lanesRoutes } from "./modules/lanes/lanes.routes.js";
import { engineRoutes } from "./modules/engine/engine.routes.js";
import { quotesRoutes } from "./modules/quotes/quotes.routes.js";
import { productionRoutes } from "./modules/production/production.routes.js";
import { cronRoutes } from "./modules/cron/cron.routes.js";
import { costBasesRoutes } from "./modules/cost-bases/cost-bases.routes.js";
import { customerQuotesRoutes } from "./modules/customer-quotes/customer-quotes.routes.js";
import { rateBooksRoutes } from "./modules/ratebooks/ratebooks.routes.js";
import { approvalsRoutes } from "./modules/approvals/approvals.routes.js";
import { onboardingRoutes } from "./modules/onboarding/onboarding.routes.js";
import { pilotRoutes } from "./modules/pilot/pilot.routes.js";
import { pilotStagingRoutes } from "./modules/pilot/pilot-staging.routes.js";
import { assistantRoutes } from "./modules/assistant/assistant.routes.js";
import { scenarioRoutes } from "./modules/scenarios/scenario.routes.js";
import { scenarioReviewRoutes } from "./modules/scenario-reviews/scenario-reviews.routes.js";

export function buildApp() {
  const app = Fastify({
    trustProxy: env.NODE_ENV === "production",
    logger:
      env.NODE_ENV === "test"
        ? false
        : {
            level: env.LOG_LEVEL,
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                "res.headers.set-cookie",
              ],
              censor: "[REDACTED]",
            },
          },
  });

  // Plugins
  app.register(helmet);
  app.register(cors, corsOptionsForEnvironment(env.NODE_ENV, env.CORS_ORIGINS));
  app.register(rateLimit, {
    global: env.NODE_ENV === "production",
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    hook: "onRequest",
    allowList: (request: FastifyRequest) => {
      const pathname = request.url.split("?", 1)[0];
      return pathname === "/health" || pathname === "/ready";
    },
    errorResponseBuilder: (request: FastifyRequest) => ({
      error: "Too many requests",
      requestId: request.id,
    }),
  });

  // Global error handler
  app.setErrorHandler(errorHandler);
  app.addHook("onSend", async (request, reply) => {
    reply.header("X-Request-ID", request.id);
    reply.header("X-Release-ID", env.RELEASE_SHA);
  });

  // Health check (no auth)
  app.get("/health", async () => ({
    status: "ok",
    release: env.RELEASE_SHA,
    ts: new Date().toISOString(),
  }));
  // Readiness is intentionally separate from liveness: it confirms the app can
  // reach PostgreSQL without returning database details or configuration.
  app.get("/ready", async (_request, reply) => {
    const ts = new Date().toISOString();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply
        .header("Cache-Control", "no-store")
        .send({
          status: "ready",
          database: "connected",
          release: env.RELEASE_SHA,
          ts,
        });
    } catch {
      return reply
        .status(503)
        .header("Cache-Control", "no-store")
        .send({
          status: "not_ready",
          database: "unavailable",
          release: env.RELEASE_SHA,
          ts,
        });
    }
  });

  // Routes
  app.register(authRoutes);
  app.register(orgRoutes);
  app.register(assumptionsRoutes);
  app.register(costBasesRoutes);
  app.register(customerQuotesRoutes);
  app.register(rateBooksRoutes);
  app.register(approvalsRoutes);
  app.register(onboardingRoutes);
  app.register(pilotStagingRoutes);
  app.register(pilotRoutes);
  app.register(assistantRoutes);
  app.register(scenarioRoutes);
  app.register(scenarioReviewRoutes);
  app.register(catalogRoutes);
  app.register(marketRoutes);
  app.register(lanesRoutes);
  app.register(engineRoutes);
  app.register(quotesRoutes);
  app.register(productionRoutes);
  app.register(cronRoutes);

  return app;
}
