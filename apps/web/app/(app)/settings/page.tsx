import type { Metadata } from 'next'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/components'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { RelativeTime } from '@/components/relative-time'
import { OrgNameForm } from './org-name-form'
import { GmailIntegrationCard } from './gmail-integration-card'
import { TeamInvitations } from './team-invitations'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Settings' }

interface Org { id: string; name: string; country: string; createdAt: string }
interface Member { id: string; email: string; role: string; identityLinked: boolean; createdAt: string }
interface Invitation { id: string; email: string; role: 'ADMIN' | 'OPERATOR' | 'VIEWER'; status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'; expiresAt: string }
interface Me { id: string; email: string; role: string; orgId: string }

function initials(name: string, email: string): string {
  const base = (name || email || '?').trim()
  const parts = base.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default async function SettingsPage() {
  const { getUser } = getKindeServerSession()
  const [org, members, me, invitations, user] = await Promise.all([
    api<Org>('/org').catch(() => null),
    api<Member[]>('/org/members').catch(() => [] as Member[]),
    api<Me>('/auth/me').catch(() => null),
    api<Invitation[]>('/org/invitations').catch(() => [] as Invitation[]),
    getUser(),
  ])

  const name = [user?.given_name, user?.family_name].filter(Boolean).join(' ') || (user?.email ?? '')
  const email = user?.email ?? me?.email ?? ''

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

      {/* Organization */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            {org ? <>Created <RelativeTime iso={org.createdAt} /> · {org.country}</> : 'Org details unavailable.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {org && <OrgNameForm initialName={org.name} />}

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Members ({members.length})
            </div>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{m.email}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{m.role}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {m.identityLinked ? 'Kinde linked' : 'Awaiting first login'}
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr><td className="px-3 py-4 text-center text-sm text-muted-foreground">No members loaded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {me?.role === 'ADMIN' ? <TeamInvitations invitations={invitations} /> : null}
        </CardContent>
      </Card>

      <GmailIntegrationCard email={email} />

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your identity is managed by Kinde.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(name, email)}
            </span>
            <div className="min-w-0">
              <div className="truncate font-medium">{name || '—'}</div>
              <div className="truncate text-sm text-muted-foreground">{email}</div>
            </div>
            {me?.role && (
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{me.role}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Password, email and multi-factor authentication are handled by Kinde. Sign out and back in to update them.
          </p>
          <div>
            <LogoutLink className={buttonVariants({ variant: 'outline', size: 'sm' })}>Sign out</LogoutLink>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
