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
export const metadata: Metadata = { title: 'Configuración' }

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
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 border-b pb-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Espacio de trabajo</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">Identidad, equipo e integraciones de este espacio operativo.</p>
      </header>

      {/* Organization */}
      <Card className="mb-6">
        <CardHeader className="border-b bg-muted/25 pb-4">
          <CardTitle>Organización</CardTitle>
          <CardDescription>
            {org ? <>Creada <RelativeTime iso={org.createdAt} /> · {org.country}</> : 'No fue posible cargar los datos de la organización.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {org && <OrgNameForm initialName={org.name} />}

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Equipo ({members.length})
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
                        {m.identityLinked ? 'Kinde vinculado' : 'Pendiente de primer acceso'}
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr><td className="px-3 py-4 text-center text-sm text-muted-foreground">No hay integrantes cargados.</td></tr>
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
        <CardHeader className="border-b bg-muted/25 pb-4">
          <CardTitle>Cuenta</CardTitle>
          <CardDescription>Tu identidad está administrada por Kinde.</CardDescription>
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
            La contraseña, correo y autenticación multifactor se administran desde Kinde. Cierra sesión e ingresa de nuevo para actualizarlos.
          </p>
          <div>
            <LogoutLink className={buttonVariants({ variant: 'outline', size: 'sm' })}>Cerrar sesión</LogoutLink>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
