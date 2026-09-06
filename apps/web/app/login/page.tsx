import type { Metadata } from 'next'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { login, loginWithGoogle, signup } from './actions'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(26rem,0.92fr)]">
      <section
        aria-label="Identidad MARKSMAN"
        className="flex min-h-[18rem] flex-col justify-between bg-[#1e1e1e] px-6 py-7 text-[#efefef] lg:min-h-screen lg:px-12 lg:py-10"
      >
        <div className="w-fit max-w-full rounded-sm bg-[#efefef] px-4 py-3">
          <Image
            src="/brand/marksman-logo.png"
            alt="MARKSMAN — Precision Freight Networks"
            width={458}
            height={54}
            priority
            className="h-auto w-[min(25rem,75vw)]"
          />
        </div>
        <div className="max-w-2xl pt-12 lg:pb-6">
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ea5e27] uppercase">
            Precision Freight Networks
          </p>
          <h1 className="mt-4 max-w-xl text-3xl leading-[1.08] font-semibold tracking-[-0.035em] sm:text-4xl lg:text-6xl">
            No es mover carga. Es diseñar cómo se mueve.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#efefef]/70 sm:text-base">
            Estructura costos, compara decisiones y conserva evidencia comercial en un solo sistema disciplinado.
          </p>
        </div>
      </section>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-5 border-l-4 border-[#ea5e27] pl-4">
            <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">Plataforma comercial</p>
            <p className="mt-1 text-sm text-muted-foreground">Acceso seguro al workspace de tarifas.</p>
          </div>
          <Card className="w-full py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-xl tracking-[-0.025em]">Freight Cost Model</CardTitle>
              <CardDescription>Estructura, calcula y gobierna cada tarifa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 px-5">
              <form className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-medium" htmlFor="email">
                  Correo
                  <input id="email" name="email" type="email" autoComplete="email" required className="h-10 rounded-sm border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </label>
                <label className="grid gap-1.5 text-sm font-medium" htmlFor="password">
                  Contraseña
                  <input id="password" name="password" type="password" autoComplete="current-password" required className="h-10 rounded-sm border bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </label>
                <button formAction={login} className={buttonVariants({ size: 'lg', className: 'mt-1 w-full' })}>
                  Iniciar sesión
                </button>
                <button formAction={signup} className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}>
                  Crear cuenta
                </button>
              </form>
              <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                o
              </div>
              <form action={loginWithGoogle}>
                <button className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}>
                  Continuar con Google
                </button>
              </form>
              <Link href="/forgot-password" className="text-center text-sm font-medium text-foreground underline decoration-[#ea5e27] decoration-2 underline-offset-4 hover:text-primary">
                Olvidé mi contraseña
              </Link>
              {params.error ? <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">{params.error}</p> : null}
              {params.message ? <p role="status" className="border-l-2 border-primary pl-3 text-sm text-muted-foreground">{params.message}</p> : null}
              <p className="border-t pt-4 text-center text-xs leading-5 text-muted-foreground">
                Protegido por Supabase Auth. La organización, los roles y la evidencia permanecen en Freight Cost Model.
              </p>
            </CardContent>
          </Card>
          <p className="mt-5 text-center font-mono text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
            MARKSMAN · Precision Freight Networks
          </p>
        </div>
      </main>
    </div>
  )
}
