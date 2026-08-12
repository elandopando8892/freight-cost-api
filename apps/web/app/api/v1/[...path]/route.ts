/**
 * Generic BFF proxy — forwards /api/v1/* to the Fastify backend with the user's
 * Kinde access token attached as Bearer. Client code calls `/api/v1/...` without
 * ever touching the token directly. Returns JSON 401 (not an HTML redirect) when
 * there's no session, so the client fetcher can react.
 */
import { type NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { buildBffUpstreamUrl } from "@/lib/bff-upstream";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

async function handle(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const { isAuthenticated, getAccessTokenRaw } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  const token = await getAccessTokenRaw();
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  let url: URL;
  try {
    url = buildBffUpstreamUrl(API_URL, path, request.nextUrl.search);
  } catch {
    return NextResponse.json(
      { error: "Invalid BFF upstream configuration or API path." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  const headers = new Headers();
  const ct = request.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    if (body) init.body = body;
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    const responseHeaders = new Headers({
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    });
    const disposition = res.headers.get("content-disposition");
    if (disposition) responseHeaders.set("content-disposition", disposition);
    const requestId = res.headers.get("x-request-id");
    if (requestId) responseHeaders.set("x-request-id", requestId);
    const releaseId = res.headers.get("x-release-id");
    if (releaseId) responseHeaders.set("x-release-id", releaseId);
    return new NextResponse(text || null, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream API unreachable" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
