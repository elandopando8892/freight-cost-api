import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../prisma/migrations/20260815000100_assumption_applicability_context/migration.sql',
  ),
  'utf8',
)

describe('assumption applicability context migration', () => {
  it('adds the versioned JSONB context and its audit action exactly once', () => {
    expect(migration).toMatch(
      /ALTER\s+TABLE\s+"AssumptionSet"\s+ADD\s+COLUMN\s+"applicabilityContext"\s+JSONB\s*;/i,
    )

    const profileUpdatedStatements = migration.match(
      /ALTER\s+TYPE\s+"AssumptionVersionAuditAction"\s+ADD\s+VALUE\s+IF\s+NOT\s+EXISTS\s+'PROFILE_UPDATED'\s*;/gi,
    )
    expect(profileUpdatedStatements).toHaveLength(1)
  })
})
