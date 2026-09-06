export function appOrigin() {
  const vercelPreviewUrl = process.env.VERCEL_URL?.trim();
  if (process.env.VERCEL_ENV === "preview" && vercelPreviewUrl) {
    return new URL(`https://${vercelPreviewUrl.replace(/^https?:\/\//, "")}`).origin;
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV !== "production") return "http://localhost:3001";
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
  }

  const url = new URL(configured);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production");
  }
  return url.origin;
}
