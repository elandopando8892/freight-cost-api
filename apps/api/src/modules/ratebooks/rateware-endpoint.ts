type NodeEnvironment = "development" | "production" | "test";

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/**
 * A Rateware request carries the authenticated administrator's bearer token.
 * Production therefore permits only an HTTPS endpoint. Local HTTP is limited
 * to loopback so development can use a mock receiver without making a token
 * available to an arbitrary network host.
 */
export function trustedRatewareEndpoint(
  value: string | undefined,
  nodeEnv: NodeEnvironment,
) {
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error("RATEWARE_API_URL must be a valid HTTPS URL."), {
      statusCode: 503,
    });
  }

  const allowsLocalHttp =
    nodeEnv !== "production" && url.protocol === "http:" && isLoopbackHost(url.hostname);
  if (url.protocol !== "https:" && !allowsLocalHttp) {
    throw Object.assign(
      new Error("RATEWARE_API_URL must use HTTPS outside local development."),
      { statusCode: 503 },
    );
  }
  if (url.username || url.password) {
    throw Object.assign(
      new Error("RATEWARE_API_URL must not include embedded credentials."),
      { statusCode: 503 },
    );
  }

  return url.toString();
}
