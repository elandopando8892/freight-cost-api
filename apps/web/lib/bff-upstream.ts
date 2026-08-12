const unsafeSegment = /[\\/\u0000]/;

export function buildBffUpstreamUrl(
  apiUrl: string,
  path: string[],
  search: string,
  nodeEnv = process.env.NODE_ENV,
) {
  if (
    path.length === 0 ||
    path.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        unsafeSegment.test(segment),
    )
  ) {
    throw new Error("Invalid API path");
  }

  const base = new URL(apiUrl);
  const localDevelopment =
    nodeEnv !== "production" &&
    (base.protocol === "http:" || base.protocol === "https:");
  if (base.protocol !== "https:" && !localDevelopment) {
    throw new Error("API_URL must use HTTPS in production");
  }

  const prefix = base.pathname.replace(/\/$/, "");
  const encodedPath = path
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const upstream = new URL(`${prefix}/${encodedPath}`, base);
  upstream.search = search;
  return upstream;
}
