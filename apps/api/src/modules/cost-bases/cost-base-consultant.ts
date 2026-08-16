import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import type { CostBaseScope } from '@prisma/client'
import { env } from '../../config/env.js'
import { PARAMETER_DEFINITIONS } from '../../data/parameter-catalog.js'
import { applicabilitySummary, isParameterApplicable, parameterApplicability } from './cost-base-applicability.js'
import { defaultCostBaseProfile, parseCostBaseProfile, profileConsistencyIssues } from './cost-base-profile.js'
import { assumptionSetCrossFieldIssues, assumptionValueDomainIssue } from '../assumptions/assumption-domain.js'
import {
  ConsultantModelOutputSchema,
  type ConsultantModelOutput,
  type CostBaseConsultantDraft,
  type CostBaseConsultantInput,
} from './cost-base-consultant.schema.js'

export type ConsultantIssue = {
  severity: 'BLOCKER' | 'WARNING' | 'INFO'
  field: string
  message: string
}

const definitionByKey = new Map(PARAMETER_DEFINITIONS.map((definition) => [
  `${definition.section}__${definition.field}`,
  definition,
]))

const SCOPE_LABEL: Record<CostBaseScope, string> = {
  CROSS_BORDER: 'D2D cross-border',
  DRAYAGE: 'drayage',
  LOCAL: 'local',
  INTRA_MEX: 'FTL intra-México',
  INTRA_US: 'FTL intra-EE. UU.',
}

function nextDeterministicQuestion(draft: CostBaseConsultantDraft) {
  if (!draft.scope) return '¿Qué operación gobernará esta base: D2D cross-border, drayage, local, intra-México o intra-EE. UU.?'
  if (!draft.name?.trim()) return '¿Qué nombre reconocerá tu equipo para esta base?'
  if (!draft.code?.trim()) return '¿Qué código corto quieres usar para identificarla?'
  if (!draft.applicabilityProfile) return '¿Qué equipo, configuración y servicios debe cubrir esta base?'
  if (draft.assumptionOverrides.length === 0) {
    return '¿Qué valores propios ya conoces (por ejemplo flota, combustible, operador o tipo de cambio) y cuáles prefieres dejar con el recomendado?'
  }
  return '¿Quieres revisar otra cifra o confirmas que podemos crear el borrador para revisarlo antes de publicar?'
}

export function evaluateCostBaseDraft(draft: CostBaseConsultantDraft): ConsultantIssue[] {
  const issues: ConsultantIssue[] = []
  if (!draft.scope) issues.push({ severity: 'BLOCKER', field: 'scope', message: 'Define el tipo de operación que gobernará la base.' })
  if (!draft.name || draft.name.trim().length < 2) issues.push({ severity: 'BLOCKER', field: 'name', message: 'El nombre debe tener al menos 2 caracteres.' })
  if (!draft.code || !/^[A-Za-z0-9_-]{2,32}$/.test(draft.code.trim())) issues.push({ severity: 'BLOCKER', field: 'code', message: 'El código debe tener de 2 a 32 caracteres y usar sólo letras, números, guion o guion bajo.' })

  const profile = draft.scope
    ? draft.applicabilityProfile ?? defaultCostBaseProfile(draft.scope, draft.defaultPolicy)
    : null
  if (draft.scope && profile) {
    for (const message of profileConsistencyIssues(draft.scope, profile, draft.defaultPolicy)) {
      issues.push({ severity: 'BLOCKER', field: 'applicabilityProfile', message })
    }
  }

  const seen = new Set<string>()
  for (const override of draft.assumptionOverrides) {
    const key = `${override.section}__${override.field}`
    const definition = definitionByKey.get(key)
    if (!definition) {
      issues.push({ severity: 'BLOCKER', field: key, message: `${override.field} no pertenece al catálogo canónico.` })
      continue
    }
    if (seen.has(key)) issues.push({ severity: 'BLOCKER', field: key, message: `${override.field} fue capturado más de una vez.` })
    seen.add(key)
    const domainIssue = assumptionValueDomainIssue(override)
    if (domainIssue) issues.push({ severity: 'BLOCKER', field: key, message: domainIssue })
    if (draft.scope && !isParameterApplicable(draft.scope, definition, profile)) {
      issues.push({ severity: 'BLOCKER', field: key, message: `${override.field} no aplica para ${SCOPE_LABEL[draft.scope]}.` })
    }
    if (!domainIssue && (override.value < definition.low || override.value > definition.high)) {
      issues.push({
        severity: 'WARNING',
        field: key,
        message: `${override.field} está fuera del rango recomendado ${definition.low}–${definition.high} ${definition.unit}; requiere confirmación humana.`,
      })
    }
  }

  const overridesByKey = new Map(draft.assumptionOverrides.map((override) => [
    `${override.section}__${override.field}`,
    override.value,
  ]))
  const effectiveValues = PARAMETER_DEFINITIONS.map((definition) => ({
    section: definition.section,
    field: definition.field,
    value: overridesByKey.get(`${definition.section}__${definition.field}`) ?? definition.defaultValue,
  }))
  for (const message of assumptionSetCrossFieldIssues(effectiveValues, draft.scope)) {
    issues.push({ severity: 'BLOCKER', field: 'assumptionOverrides', message })
  }

  if (draft.scope === 'CROSS_BORDER') {
    issues.push({ severity: 'INFO', field: 'scope', message: 'Border y COST_CROSSBORDER aplican y deben revisarse antes de publicar.' })
  } else if (draft.scope && draft.defaultPolicy === 'WORKBOOK_V3') {
    issues.push({
      severity: 'WARNING',
      field: 'defaultPolicy',
      message: 'WORKBOOK_V3 conserva dependencias históricas de combustible y costos cross-border en ciertas rutas domésticas. Usa OPERATIONAL_V3 para aislamiento por modalidad.',
    })
  } else if (draft.scope) {
    issues.push({ severity: 'INFO', field: 'scope', message: 'Border y COST_CROSSBORDER se conservarán en el snapshot canónico, pero quedarán fuera del cálculo y de los campos requeridos.' })
  }
  if (draft.assumptionOverrides.length === 0) {
    issues.push({ severity: 'WARNING', field: 'assumptionOverrides', message: 'Aún no hay valores propios confirmados; la versión iniciará con recomendados V3.0.' })
  }
  return issues
}

function mergeModelPatch(draft: CostBaseConsultantDraft, output: ConsultantModelOutput) {
  const patch = output.patch
  const scope = patch.scope ?? draft.scope
  const defaultPolicy = patch.defaultPolicy ?? draft.defaultPolicy
  const changedGovernance = scope !== draft.scope || defaultPolicy !== draft.defaultPolicy
  let applicabilityProfile = patch.applicabilityProfile ?? (changedGovernance ? null : draft.applicabilityProfile)
  if (scope) {
    applicabilityProfile = applicabilityProfile
      ? parseCostBaseProfile(scope, applicabilityProfile, defaultPolicy)
      : defaultCostBaseProfile(scope, defaultPolicy)
  }
  const merged: CostBaseConsultantDraft = {
    ...draft,
    scope,
    code: patch.code?.trim().toUpperCase() || draft.code,
    name: patch.name?.trim() || draft.name,
    description: patch.description?.trim() || draft.description,
    defaultPolicy,
    currency: patch.currency?.trim().length === 3 ? patch.currency.trim().toUpperCase() : draft.currency,
    isDefault: patch.isDefault ?? draft.isDefault,
    applicabilityProfile,
    assumptionOverrides: [...draft.assumptionOverrides],
  }
  const byKey = new Map(merged.assumptionOverrides.map((override) => [`${override.section}__${override.field}`, override]))
  for (const override of output.assumptionOverrides) {
    const definition = definitionByKey.get(`${override.section}__${override.field}`)
    if (!definition || (merged.scope && !isParameterApplicable(merged.scope, definition, merged.applicabilityProfile))) continue
    byKey.set(`${override.section}__${override.field}`, override)
  }
  merged.assumptionOverrides = [...byKey.values()]
  return merged
}

function relevantCatalog(scope: CostBaseScope | null, profile: CostBaseConsultantDraft['applicabilityProfile']) {
  return PARAMETER_DEFINITIONS
    .filter((definition) => {
      if (!scope) return true
      const status = parameterApplicability(scope, definition, profile).applicability
      return status !== 'NOT_APPLICABLE' && status !== 'NOT_IMPLEMENTED'
    })
    .filter((definition) => (
      ['GENERAL_BASE', 'FUEL', 'LABOR', 'FINANCE', 'BORDER'].includes(definition.section) ||
      ['COST_INSURANCE', 'COST_CAPITAL', 'COST_CROSSBORDER'].includes(definition.section)
    ))
    .slice(0, 60)
    .map(({ section, field, unit, low, high, defaultValue }) => ({ section, field, unit, low, high, recommended: defaultValue }))
}

export function buildCostBaseConsultantRequest(input: CostBaseConsultantInput) {
  return {
    model: env.OPENAI_MODEL,
    store: false,
    max_output_tokens: 1_000,
    metadata: { product: 'freight_cost_model', mode: 'cost_base_consultant', supervised: 'true' },
    text: { format: zodTextFormat(ConsultantModelOutputSchema, 'cost_base_consultation') },
    instructions: [
      'Eres un consultor senior de costos de transporte para Freight Cost Model. Responde en español claro y breve.',
      'Ayudas a construir una base de costos, pero nunca la guardas, publicas ni activas. Una persona confirma el borrador final.',
      'No inventes cifras. Sólo agrega assumptionOverrides cuando el usuario haya proporcionado explícitamente el valor y puedas mapearlo exactamente al catálogo permitido.',
      'Si el usuario expresa incertidumbre, conserva el campo sin cambio y pregunta. Los valores recomendados son referencias, no hechos del carrier.',
      'D2D cross-border corresponde a CROSS_BORDER. FTL dentro de México corresponde a INTRA_MEX. FTL dentro de EE. UU. corresponde a INTRA_US.',
      'Bajo OPERATIONAL_V3, Border y COST_CROSSBORDER sólo aplican a CROSS_BORDER. WORKBOOK_V3 conserva algunas dependencias históricas y debes advertirlo, no ocultarlo.',
      'El perfil estructurado es obligatorio: conserva scope, calculationPolicy, factorScheduleVersion, countries, operations, truckTypes, driverTypes, trailerTypes, configurations, services, ownershipModels y costAllocationModel coherentes.',
      'Para bases sólo México usa driverTypes B1/Licencia E; para bases sólo EE. UU. usa Interstate/Intrastate/CDL; CROSS_BORDER puede combinar ambas familias.',
      'El motor gobernado actual sólo soporta OWNED_FINANCED y Truck Trailer. No sugieras LEASED, BROKERED ni vehículos menores como si ya tuvieran costeo de activos completo.',
      'Detecta contradicciones entre operación, geografía, moneda y supuestos. Explica la contradicción y formula una sola siguiente pregunta.',
      'No pidas ni repitas secretos, credenciales ni datos personales innecesarios.',
      'Todo patch debe reflejar información explícita del usuario; usa null para lo que no cambie.',
    ].join('\n'),
    input: [{
      role: 'user' as const,
      content: JSON.stringify({
        currentDraft: input.draft,
        recentConversation: input.messages.slice(-6),
        latestAnswer: input.message,
        allowedHighImpactParameters: relevantCatalog(
          input.draft.scope,
          input.draft.scope
            ? input.draft.applicabilityProfile ?? defaultCostBaseProfile(input.draft.scope, input.draft.defaultPolicy)
            : null,
        ),
      }),
    }],
  }
}

export async function consultCostBase(input: CostBaseConsultantInput) {
  let draft = input.draft
  let reply = 'Conservaré tus datos actuales y revisaré la coherencia con reglas del producto.'
  let nextQuestion = nextDeterministicQuestion(draft)
  let model: string | null = null
  let mode: 'AI_ASSISTED' | 'RULES_ONLY' = 'RULES_ONLY'
  let providerConcerns: string[] = []

  if (env.OPENAI_API_KEY && env.OPENAI_MODEL.trim()) {
    try {
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 20_000, maxRetries: 1 })
      const response = await client.responses.parse(buildCostBaseConsultantRequest(input))
      if (response.output_parsed) {
        draft = mergeModelPatch(draft, response.output_parsed)
        reply = response.output_parsed.reply
        nextQuestion = response.output_parsed.nextQuestion
        providerConcerns = response.output_parsed.concerns
        model = env.OPENAI_MODEL
        mode = 'AI_ASSISTED'
      }
    } catch {
      // Fail open to deterministic guidance. The wizard can still create a
      // coherent draft without making AI availability a business dependency.
    }
  }

  const issues = evaluateCostBaseDraft(draft)
  return {
    reply,
    nextQuestion: nextQuestion || nextDeterministicQuestion(draft),
    draft,
    issues,
    providerConcerns,
    readiness: {
      ready: !issues.some((issue) => issue.severity === 'BLOCKER'),
      blockers: issues.filter((issue) => issue.severity === 'BLOCKER').length,
      warnings: issues.filter((issue) => issue.severity === 'WARNING').length,
    },
    applicability: draft.scope
      ? applicabilitySummary(
          draft.scope,
          undefined,
          draft.applicabilityProfile ?? defaultCostBaseProfile(draft.scope, draft.defaultPolicy),
        )
      : null,
    model,
    mode,
    requiresHumanConfirmation: true as const,
    dataPolicy: 'STORE_FALSE_NO_TOOLS' as const,
  }
}
