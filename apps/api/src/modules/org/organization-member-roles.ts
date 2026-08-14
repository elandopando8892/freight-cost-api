import type { Role } from '@prisma/client'

export function organizationMemberRoleConfirmation(
  orgId: string,
  memberId: string,
  role: Role,
) {
  return `CHANGE_MEMBER_ROLE:${orgId}:${memberId}:${role}`
}

export type MemberRoleChangeBlocker =
  | 'ROLE_UNCHANGED'
  | 'SELF_ROLE_CHANGE'
  | 'LAST_ADMIN'
  | null

export function memberRoleChangeBlocker(input: {
  actorId: string
  memberId: string
  currentRole: Role
  nextRole: Role
  adminCount: number
}): MemberRoleChangeBlocker {
  if (input.currentRole === input.nextRole) return 'ROLE_UNCHANGED'
  if (input.actorId === input.memberId) return 'SELF_ROLE_CHANGE'
  if (
    input.currentRole === 'ADMIN' &&
    input.nextRole !== 'ADMIN' &&
    input.adminCount <= 1
  ) {
    return 'LAST_ADMIN'
  }
  return null
}
