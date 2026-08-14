'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { fetcher } from '@/lib/fetcher'

type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER'

export type TeamMember = {
  id: string
  email: string
  role: Role
  identityLinked: boolean
  createdAt: string
}

export type MemberRoleAudit = {
  id: string
  previousRole: Role
  nextRole: Role
  createdAt: string
  member: { id: string; email: string }
  actor: { id: string; email: string }
}

type RolePreview = {
  eligible: boolean
  reason?: 'ROLE_UNCHANGED' | 'SELF_ROLE_CHANGE' | 'LAST_ADMIN'
  member: Pick<TeamMember, 'id' | 'email' | 'role'>
  targetRole: Role
  adminCount: number
  adminsRemaining?: number
  confirmation?: string
}

const roleLabel: Record<Role, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  VIEWER: 'Consulta',
}

const roleAuditDateTime = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
})

export function TeamMembers({
  members,
  currentUserId,
  canManageRoles,
  audits,
}: {
  members: TeamMember[]
  currentUserId: string | null
  canManageRoles: boolean
  audits: MemberRoleAudit[]
}) {
  const router = useRouter()
  const [draftRoles, setDraftRoles] = useState<Record<string, Role>>({})
  const [preview, setPreview] = useState<RolePreview | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const previewRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      fetcher<RolePreview>(`/api/v1/org/members/${memberId}/role/preview`, {
        method: 'POST',
        json: { role },
      }),
    onSuccess: (result) => {
      setPreview(result)
      setConfirmed(false)
    },
    onError: () => {
      toast.error('No fue posible revisar el cambio de rol. Intenta de nuevo.')
    },
  })

  const commitRole = useMutation({
    mutationFn: () => {
      if (!preview?.eligible || !preview.confirmation) {
        throw new Error('Role preview is required')
      }
      return fetcher(`/api/v1/org/members/${preview.member.id}/role`, {
        method: 'PATCH',
        json: {
          role: preview.targetRole,
          confirmation: preview.confirmation,
        },
      })
    },
    onSuccess: () => {
      toast.success('Rol actualizado y registrado en auditoría.')
      setPreview(null)
      setConfirmed(false)
      router.refresh()
    },
    onError: () => {
      toast.error('No fue posible aplicar el cambio. Revisa nuevamente el rol antes de confirmar.')
    },
  })

  function updateDraft(memberId: string, role: Role) {
    setDraftRoles((current) => ({ ...current, [memberId]: role }))
    if (preview?.member.id === memberId) {
      setPreview(null)
      setConfirmed(false)
    }
  }

  return (
    <section className="grid gap-4" aria-labelledby="team-members-heading">
      <div>
        <h3 id="team-members-heading" className="text-sm font-medium">
          Equipo ({members.length})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {canManageRoles
            ? 'Los cambios de rol requieren vista previa y confirmación. Nunca se permite degradar al último administrador.'
            : 'Tu acceso permite consultar el equipo, pero no cambiar sus permisos.'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Integrante</th>
              <th className="px-3 py-2">Rol actual</th>
              <th className="px-3 py-2">Identidad</th>
              <th className="px-3 py-2">Nuevo rol</th>
              <th className="px-3 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const nextRole = draftRoles[member.id] ?? member.role
              const isCurrentUser = member.id === currentUserId
              return (
                <tr key={member.id} className="border-t">
                  <td className="px-3 py-2">
                    <span className="font-medium">{member.email}</span>
                    {isCurrentUser ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        Tu cuenta
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{roleLabel[member.role]}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {member.identityLinked ? 'Kinde vinculado' : 'Pendiente de primer acceso'}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`Nuevo rol para ${member.email}`}
                      className="h-9 min-w-36 rounded-md border bg-background px-3 text-sm disabled:opacity-60"
                      disabled={!canManageRoles || isCurrentUser}
                      value={nextRole}
                      onChange={(event) => updateDraft(member.id, event.target.value as Role)}
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="OPERATOR">Operador</option>
                      <option value="VIEWER">Consulta</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!canManageRoles ? (
                      <span className="text-xs text-muted-foreground">Solo lectura</span>
                    ) : isCurrentUser ? (
                      <span className="text-xs text-muted-foreground">Protegida</span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={nextRole === member.role || previewRole.isPending || commitRole.isPending}
                        onClick={() => previewRole.mutate({ memberId: member.id, role: nextRole })}
                      >
                        {previewRole.isPending ? 'Revisando…' : 'Revisar cambio'}
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {preview ? (
        <div className="rounded-md border bg-muted/30 p-4 text-sm" role="status">
          {preview.eligible ? (
            <div className="grid gap-3">
              <div>
                <p className="font-medium">Cambio de rol listo para confirmar</p>
                <p className="mt-1 text-muted-foreground">
                  {preview.member.email}: {roleLabel[preview.member.role]} → {roleLabel[preview.targetRole]}.
                  {' '}Quedarán {preview.adminsRemaining ?? preview.adminCount} administrador(es).
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  El usuario, sus registros históricos y sus acciones previas se conservan.
                </p>
              </div>
              <label className="flex items-start gap-2">
                <input
                  className="mt-0.5"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>Confirmo este cambio de permisos para la organización actual.</span>
              </label>
              <div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!confirmed || commitRole.isPending}
                  onClick={() => commitRole.mutate()}
                >
                  {commitRole.isPending ? 'Aplicando…' : 'Confirmar cambio de rol'}
                </Button>
              </div>
            </div>
          ) : (
            <p>
              {preview.reason === 'LAST_ADMIN'
                ? 'Este cambio dejaría a la organización sin administrador y fue bloqueado.'
                : preview.reason === 'SELF_ROLE_CHANGE'
                  ? 'Otro administrador debe cambiar el rol de tu cuenta.'
                  : 'El integrante ya tiene ese rol.'}
            </p>
          )}
        </div>
      ) : null}

      {audits.length ? (
        <details className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">Historial de cambios de rol ({audits.length})</summary>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            {audits.map((audit) => (
              <p key={audit.id}>
                {roleAuditDateTime.format(new Date(audit.createdAt))}: {audit.actor.email} cambió a {audit.member.email}
                {' '}de {roleLabel[audit.previousRole]} a {roleLabel[audit.nextRole]}.
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  )
}
