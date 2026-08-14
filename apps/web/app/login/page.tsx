import type { Metadata } from 'next'
import { LoginLink, RegisterLink } from '@kinde-oss/kinde-auth-nextjs/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Freight Cost Model</CardTitle>
          <CardDescription>Ingresa a tu cuenta de transportista</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <LoginLink className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            Iniciar sesión
          </LoginLink>
          <RegisterLink className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}>
            Crear cuenta
          </RegisterLink>
          <p className="text-center text-xs text-muted-foreground">
            Protegido por Kinde: recuperación de contraseña, verificación de correo y MFA incluidos.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
