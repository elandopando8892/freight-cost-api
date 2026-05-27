'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function signOut() {
    if (pending) return
    setPending(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (!res.ok) throw new Error(`Logout failed (${res.status})`)
      toast.success('Signed out')
      router.push('/login')
      router.refresh()
    } catch (err) {
      setPending(false)
      toast.error(err instanceof Error ? err.message : 'Sign out failed')
    }
  }

  return (
    <Button variant="ghost" size="sm" type="button" onClick={signOut} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
