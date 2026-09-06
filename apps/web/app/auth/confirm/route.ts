import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { noStoreRedirect } from "@/lib/supabase/auth-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return noStoreRedirect(new URL("/", request.url));
  }
  return noStoreRedirect(new URL("/login?error=El+enlace+de+acceso+no+es+v%C3%A1lido", request.url));
}
