import type { Metadata } from 'next'
import { LoginLink, RegisterLink } from '@kinde-oss/kinde-auth-nextjs/components'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Freight Cost Model</CardTitle>
          <CardDescription>Sign in to your carrier account</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <LoginLink className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            Sign in
          </LoginLink>
          <RegisterLink className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}>
            Create account
          </RegisterLink>
          <p className="text-center text-xs text-muted-foreground">
            Secured by Kinde — password reset, email verification, and MFA included.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
