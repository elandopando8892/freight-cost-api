'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetcher } from '@/lib/fetcher'

type Invitation = {
  id: string
  email: string
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER'
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: string
}

type InvitationPreview = {
  eligible: boolean
  reason?: string
  action?: string
  email: string
  role: Invitation['role']
  expiresAt: string
  confirmation: string
  emailDelivery: 'NOT_SENT'
}

export function TeamInvitations({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Invitation['role']>('ADMIN')
  const [preview, setPreview] = useState<InvitationPreview | null>(null)

  const previewInvitation = useMutation({
    mutationFn: () => fetcher<InvitationPreview>('/api/v1/org/invitations/preview', {
      method: 'POST',
      json: { email, role },
    }),
    onSuccess: (result) => setPreview(result),
  })
  const createInvitation = useMutation({
    mutationFn: () => {
      if (!preview?.eligible) throw new Error('Preview is required')
      return fetcher('/api/v1/org/invitations', {
        method: 'POST',
        json: {
          email: preview.email,
          role: preview.role,
          confirmation: preview.confirmation,
        },
      })
    },
    onSuccess: () => {
      toast.success('Invitation registered. No email was sent automatically.')
      setEmail('')
      setPreview(null)
      router.refresh()
    },
  })
  const revokeInvitation = useMutation({
    mutationFn: (id: string) => fetcher(`/api/v1/org/invitations/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      toast.success('Invitation revoked')
      router.refresh()
    },
  })

  function changeEmail(value: string) {
    setEmail(value)
    setPreview(null)
  }

  function changeRole(value: Invitation['role']) {
    setRole(value)
    setPreview(null)
  }

  return (
    <section className="grid gap-4 border-t pt-5" aria-labelledby="team-invitations-heading">
      <div>
        <h3 id="team-invitations-heading" className="text-sm font-medium">Team invitations</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Preview first. The invitation joins this tenant on the first matching Kinde login and expires after seven days.
        </p>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          if (email.trim()) previewInvitation.mutate()
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => changeEmail(event.target.value)}
            placeholder="teammate@company.com"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={role}
            onChange={(event) => changeRole(event.target.value as Invitation['role'])}
          >
            <option value="ADMIN">Admin</option>
            <option value="OPERATOR">Operator</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        <Button type="submit" variant="outline" disabled={previewInvitation.isPending || !email.trim()}>
          {previewInvitation.isPending ? 'Checking…' : 'Preview'}
        </Button>
      </form>

      {preview ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm" role="status">
          {preview.eligible ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p><span className="font-medium">{preview.email}</span> will join as {preview.role}.</p>
                <p className="mt-1 text-xs text-muted-foreground">No email will be sent by this action.</p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={createInvitation.isPending}
                onClick={() => createInvitation.mutate()}
              >
                {createInvitation.isPending ? 'Registering…' : 'Confirm invitation'}
              </Button>
            </div>
          ) : (
            <p>This email cannot be invited ({preview.reason ?? 'unavailable'}).</p>
          )}
        </div>
      ) : null}

      {invitations.length ? (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="border-t">
                  <td className="px-3 py-2">{invitation.email}</td>
                  <td className="px-3 py-2">{invitation.role}</td>
                  <td className="px-3 py-2">{invitation.status}</td>
                  <td className="px-3 py-2 text-right">
                    {invitation.status === 'PENDING' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={revokeInvitation.isPending}
                        onClick={() => revokeInvitation.mutate(invitation.id)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
