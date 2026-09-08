import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/config/prisma.js', () => ({ prisma: { $queryRaw: vi.fn() } }))
const { prisma } = await import('../src/config/prisma.js')
const { listOrganizationMembers } = await import('../src/modules/org/organization-members.js')

describe('organization roster transitional identity read', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns linked and unlinked members without requiring the identity UUID', async () => {
    const members = [true, false].map((identityLinked, index) => ({
      id: `member-${index}`, email: `member-${index}@example.test`, role: 'VIEWER',
      createdAt: new Date('2026-09-08'), identityLinked,
    }))
    vi.mocked(prisma.$queryRaw).mockResolvedValue(members)
    expect(await listOrganizationMembers('org-1')).toEqual(members)
    const [parts, tenant] = vi.mocked(prisma.$queryRaw).mock.calls[0]
    const sql = (parts as TemplateStringsArray).join('?')
    expect(tenant).toBe('org-1')
    expect(sql).toContain('WHERE "orgId" = ?')
    expect(sql).toContain('("supabaseId" IS NOT NULL) AS "identityLinked"')
    expect(sql).not.toMatch(/SELECT\s+\*/i)
  })

  it('binds the organization as a parameter, never SQL text', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])
    const tenant = "org-1' OR TRUE --"
    await listOrganizationMembers(tenant)
    const [parts, value] = vi.mocked(prisma.$queryRaw).mock.calls[0]
    expect(value).toBe(tenant)
    expect((parts as TemplateStringsArray).join('')).not.toContain(tenant)
  })

  it('propagates database failures instead of claiming an empty organization', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('database unavailable'))
    await expect(listOrganizationMembers('org-1')).rejects.toThrow('database unavailable')
  })
})
