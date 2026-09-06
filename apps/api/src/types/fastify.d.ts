import type { JwtPayload } from "../modules/auth/auth.schema.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Internal identity resolved from a verified Supabase access token. */
    user: JwtPayload;
  }
}

export {};
