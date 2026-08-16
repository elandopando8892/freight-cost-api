'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bot, CheckCircle2, LockKeyhole, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetcher } from '@/lib/fetcher'
import {
  availableConfigurations,
  availableDrivers,
  availableServices,
  availableTrailers,
  defaultProfile,
  profileConsistencyMessages,
  profileForPolicy,
  toggleProfileValue,
  type ApplicabilitySummary,
  type CostBaseConfiguration,
  type CostBaseDriver,
  type CostBaseProfile,
  type CostBaseScope,
  type CostBaseService,
  type CostBaseTrailer,
  type Policy,
} from './cost-base-profile'

export type { CostBaseScope } from './cost-base-profile'
type Section = 'GENERAL_BASE' | 'FUEL' | 'LABOR' | 'FINANCE' | 'UTILIZATION' | 'BORDER' | 'RISK' | 'CONFIG' | 'TECHNICAL_MARGIN' | 'FACTORS' | 'COST_MAINT' | 'COST_TIRES' | 'COST_INSURANCE' | 'COST_PAYROLL' | 'COST_COMPANY' | 'COST_CAPITAL' | 'COST_CROSSBORDER'

type AssumptionOverride = { section: Section; field: string; value: number }

export type CostBaseCreateBody = {
  code: string
  name: string
  description?: string
  scope: CostBaseScope
  defaultPolicy: Policy
  currency: string
  isDefault: boolean
  setupMode: 'RECOMMENDED_TEMPLATE' | 'CONSULTANT_WIZARD' | 'MANUAL'
  presetId?: string
  applicabilityProfile: CostBaseProfile
  assumptionOverrides: AssumptionOverride[]
}

type Draft = {
  scope: CostBaseScope | null
  code: string | null
  name: string | null
  description: string | null
  defaultPolicy: Policy
  currency: string
  isDefault: boolean
  applicabilityProfile: CostBaseProfile | null
  assumptionOverrides: AssumptionOverride[]
}

type Message = { role: 'user' | 'assistant'; content: string }
type Issue = { severity: 'BLOCKER' | 'WARNING' | 'INFO'; field: string; message: string }

type ConsultantResult = {
  reply: string
  nextQuestion: string
  draft: Draft
  issues: Issue[]
  providerConcerns: string[]
  readiness: { ready: boolean; blockers: number; warnings: number }
  applicability: ApplicabilitySummary | null
  mode: 'AI_ASSISTED' | 'RULES_ONLY'
  model: string | null
  requiresHumanConfirmation: true
  dataPolicy: 'STORE_FALSE_NO_TOOLS'
}

type RecommendedPreset = {
  id: string
  version: string
  label: string
  name: string
  code: string
  description: string
  scope: CostBaseScope
  defaultPolicy: Policy
  currency: string
  isDefault: boolean
  applicabilityProfile: CostBaseProfile
  assumptionOverrides: AssumptionOverride[]
  rationale: string[]
  applicability: NonNullable<ConsultantResult['applicability']>
}

const SCOPE: { value: CostBaseScope; label: string; description: string }[] = [
  { value: 'CROSS_BORDER', label: 'D2D Cross-border', description: 'Origen y destino en países distintos; Border sí aplica.' },
  { value: 'INTRA_MEX', label: 'FTL Intra-México', description: 'Movimiento doméstico en México; Border no aplica.' },
  { value: 'INTRA_US', label: 'FTL Intra-EE. UU.', description: 'Movimiento doméstico en EE. UU.; Border no aplica.' },
  { value: 'DRAYAGE', label: 'Drayage', description: 'Ciclo portuario/intermodal; no se trata como D2D fronterizo.' },
  { value: 'LOCAL', label: 'Local', description: 'Operación corta doméstica; Border no aplica.' },
]

const OPERATION_FACTOR: Record<CostBaseProfile['operations'][number], number> = {
  'D2D Export': 1.15, 'D2D Import': 0.85, Drayage: 1.15, Local: 1,
  'Intra-Mex': 1, 'MX Northbound': 1, 'MX Southbound': 0.7,
  'Intra-US': 1, 'US Northbound': 1, 'US Southbound': 1,
}
const LANE_FACTOR = {
  'Mayormente recta': 1,
  Mixta: 1.1,
  'Mayormente sinuosa': 1.2,
  'Recta con riesgo': 1.05,
  'Mixta con riesgo': 1.2,
  'Sinuosa con riesgo': 1.3,
} as const
const TRAILER_FACTOR: Record<CostBaseTrailer, number> = {
  'Dry Van': 1, Flatbed: 1.3, Reefer: 1.5, Hazmat: 1.2,
  Chassis: 1.15, 'Power Only': 0.8, Overdim: 1.8,
}
const SERVICE_FACTOR: Record<CostBaseService, number> = {
  'One Way': 1, Roundtrip: 1.6, Backhaul: 0.6, Expedited: 1.4,
}
const DRIVER_FACTOR: Record<CostBaseProfile['driverTypes'][number], number> = {
  B1: 1.15, 'Licencia E': 1.35, Interstate: 1, Intrastate: 0.9, CDL: 1,
}

const selectCls = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm'
const BASE_CODE_PATTERN = /^[A-Za-z0-9_-]{2,32}$/

function initialDraft(initialScope: CostBaseScope): Draft {
  return {
    scope: initialScope,
    code: null,
    name: null,
    description: null,
    defaultPolicy: 'OPERATIONAL_V3',
    currency: 'USD',
    isDefault: true,
    applicabilityProfile: defaultProfile(initialScope),
    assumptionOverrides: [],
  }
}

function localBlockers(draft: Draft) {
  let count = 0
  if (!draft.scope) count += 1
  if (!draft.name || draft.name.trim().length < 2) count += 1
  if (!draft.code || !BASE_CODE_PATTERN.test(draft.code.trim())) count += 1
  count += profileConsistencyMessages(draft.applicabilityProfile, draft.scope, draft.defaultPolicy).length
  return count
}

function nextAvailableCode(preferred: string, existingCodes: readonly string[]) {
  const occupied = new Set(existingCodes.map((code) => code.trim().toUpperCase()))
  const normalized = preferred.trim().toUpperCase().slice(0, 32)
  if (!occupied.has(normalized)) return normalized
  for (let index = 2; index < 10_000; index += 1) {
    const suffix = `-${index}`
    const candidate = `${normalized.slice(0, 32 - suffix.length)}${suffix}`
    if (!occupied.has(candidate)) return candidate
  }
  return `${normalized.slice(0, 23)}-${Date.now().toString().slice(-8)}`
}

export function CostBaseWizard({ initialScope, existingCodes, pending, onSubmit }: {
  initialScope: CostBaseScope
  existingCodes: string[]
  pending: boolean
  onSubmit: (body: CostBaseCreateBody) => void
}) {
  const [mode, setMode] = useState<'WIZARD' | 'MANUAL'>('WIZARD')
  const [draft, setDraft] = useState<Draft>(() => initialDraft(initialScope))
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Vamos a construir una base coherente. Primero confirma el tipo de operación; con eso decidiré qué supuestos aplican y cuáles deben quedar fuera.',
  }])
  const [answer, setAnswer] = useState('')
  const [consultError, setConsultError] = useState<string | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [applicability, setApplicability] = useState<ConsultantResult['applicability']>(null)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [touchedFields, setTouchedFields] = useState({ code: false, name: false })
  const presets = useQuery({
    queryKey: ['cost-base-presets'],
    queryFn: () => fetcher<RecommendedPreset[]>('/api/v1/cost-bases/presets'),
    staleTime: 60 * 60 * 1_000,
  })
  const serverBlockers = issues.filter((issue) => issue.severity === 'BLOCKER' && !['scope', 'code', 'name'].includes(issue.field)).length
  const blockers = localBlockers(draft) + serverBlockers
  const selectedScope = SCOPE.find((item) => item.value === draft.scope)
  const profile = draft.applicabilityProfile
  const profileErrors = profileConsistencyMessages(profile, draft.scope, draft.defaultPolicy)
  const codeError = !draft.code?.trim()
    ? 'Ingresa un código para identificar la base.'
    : !BASE_CODE_PATTERN.test(draft.code.trim())
      ? 'Usa de 2 a 32 caracteres: letras, números, guion o guion bajo.'
      : null
  const nameError = !draft.name?.trim() || draft.name.trim().length < 2
    ? 'Ingresa un nombre de al menos 2 caracteres.'
    : null
  const showCodeError = touchedFields.code && Boolean(codeError)
  const showNameError = touchedFields.name && Boolean(nameError)
  const canCreate = blockers === 0
  const selectedPreset = presets.data?.find((preset) => preset.id === selectedPresetId) ?? null
  const applicabilityPreview = useQuery({
    queryKey: ['cost-base-applicability-preview', draft.scope, JSON.stringify(profile)],
    queryFn: () => fetcher<ApplicabilitySummary>('/api/v1/cost-bases/applicability-preview', {
      method: 'POST',
      json: { scope: draft.scope, applicabilityProfile: profile },
    }),
    enabled: Boolean(draft.scope && profile && profileErrors.length === 0),
    staleTime: 5 * 60 * 1_000,
  })
  const shownApplicability = applicabilityPreview.data ?? applicability

  const consult = useMutation({
    mutationFn: (message: string) => fetcher<ConsultantResult>('/api/v1/cost-bases/consult', {
      method: 'POST',
      json: { message, draft, messages: messages.slice(-10) },
    }),
    onMutate: () => setConsultError(null),
    onSuccess: (result, message) => {
      if (selectedPreset?.scope !== result.draft.scope) setSelectedPresetId(null)
      const resultScope = result.draft.scope ?? initialScope
      setDraft({
        ...result.draft,
        applicabilityProfile: result.draft.applicabilityProfile ?? defaultProfile(resultScope, result.draft.defaultPolicy),
      })
      setIssues(result.issues)
      setApplicability(result.applicability)
      setMessages((items) => [
        ...items,
        { role: 'user', content: message },
        { role: 'assistant', content: `${result.reply}\n\n${result.nextQuestion}` },
      ].slice(-10) as Message[])
      setAnswer('')
      if (result.mode === 'RULES_ONLY') toast.info('La IA no respondió; continuamos con las reglas de coherencia del producto.')
    },
    onError: (error) => {
      setConsultError(error instanceof Error ? error.message : 'No fue posible consultar al asistente.')
    },
  })

  const updateScope = (scope: CostBaseScope) => {
    if (selectedPreset?.scope !== scope) setSelectedPresetId(null)
    if (draft.scope !== scope && draft.assumptionOverrides.length > 0) {
      toast.info('Se retiraron los valores propios del alcance anterior para evitar combinaciones incompatibles.')
    }
    setDraft((current) => ({
      ...current,
      scope,
      applicabilityProfile: defaultProfile(scope, current.defaultPolicy),
      assumptionOverrides: current.scope === scope ? current.assumptionOverrides : [],
    }))
    setApplicability(null)
    setIssues([])
    setMessages((items) => [...items, {
      role: 'assistant',
      content: scope === 'CROSS_BORDER'
        ? 'Entendido: es D2D cross-border. Border y COST_CROSSBORDER formarán parte de la revisión obligatoria.'
        : `Entendido: ${SCOPE.find((item) => item.value === scope)?.label}. Border queda fuera. COST_CROSSBORDER también queda fuera en Operacional V3; Workbook exacto conserva su dependencia histórica y la señalará explícitamente.`,
    }].slice(-10) as Message[])
  }

  const updatePolicy = (policy: Policy) => {
    if (draft.defaultPolicy !== policy && draft.assumptionOverrides.length > 0) {
      toast.info('Se retiraron los valores propios del modelo anterior; el consultor puede volver a capturarlos con la política seleccionada.')
    }
    setDraft((current) => ({
      ...current,
      defaultPolicy: policy,
      applicabilityProfile: current.applicabilityProfile
        ? profileForPolicy(current.applicabilityProfile, policy)
        : current.scope ? defaultProfile(current.scope, policy) : null,
      assumptionOverrides: current.defaultPolicy === policy ? current.assumptionOverrides : [],
    }))
    setApplicability(null)
    setIssues([])
  }

  const updateProfile = (updater: (current: CostBaseProfile) => CostBaseProfile) => {
    setDraft((current) => ({
      ...current,
      applicabilityProfile: current.applicabilityProfile
        ? updater(current.applicabilityProfile)
        : current.scope ? updater(defaultProfile(current.scope, current.defaultPolicy)) : null,
    }))
    setApplicability(null)
    setIssues([])
  }

  const toggleTrailer = (trailer: CostBaseTrailer) => {
    updateProfile((current) => ({
      ...current,
      trailerTypes: toggleProfileValue(current.trailerTypes, trailer),
    }))
  }

  const toggleConfiguration = (configuration: CostBaseConfiguration) => {
    updateProfile((current) => ({
      ...current,
      configurations: toggleProfileValue(current.configurations, configuration),
    }))
  }

  const toggleService = (service: CostBaseService) => {
    updateProfile((current) => ({
      ...current,
      services: toggleProfileValue(current.services, service),
    }))
  }

  const toggleDriver = (driver: CostBaseDriver) => {
    updateProfile((current) => ({
      ...current,
      driverTypes: toggleProfileValue(current.driverTypes, driver),
    }))
  }

  const applyPreset = (preset: RecommendedPreset) => {
    setSelectedPresetId(preset.id)
    setDraft({
      scope: preset.scope,
      code: nextAvailableCode(preset.code, existingCodes),
      name: preset.name,
      description: preset.description,
      defaultPolicy: preset.defaultPolicy,
      currency: preset.currency,
      isDefault: preset.isDefault,
      applicabilityProfile: preset.applicabilityProfile,
      assumptionOverrides: preset.assumptionOverrides,
    })
    setApplicability(preset.applicability)
    setIssues([])
    setTouchedFields({ code: false, name: false })
    setMessages((items) => [...items, {
      role: 'assistant',
      content: `Cargué el estándar ${preset.label}. Es un borrador editable con los valores recomendados V3.0; ahora confirma qué debe adaptarse a tu operación real.`,
    }].slice(-10) as Message[])
  }

  const submitConsultation = (event: React.FormEvent) => {
    event.preventDefault()
    const message = answer.trim()
    if (message.length < 2 || consult.isPending) return
    consult.mutate(message)
  }

  const submitBase = () => {
    if (!draft.scope || !draft.code || !draft.name || !draft.applicabilityProfile || !canCreate) return
    onSubmit({
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
      description: draft.description?.trim() || undefined,
      scope: draft.scope,
      defaultPolicy: draft.defaultPolicy,
      currency: draft.currency,
      isDefault: draft.isDefault,
      setupMode: selectedPresetId ? 'RECOMMENDED_TEMPLATE' : mode === 'WIZARD' ? 'CONSULTANT_WIZARD' : 'MANUAL',
      presetId: selectedPresetId ?? undefined,
      applicabilityProfile: draft.applicabilityProfile,
      assumptionOverrides: draft.assumptionOverrides,
    })
  }

  const groupedIssues = {
    blocker: issues.filter((issue) => issue.severity === 'BLOCKER'),
    warning: issues.filter((issue) => issue.severity === 'WARNING'),
  }

  return (
    <Card className="overflow-hidden border-primary/30 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="size-5" /></span>
            <div>
              <CardTitle>Construir una base de costo</CardTitle>
              <CardDescription>El consultor recopila el contexto, detecta contradicciones y prepara un borrador. Tú confirmas antes de crearlo.</CardDescription>
            </div>
          </div>
          <div className="flex rounded-md border bg-background p-0.5 text-xs">
            <button type="button" onClick={() => setMode('WIZARD')} aria-pressed={mode === 'WIZARD'} className={`rounded px-3 py-1.5 ${mode === 'WIZARD' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Asistente guiado</button>
            <button type="button" onClick={() => setMode('MANUAL')} aria-pressed={mode === 'MANUAL'} className={`rounded px-3 py-1.5 ${mode === 'MANUAL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Formulario rápido</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <section className="border-b p-4" aria-labelledby="cost-base-presets-title">
          <div>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Inicio rápido</p><p id="cost-base-presets-title" className="text-sm font-medium">Estándares recomendados</p></div>
              <span className="text-[10px] text-muted-foreground">Editables antes de crear</span>
            </div>
            {presets.isPending ? <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">Cargando estándares…</div> : presets.isError ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">No fue posible cargar los estándares. Puedes continuar con el asistente o el formulario manual.</div> : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-label="Estándares recomendados de bases de costo">
                {presets.data?.map((preset) => {
                  const selected = selectedPresetId === preset.id
                  return <button key={preset.id} type="button" aria-pressed={selected} onClick={() => applyPreset(preset)} className={`min-w-0 rounded-lg border p-3 text-left transition-colors ${selected ? 'border-primary bg-primary/8 shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-muted/40'}`}><span className="flex items-center justify-between gap-2 text-sm font-medium">{preset.label}{selected ? <CheckCircle2 className="size-4 shrink-0 text-primary" /> : null}</span><span className="mt-1 block text-[11px] text-muted-foreground">{preset.applicability.counts.REQUIRED} requeridos · {preset.applicability.counts.CONDITIONAL} condicionales</span><span className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]"><span className="rounded-full bg-muted px-1.5 py-0.5">{preset.currency}</span><span className={`rounded-full px-1.5 py-0.5 ${preset.applicability.border === 'REQUIRED' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}>Border: {preset.applicability.border === 'REQUIRED' ? 'requerido' : 'no aplica'}</span></span></button>
                })}
              </div>
            )}
          </div>
        </section>

        <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
        <div className="grid min-w-0 content-start gap-4 border-b p-4 lg:border-b-0 lg:border-r">

          <div className="border-t pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">1. Tipo de operación</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCOPE.map((item) => {
                const selected = draft.scope === item.value
                return <button key={item.value} type="button" aria-pressed={selected} onClick={() => updateScope(item.value)} className={`rounded-lg border p-3 text-left transition-colors ${selected ? 'border-primary bg-primary/8 shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-muted/40'}`}><span className="flex items-center justify-between gap-2 text-sm font-medium">{item.label}{selected ? <CheckCircle2 className="size-4 text-primary" /> : null}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.description}</span></button>
              })}
            </div>
          </div>

          {mode === 'WIZARD' ? (
            <div className="grid min-h-64 overflow-hidden rounded-lg border bg-muted/15">
              <div className="flex items-center gap-2 border-b bg-background px-3 py-2 text-xs font-medium"><Bot className="size-4 text-primary" /> Consultor de bases <span className="ml-auto font-normal text-muted-foreground">IA supervisada · sin acciones</span></div>
              <div className="grid max-h-72 gap-3 overflow-y-auto p-3" aria-live="polite">
                {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[92%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed ${message.role === 'assistant' ? 'bg-background shadow-sm ring-1 ring-border' : 'ml-auto bg-primary text-primary-foreground'}`}>{message.content}</div>)}
                {consult.isPending ? <div className="max-w-[92%] rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm ring-1 ring-border">Revisando coherencia…</div> : null}
                {consultError ? (
                  <div className="grid max-w-[92%] gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs" role="alert">
                    <p><strong>No se pudo consultar la IA.</strong> Tu borrador y respuesta siguen intactos. {consultError}</p>
                    <Button type="button" variant="outline" size="xs" className="w-fit" disabled={consult.isPending || answer.trim().length < 2} onClick={() => consult.mutate(answer.trim())}>Reintentar</Button>
                  </div>
                ) : null}
              </div>
              <form onSubmit={submitConsultation} className="flex gap-2 border-t bg-background p-3">
                <Input value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={1_200} placeholder="Ej. Es FTL sólo dentro de México; tenemos 35 tractos y usamos MXN…" aria-label="Responder al consultor" />
                <Button type="submit" disabled={consult.isPending || answer.trim().length < 2}><MessageCircle className="mr-1 size-4" /> Enviar</Button>
              </form>
            </div>
          ) : <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">Modo manual activo. Las mismas reglas deterministas evitarán mezclar Border con una operación doméstica.</div>}
        </div>

        <div className="grid min-w-0 content-start gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">2. Borrador estructurado</p><p className="text-sm font-medium">{selectedScope?.label ?? 'Selecciona el alcance'}</p>{selectedPreset ? <p className="mt-0.5 text-[10px] text-primary">Basado en {selectedPreset.label} · {selectedPreset.version} · editable</p> : null}</div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${canCreate ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{canCreate ? 'Coherente para crear' : `${blockers} pendiente${blockers === 1 ? '' : 's'}`}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="wizard-base-code">Código</Label><Input id="wizard-base-code" required aria-invalid={showCodeError} aria-describedby={showCodeError ? 'wizard-base-code-error' : undefined} value={draft.code ?? ''} onBlur={() => setTouchedFields((current) => ({ ...current, code: true }))} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Ej. FTL-MX-2026" />{showCodeError ? <p id="wizard-base-code-error" className="text-[11px] text-destructive">{codeError}</p> : null}</div>
            <div className="grid gap-1.5"><Label htmlFor="wizard-base-currency">Moneda de gobierno</Label><select id="wizard-base-currency" className={selectCls} value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}><option value="USD">USD</option><option value="MXN">MXN</option></select></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="wizard-base-name">Nombre</Label><Input id="wizard-base-name" required aria-invalid={showNameError} aria-describedby={showNameError ? 'wizard-base-name-error' : undefined} value={draft.name ?? ''} onBlur={() => setTouchedFields((current) => ({ ...current, name: true }))} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. FTL Intra-México 2026" />{showNameError ? <p id="wizard-base-name-error" className="text-[11px] text-destructive">{nameError}</p> : null}</div>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="wizard-base-description">Contexto operativo</Label><textarea id="wizard-base-description" value={draft.description ?? ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} maxLength={500} rows={3} className={`${selectCls} h-auto py-2`} placeholder="Cobertura, equipo, criterios o exclusiones que debe conocer el equipo." /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="wizard-base-model">Modelo de cálculo</Label><select id="wizard-base-model" className={selectCls} value={draft.defaultPolicy} onChange={(event) => updatePolicy(event.target.value as Policy)}><option value="OPERATIONAL_V3">Operacional V3</option><option value="WORKBOOK_V3">Workbook exacto</option></select><p className="text-[11px] text-muted-foreground">La política matemática queda congelada con la base. Si más adelante necesitas otra, crea una base separada para conservar trazabilidad.</p></div>
          </div>

          {profile ? (
            <CostBaseProfileFields
              profile={profile}
              onToggleTrailer={toggleTrailer}
              onToggleConfiguration={toggleConfiguration}
              onToggleService={toggleService}
              onToggleDriver={toggleDriver}
            />
          ) : null}

          <div className={`rounded-lg border p-3 ${draft.scope === 'CROSS_BORDER' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
            <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><div><p className="text-sm font-medium">Aplicabilidad de Border: {draft.scope === 'CROSS_BORDER' ? 'Requerido' : 'No aplica'}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{draft.scope === 'CROSS_BORDER'
              ? 'El borrador conserva y exige revisar costos transaccionales, fricción y estructura cross-border.'
              : draft.defaultPolicy === 'WORKBOOK_V3'
                ? 'Border transaccional no aplica, pero Workbook exacto conserva costos fijos y dependencias históricas que la matriz identifica explícitamente.'
                : 'Los parámetros de frontera permanecen en el snapshot canónico para auditoría, pero no se piden, no se editan y no entran al cálculo operacional.'}</p>{shownApplicability ? <p className="mt-1 text-[11px] text-muted-foreground">{shownApplicability.counts.REQUIRED} requeridos · {shownApplicability.counts.CONDITIONAL} condicionales · {shownApplicability.counts.OPTIONAL} opcionales · {shownApplicability.counts.NOT_IMPLEMENTED} sin efecto matemático · {shownApplicability.counts.NOT_APPLICABLE} no aplican · {shownApplicability.catalogTotal} en snapshot</p> : applicabilityPreview.isPending ? <p className="mt-1 text-[11px] text-muted-foreground">Recalculando aplicabilidad…</p> : null}</div></div>
          </div>

          {draft.assumptionOverrides.length > 0 ? <div className="rounded-lg border"><div className="border-b px-3 py-2 text-xs font-medium">Valores propios confirmados ({draft.assumptionOverrides.length})</div><div className="grid max-h-36 gap-1 overflow-y-auto p-2">{draft.assumptionOverrides.map((item) => <div key={`${item.section}-${item.field}`} className="flex justify-between gap-3 rounded bg-muted/35 px-2 py-1.5 text-xs"><span className="truncate">{item.field}</span><strong className="tabular-nums">{item.value}</strong></div>)}</div></div> : null}

          {(groupedIssues.blocker.length > 0 || groupedIssues.warning.length > 0) ? <div className="grid gap-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">{[...groupedIssues.blocker, ...groupedIssues.warning].map((issue, index) => <p key={`${issue.field}-${index}`}><strong>{issue.severity === 'BLOCKER' ? 'Corregir:' : 'Revisar:'}</strong> {issue.message}</p>)}</div> : null}

          {profileErrors.length > 0 ? (
            <div className="grid gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs" role="alert">
              {profileErrors.map((message) => <p key={message}><strong>Corregir perfil:</strong> {message}</p>)}
            </div>
          ) : null}

          <label htmlFor="wizard-base-default" className="flex items-start gap-2 rounded-md border p-3 text-sm"><input id="wizard-base-default" type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))} className="mt-1 accent-primary" /><span><strong className="block font-medium">Predeterminada para este alcance</strong><span className="text-xs text-muted-foreground">No reemplaza bases de otros alcances.</span></span></label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p id="wizard-create-help" className="max-w-md text-xs text-muted-foreground" aria-live="polite">{canCreate ? 'Crear genera una versión 1 en borrador. La IA no publica, activa ni modifica rutas.' : `Corrige ${blockers} pendiente${blockers === 1 ? '' : 's'} señalado${blockers === 1 ? '' : 's'} arriba antes de crear.`}</p><Button type="button" aria-describedby="wizard-create-help" onClick={submitBase} disabled={pending || !canCreate}>{pending ? 'Creando borrador…' : 'Crear base y revisar supuestos'}</Button></div>
        </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CostBaseProfileFields({
  profile,
  onToggleTrailer,
  onToggleConfiguration,
  onToggleService,
  onToggleDriver,
}: {
  profile: CostBaseProfile
  onToggleTrailer: (trailer: CostBaseTrailer) => void
  onToggleConfiguration: (configuration: CostBaseConfiguration) => void
  onToggleService: (service: CostBaseService) => void
  onToggleDriver: (driver: CostBaseDriver) => void
}) {
  const trailers = availableTrailers(profile.scope)
  const configurations = availableConfigurations(profile)
  const services = availableServices(profile.scope)
  const drivers = availableDrivers(profile)

  return (
    <section className="overflow-hidden rounded-lg border" aria-labelledby="cost-base-profile-title">
      <div className="border-b bg-muted/25 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="cost-base-profile-title" className="text-sm font-medium">Perfil de aplicabilidad</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Este mismo objeto guía al consultor, valida la creación y decide qué supuestos entran al motor.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">FCM v1</span>
            <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Factores 2026.1</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-3">
        <div className="grid gap-3 rounded-md bg-muted/20 p-3 sm:grid-cols-2">
          <DerivedProfileValues label="Países derivados" values={profile.countries.map((country) => country === 'MX' ? 'México' : 'EE. UU.')} />
          <DerivedProfileValues label="Operaciones derivadas" values={profile.operations} />
          <DerivedProfileValues label="Operadores permitidos" values={profile.driverTypes} />
        </div>

        <details className="rounded-md border bg-muted/15 p-2.5 text-[11px]">
          <summary className="cursor-pointer font-medium">Coeficientes técnicos fijos y auditables</summary>
          <div className="mt-2 grid gap-1 text-muted-foreground">
            <p>Programa: <strong className="text-foreground">{profile.factorScheduleVersion}</strong>. Para cambiarlo se crea una nueva versión del contrato matemático.</p>
            <p>Geometría/riesgo: {Object.entries(LANE_FACTOR).map(([value, factor]) => `${value} ${factor.toFixed(2)}`).join(' · ')}</p>
            <p>Operación: {profile.operations.map((value) => `${value} ${OPERATION_FACTOR[value].toFixed(2)}`).join(' · ')}</p>
            <p>Remolque: {profile.trailerTypes.map((value) => `${value} ${TRAILER_FACTOR[value].toFixed(2)}`).join(' · ')}</p>
            <p>Servicio: {profile.services.map((value) => `${value} ${SERVICE_FACTOR[value].toFixed(2)}`).join(' · ')}</p>
            <p>Operador: {profile.driverTypes.map((value) => `${value} ${DRIVER_FACTOR[value].toFixed(2)}`).join(' · ')}</p>
          </div>
        </details>

        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Equipo tractor</legend>
          <div className="flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium">Tractocamión / Truck Trailer</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">Único activo con tarjeta completa de capital, mantenimiento, llantas y seguros en V3.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-dashed p-2.5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed">Thorton, Rabón, 3.5 t y 1.5 t se habilitarán cuando exista una tarjeta de activos específica; seleccionarlos hoy produciría una tarifa engañosa.</p>
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Capacidades de remolque</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {trailers.map((option) => {
              const checked = profile.trailerTypes.includes(option.value)
              const disabled = checked && profile.trailerTypes.length === 1
              return (
                <ProfileCheckbox
                  key={option.value}
                  checked={checked}
                  disabled={disabled}
                  label={option.label}
                  description={option.description}
                  onChange={() => onToggleTrailer(option.value)}
                />
              )
            })}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Tipos de operador habilitados</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {drivers.map((option) => {
              const checked = profile.driverTypes.includes(option.value)
              const disabled = (option.disabled && !checked) || (checked && profile.driverTypes.length === 1)
              return (
                <ProfileCheckbox
                  key={option.value}
                  checked={checked}
                  disabled={disabled}
                  label={option.label}
                  description={option.disabled ? 'No corresponde a los países de esta base.' : option.description}
                  onChange={() => onToggleDriver(option.value)}
                />
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="grid content-start gap-2">
            <legend className="text-xs font-medium">Configuración permitida</legend>
            {configurations.map((option) => {
              const checked = profile.configurations.includes(option.value)
              const disabled = (option.disabled && !checked) || (checked && profile.configurations.length === 1)
              return (
                <ProfileCheckbox
                  key={option.value}
                  checked={checked}
                  disabled={disabled}
                  label={option.label}
                  description={option.disabled ? 'Tándem requiere un tramo México.' : undefined}
                  onChange={() => onToggleConfiguration(option.value)}
                />
              )
            })}
          </fieldset>

          <fieldset className="grid content-start gap-2">
            <legend className="text-xs font-medium">Servicios habilitados</legend>
            {services.map((option) => {
              const checked = profile.services.includes(option.value)
              const disabled = (option.disabled && !checked) || (checked && profile.services.length === 1)
              return (
                <ProfileCheckbox
                  key={option.value}
                  checked={checked}
                  disabled={disabled}
                  label={option.label}
                  description={option.disabled ? 'El ciclo Drayage V3 integra el retorno en One Way.' : undefined}
                  onChange={() => onToggleService(option.value)}
                />
              )
            })}
          </fieldset>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-xs font-medium">Modelo de propiedad</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs">
              <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-3.5 text-primary" aria-hidden="true" /> Propia / financiada</div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Costos completos de flota propia.</p>
            </div>
            <UnavailableOwnership label="Arrendada" description="Requiere renta, depósitos, kilometraje incluido y penalizaciones." />
            <UnavailableOwnership label="Subcontratada" description="Requiere buy rate, carrier margin y disponibilidad de mercado." />
          </div>
        </fieldset>

        {profile.scope === 'CROSS_BORDER' ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 p-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div><p className="text-xs font-medium">Cruce con el mismo tractor</p><p className="mt-0.5 text-[11px] text-muted-foreground">Yard transfer y partner handoff permanecen bloqueados hasta modelar los costos del tercero y del intercambio.</p></div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function DerivedProfileValues({ label, values }: { label: string; values: readonly string[] }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((value) => <span key={value} className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium">{value}</span>)}
      </div>
    </div>
  )
}

function ProfileCheckbox({ checked, disabled, label, description, onChange }: {
  checked: boolean
  disabled: boolean
  label: string
  description?: string
  onChange: () => void
}) {
  return (
    <label className={`flex items-start gap-2 rounded-md border p-2.5 text-xs ${disabled ? 'cursor-not-allowed opacity-65' : 'cursor-pointer hover:bg-muted/30'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="mt-0.5 accent-primary" />
      <span><strong className="block font-medium">{label}</strong>{description ? <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">{description}</span> : null}</span>
    </label>
  )
}

function UnavailableOwnership({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed p-2.5 text-xs text-muted-foreground" aria-disabled="true">
      <div className="flex items-center gap-2 font-medium"><LockKeyhole className="size-3.5" aria-hidden="true" /> {label}</div>
      <p className="mt-1 text-[10px] leading-relaxed">{description}</p>
    </div>
  )
}
