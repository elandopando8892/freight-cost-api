"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/site-url";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appOrigin()}/auth/callback?next=/auth/update-password`,
  });

  // Keep the same response for existing and unknown addresses.
  redirect("/login?message=Si+la+cuenta+existe,+recibir%C3%A1s+un+enlace+de+recuperaci%C3%B3n");
}
