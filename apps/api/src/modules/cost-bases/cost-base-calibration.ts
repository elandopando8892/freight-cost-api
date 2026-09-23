import { createHash } from 'node:crypto'
import type { CostBaseScope } from '@prisma/client'
import { z } from 'zod'
import { PARAMETER_DEFINITIONS } from '../../data/parameter-catalog.js'
import { parameterApplicability } from './cost-base-applicability.js'
import type { CostBaseProfile } from './cost-base-profile.js'
import { OperationalSegmentSchema, type OperationalSegment } from './operational-segments.js'

export const CALIBRATION_CHECKLIST_VERSION = 'FCM_SEGMENT_CALIBRATION_V1'

const GROUPS = [
  { id: 'FLEET_ASSETS', label: 'Flota, activos y seguros', sections: ['GENERAL_BASE', 'COST_CAPITAL', 'COST_INSURANCE'] },
  { id: 'FUEL_MAINTENANCE', label: 'Combustible, mantenimiento y llantas', sections: ['FUEL', 'COST_MAINT', 'COST_TIRES'] },
  { id: 'LABOR_OVERHEAD', label: 'Operadores, nómina y estructura', sections: ['LABOR', 'COST_PAYROLL', 'COST_COMPANY'] },
  { id: 'ROUTE_CYCLE', label: 'Ciclo, reposicionamiento y equipo', sections: ['UTILIZATION', 'CONFIG'] },
  { id: 'FINANCE_MARGIN', label: 'Financiamiento y margen', sections: ['FINANCE', 'TECHNICAL_MARGIN'] },
  { id: 'BORDER', label: 'Cruce y cumplimiento fronterizo', sections: ['BORDER', 'COST_CROSSBORDER'] },
  { id: 'RISK', label: 'Riesgos aplicables', sections: ['RISK'] },
] as const

export const CalibrationSourceSchema = z.object({
  groupId: z.string().min(1),
  source: z.string().trim().min(4).max(240),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Fecha inválida'),
  note: z.string().trim().max(500).optional(),
}).strict()

export const SaveCostBaseCalibrationSchema = z.object({
  sources: z.array(CalibrationSourceSchema).min(1).max(GROUPS.length),
}).strict()
export type SaveCostBaseCalibrationInput = z.infer<typeof SaveCostBaseCalibrationSchema>

const StoredCalibrationSchema = z.object({
  checklistVersion: z.literal(CALIBRATION_CHECKLIST_VERSION),
  segment: OperationalSegmentSchema,
  fingerprint: z.string().length(64),
  reviewedAt: z.string().datetime(),
  reviewedBy: z.string().min(1),
  sources: z.array(CalibrationSourceSchema),
}).strict()
export type StoredCalibration = z.infer<typeof StoredCalibrationSchema>

type Param = { section: string; field: string; value: number }

export function calibrationChecklist(scope: CostBaseScope, profile: CostBaseProfile, params: readonly Param[]) {
  const actual = new Map(params.map(param => [`${param.section}__${param.field}`, param.value]))
  const relevant = PARAMETER_DEFINITIONS.map(definition => ({
    definition,
    decision: parameterApplicability(scope, definition, profile),
    value: actual.get(`${definition.section}__${definition.field}`),
  }))
  const groups = GROUPS.map(group => ({
    id: group.id,
    label: group.label,
    fields: relevant.filter(item => (group.sections as readonly string[]).includes(item.definition.section)
      && ['REQUIRED', 'CONDITIONAL'].includes(item.decision.applicability)).map(item => ({
      section: item.definition.section,
      field: item.definition.field,
      value: item.value ?? null,
      unit: item.definition.unit,
      recommended: item.definition.defaultValue,
      applicability: item.decision.applicability,
    })),
  })).filter(group => group.fields.length > 0)
  const withoutMath = relevant.filter(item => item.decision.applicability === 'NOT_IMPLEMENTED').map(item => ({
    section: item.definition.section,
    field: item.definition.field,
  }))
  return { groups, withoutMath }
}

export function calibrationFingerprint(segment: OperationalSegment, profile: CostBaseProfile, params: readonly Param[]) {
  const canonical = params.map(({ section, field, value }) => ({ section, field, value }))
    .sort((a, b) => a.section.localeCompare(b.section) || a.field.localeCompare(b.field))
  return createHash('sha256').update(JSON.stringify({ segment, profile, params: canonical })).digest('hex')
}

export function readStoredCalibration(value: unknown): StoredCalibration | null {
  const result = StoredCalibrationSchema.safeParse(value)
  return result.success ? result.data : null
}

export function calibrationStatus(
  stored: unknown,
  segment: OperationalSegment,
  profile: CostBaseProfile,
  params: readonly Param[],
  scope: CostBaseScope,
) {
  const checklist = calibrationChecklist(scope, profile, params)
  const evidence = readStoredCalibration(stored)
  const validSources = evidence && evidence.sources.length === checklist.groups.length
    && checklist.groups.every(group => evidence.sources.some(source => source.groupId === group.id))
  const status = stored == null ? 'NOT_REVIEWED'
    : !evidence ? 'STALE'
    : evidence.segment !== segment || !validSources
      || evidence.fingerprint !== calibrationFingerprint(segment, profile, params)
      ? 'STALE' : 'CURRENT'
  return { status, evidence, ...checklist }
}
