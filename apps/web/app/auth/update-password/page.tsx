import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePassword } from "./actions";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Define una nueva contraseña</CardTitle>
          <CardDescription>Usa al menos 12 caracteres.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form action={updatePassword} className="grid gap-3">
            <label className="grid gap-1.5 text-sm" htmlFor="password">
              Nueva contraseña
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className="h-10 rounded-md border bg-background px-3" />
            </label>
            <label className="grid gap-1.5 text-sm" htmlFor="passwordConfirmation">
              Confirmar contraseña
              <input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} required className="h-10 rounded-md border bg-background px-3" />
            </label>
            <button className={buttonVariants({ size: "lg", className: "w-full" })}>
              Actualizar contraseña
            </button>
          </form>
          {params.error ? <p role="alert" className="text-sm text-destructive">{params.error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
