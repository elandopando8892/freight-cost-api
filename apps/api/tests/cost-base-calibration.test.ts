import { describe, expect, it } from 'vitest'
import { DEFAULT_ASSUMPTIONS } from '../src/data/default-assumptions.js'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'
import { defaultCostBaseProfile } from '../src/modules/cost-bases/cost-base-profile.js'
import { parameterApplicability } from '../src/modules/cost-bases/cost-base-applicability.js'
import { OPERATIONAL_SEGMENTS } from '../src/modules/cost-bases/operational-segments.js'
import {
  CALIBRATION_CHECKLIST_VERSION, SaveCostBaseCalibrationSchema,
  calibrationChecklist, calibrationFingerprint, calibrationStatus,
} from '../src/modules/cost-bases/cost-base-calibration.js'

const params = DEFAULT_ASSUMPTIONS.map(({ section, field, value }) => ({ section, field, value }))
const sourcesFor = (groups: ReturnType<typeof calibrationChecklist>['groups']) => groups.map(group => ({
  groupId: group.id, source: `Cost report for ${group.label}`, asOf: '2026-09-01',
}))

describe('segment assumption calibration', () => {
  it('covers every mathematically applicable canonical assumption for each supported segment', () => {
    for (const segment of OPERATIONAL_SEGMENTS.filter(option => option.status === 'CONFIGURABLE')) {
      const profile = defaultCostBaseProfile(segment.scope)
      const checklist = calibrationChecklist(segment.scope, profile, params)
      const covered = new Set(checklist.groups.flatMap(group => group.fields.map(field => `${field.section}__${field.field}`)))
      const expected = PARAMETER_DEFINITIONS.filter(definition => ['REQUIRED', 'CONDITIONAL'].includes(
        parameterApplicability(segment.scope, definition, profile).applicability,
      ))
      expect(covered.size, segment.id).toBe(expected.length)
      expect(checklist.groups.every(group => group.fields.every(field => field.value != null))).toBe(true)
      expect(checklist.groups.some(group => group.id === 'BORDER')).toBe(segment.scope === 'CROSS_BORDER')
    }
  })

  it('does not mistake a reviewed baseline for a reviewed later edit or profile change', () => {
    const segment = OPERATIONAL_SEGMENTS.find(option => option.id === 'MX_LOCAL')!
    const profile = defaultCostBaseProfile(segment.scope)
    const groups = calibrationChecklist(segment.scope, profile, params).groups
    const stored = {
      checklistVersion: CALIBRATION_CHECKLIST_VERSION,
      segment: segment.id,
      fingerprint: calibrationFingerprint(segment.id, profile, params),
      reviewedAt: '2026-09-22T12:00:00.000Z',
      reviewedBy: 'user-test',
      sources: sourcesFor(groups),
    }
    expect(calibrationStatus(stored, segment.id, profile, params, segment.scope).status).toBe('CURRENT')
    expect(calibrationStatus(stored, segment.id, profile, params.map(param => param.field === 'Diesel MX' ? { ...param, value: 29 } : param), segment.scope).status).toBe('STALE')
    expect(calibrationStatus(stored, segment.id, { ...profile, services: ['One Way'] }, params, segment.scope).status).toBe('STALE')
    expect(calibrationStatus(null, segment.id, profile, params, segment.scope).status).toBe('NOT_REVIEWED')
    expect(calibrationFingerprint(segment.id, profile, [...params].reverse())).toBe(stored.fingerprint)
  })

  it('requires dated, nonempty source references', () => {
    expect(SaveCostBaseCalibrationSchema.safeParse({ sources: [{ groupId: 'BORDER', source: 'a', asOf: '2026-09-01' }] }).success).toBe(false)
    expect(SaveCostBaseCalibrationSchema.safeParse({ sources: [{ groupId: 'BORDER', source: 'Crossing invoices', asOf: 'not-a-date' }] }).success).toBe(false)
    expect(SaveCostBaseCalibrationSchema.safeParse({ sources: [{ groupId: 'BORDER', source: 'Crossing invoices', asOf: '2026-09-01' }] }).success).toBe(true)
  })
})
