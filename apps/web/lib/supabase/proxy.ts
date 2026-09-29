import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeAuthNext } from "./safe-next";

const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/auth/"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  // Keep this adjacent to client creation so token refresh cannot race.
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isBff = path.startsWith("/api/v1") || path.startsWith("/api/integrations");

  if (!authenticated && !isPublic && !isBff) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (authenticated && path === "/login") {
    const next = request.nextUrl.searchParams.get("next");
    const destination = safeAuthNext(next, request.url);
    const homeUrl = new URL(destination, request.url);
    return NextResponse.redirect(homeUrl.pathname === "/login" ? new URL("/", request.url) : homeUrl);
  }
  return response;
}
