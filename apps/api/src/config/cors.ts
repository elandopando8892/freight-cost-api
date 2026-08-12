import type { FastifyCorsOptions } from "@fastify/cors";

export function parseTrustedOrigins(value: string | undefined) {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.flatMap((origin) => {
    try {
      const url = new URL(origin);
      return url.protocol === "https:" ? [url.origin] : [];
    } catch {
      return [];
    }
  });
}

export function corsOptionsForEnvironment(
  nodeEnv: "development" | "production" | "test",
  configuredOrigins: string | undefined,
): FastifyCorsOptions {
  if (nodeEnv !== "production") {
    return {
      origin: true,
      credentials: false,
      exposedHeaders: ["x-request-id"],
    };
  }
  const origins = parseTrustedOrigins(configuredOrigins);
  return {
    origin: origins.length > 0 ? origins : false,
    credentials: false,
    exposedHeaders: ["x-request-id"],
  };
}
