import { type NextRequest } from "next/server";
import { noStoreRedirect } from "@/lib/supabase/auth-response";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return noStoreRedirect(new URL(next, request.url));
  }
  return noStoreRedirect(new URL("/login?error=No+se+pudo+completar+el+acceso", request.url));
}
