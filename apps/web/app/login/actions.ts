"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/site-url";

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = credentials(formData);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Correo+o+contrase%C3%B1a+incorrectos");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = credentials(formData);
  if (password.length < 12) {
    redirect("/login?error=La+contrase%C3%B1a+debe+tener+al+menos+12+caracteres");
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${appOrigin()}/auth/callback` },
  });
  if (error) redirect("/login?error=No+se+pudo+crear+la+cuenta");
  redirect("/login?message=Revisa+tu+correo+para+confirmar+la+cuenta");
}

export async function loginWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appOrigin()}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=No+se+pudo+iniciar+Google");
  redirect(data.url);
}
