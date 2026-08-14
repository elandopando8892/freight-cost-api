import { describe, expect, it } from 'vitest'
import {
  memberRoleChangeBlocker,
  organizationMemberRoleConfirmation,
} from '../src/modules/org/organization-member-roles.js'

describe('organization member role governance', () => {
  it('builds a tenant- and member-specific confirmation token', () => {
    expect(
      organizationMemberRoleConfirmation('org-1', 'member-2', 'OPERATOR'),
    ).toBe('CHANGE_MEMBER_ROLE:org-1:member-2:OPERATOR')
  })

  it('rejects no-op role changes', () => {
    expect(
      memberRoleChangeBlocker({
        actorId: 'admin-1',
        memberId: 'admin-2',
        currentRole: 'ADMIN',
        nextRole: 'ADMIN',
        adminCount: 3,
      }),
    ).toBe('ROLE_UNCHANGED')
  })

  it('requires another administrator to change the current actor role', () => {
    expect(
      memberRoleChangeBlocker({
        actorId: 'admin-1',
        memberId: 'admin-1',
        currentRole: 'ADMIN',
        nextRole: 'OPERATOR',
        adminCount: 3,
      }),
    ).toBe('SELF_ROLE_CHANGE')
  })

  it('protects the last administrator', () => {
    expect(
      memberRoleChangeBlocker({
        actorId: 'admin-1',
        memberId: 'admin-2',
        currentRole: 'ADMIN',
        nextRole: 'OPERATOR',
        adminCount: 1,
      }),
    ).toBe('LAST_ADMIN')
  })

  it('allows an administrator demotion when another admin remains', () => {
    expect(
      memberRoleChangeBlocker({
        actorId: 'admin-1',
        memberId: 'admin-2',
        currentRole: 'ADMIN',
        nextRole: 'OPERATOR',
        adminCount: 3,
      }),
    ).toBeNull()
  })

  it('allows promoting a member without depending on the admin count', () => {
    expect(
      memberRoleChangeBlocker({
        actorId: 'admin-1',
        memberId: 'viewer-1',
        currentRole: 'VIEWER',
        nextRole: 'ADMIN',
        adminCount: 1,
      }),
    ).toBeNull()
  })
})
