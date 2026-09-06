import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset } from "./actions";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar acceso</CardTitle>
          <CardDescription>Te enviaremos un enlace seguro si la cuenta existe.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form action={requestPasswordReset} className="grid gap-3">
            <label className="grid gap-1.5 text-sm" htmlFor="email">
              Correo
              <input id="email" name="email" type="email" autoComplete="email" required className="h-10 rounded-md border bg-background px-3" />
            </label>
            <button className={buttonVariants({ size: "lg", className: "w-full" })}>
              Enviar enlace
            </button>
          </form>
          <Link href="/login" className="text-center text-sm text-primary underline-offset-4 hover:underline">
            Volver al inicio de sesión
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
