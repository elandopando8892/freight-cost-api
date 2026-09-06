"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  if (password.length < 12) {
    redirect("/auth/update-password?error=La+contrase%C3%B1a+debe+tener+al+menos+12+caracteres");
  }
  if (password !== passwordConfirmation) {
    redirect("/auth/update-password?error=Las+contrase%C3%B1as+no+coinciden");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/login?error=El+enlace+de+recuperaci%C3%B3n+expir%C3%B3+o+no+es+v%C3%A1lido");
  redirect("/?message=Contrase%C3%B1a+actualizada");
}
