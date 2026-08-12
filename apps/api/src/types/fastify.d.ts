import type { JwtPayload } from "../modules/auth/auth.schema.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Internal identity resolved from a verified Kinde access token. */
    user: JwtPayload;
  }
}

export {};
