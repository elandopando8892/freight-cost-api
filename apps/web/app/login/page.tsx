import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <LoginForm />
    </div>
  )
}
