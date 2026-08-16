'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { fetcher } from '@/lib/fetcher'
import {
  availableConfigurations,
  availableDrivers,
  availableServices,
  availableTrailers,
  profileConsistencyMessages,
  toggleProfileValue,
  type ApplicabilityStatus,
  type CostBaseConfiguration,
  type CostBaseDriver,
  type CostBaseProfile,
  type CostBaseService,
  type CostBaseTrailer,
} from '../../cost-bases/cost-base-profile'

export interface Param {
  id: string
  section: string
  field: string
  value: number
  unit: string
  low: number | null
  high: number | null
  recommended: number | null
  recommendedLow: number | null
  recommendedHigh: number | null
  outOfRange: boolean
  applicability: ApplicabilityStatus
  applicabilityReason: string
  applicabilityCondition: string | null
}
export type Grouped = Record<string, Param[]>

interface Warning { section: string; field: string; value: number; low: number | null; high: number | null; message: string }

const key = (p: { section: string; field: string }) => `${p.section}__${p.field}`
const fmt = (n: number) => Number.isInteger(n) ? String(n) : String(+n.toFixed(6))
type ApplicabilityFilter = 'APPLICABLE' | ApplicabilityStatus | 'ALL'
type ReadOnlyReason = 'PUBLISHED' | 'ARCHIVED' | 'PERMISSION'

export function Editor({ setId, costBaseId, initialProfile, initialProfilePersisted = true, initial, sections, readOnly = false, readOnlyReason = null }: {
  setId: string
  costBaseId: string | null
  initialProfile: CostBaseProfile | null
  initialProfilePersisted?: boolean
  initial: Grouped
  sections: string[]
  readOnly?: boolean
  readOnlyReason?: ReadOnlyReason | null
}) {
  const [data, setData] = useState<Grouped>(initial)
  const [profile, setProfile] = useState<CostBaseProfile | null>(initialProfile)
  const [savedProfile, setSavedProfile] = useState<CostBaseProfile | null>(initialProfile)
  const [profilePersisted, setProfilePersisted] = useState(initialProfilePersisted)
  const [pending, setPending] = useState<Record<string, number>>({})
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [search, setSearch] = useState('')
  const [applicabilityFilter, setApplicabilityFilter] = useState<ApplicabilityFilter>('APPLICABLE')

  const pendingCount = Object.keys(pending).length
  const invalidPendingCount = Object.values(pending).filter((value) => !Number.isFinite(value)).length
  const profileDirty = !readOnly && (!profilePersisted || JSON.stringify(profile) !== JSON.stringify(savedProfile))
  const profileErrors = profileConsistencyMessages(profile)
  const q = search.trim().toLowerCase()
  const matches = (p: Param) =>
    q === '' || p.field.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q) || p.applicabilityReason.toLowerCase().includes(q) || (p.applicabilityCondition?.toLowerCase().includes(q) ?? false)
  const visible = (p: Param) => applicabilityFilter === 'ALL'
    || (applicabilityFilter === 'APPLICABLE' && p.applicability !== 'NOT_APPLICABLE')
    || p.applicability === applicabilityFilter

  // Warn before closing tab / refresh when there are pending edits. (In-app navigation
  // can't be intercepted in App Router without custom Link wrappers — covered by
  // the sticky Save bar + the pendingCount badge.)
  useEffect(() => {
    if (pendingCount === 0 && !profileDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // required for the native prompt in some browsers
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [pendingCount, profileDirty])

  const save = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(pending).map(([k, value]) => {
        const [section, ...rest] = k.split('__')
        return { section, field: rest.join('__'), value }
      })
      return fetcher<{ params: Grouped; warnings: Warning[] }>(`/api/v1/assumptions/sets/${setId}/params`, {
        method: 'PATCH', json: updates,
      })
    },
    onSuccess: (result) => {
      const n = Object.keys(pending).length
      setData(result.params)
      setPending({})
      setWarnings(result.warnings ?? [])
      if ((result.warnings ?? []).length > 0) {
        toast.warning(`Se guardaron ${n} cambios · ${result.warnings.length} valores fuera del rango recomendado`)
      } else {
        toast.success(`Se guardaron ${n} cambios`)
      }
    },
  })

  const resetAll = useMutation({
    mutationFn: () => fetcher<Grouped>(`/api/v1/assumptions/sets/${setId}/params/reset`, { method: 'POST', json: {} }),
    onSuccess: (result) => { setData(result); setPending({}); setWarnings([]); toast.success('Todos los parámetros volvieron al valor recomendado') },
  })

  const saveProfile = useMutation({
    mutationFn: async (nextProfile: CostBaseProfile) => {
      if (!costBaseId) throw new Error('Esta versión no pertenece a una base de costo gobernada.')
      await fetcher(`/api/v1/cost-bases/${costBaseId}/versions/${setId}/profile`, {
        method: 'PATCH',
        json: { applicabilityProfile: nextProfile },
      })
      const params = await fetcher<Grouped>(`/api/v1/assumptions/sets/${setId}/params`)
      return { profile: nextProfile, params }
    },
    onSuccess: (result) => {
      setProfile(result.profile)
      setSavedProfile(result.profile)
      setProfilePersisted(true)
      setData(result.params)
      toast.success('Perfil operativo actualizado', { description: 'La aplicabilidad de los 210 parámetros fue recalculada.' })
    },
  })

  // Cmd/Ctrl+S saves pending edits. (Declared after `save` so it's in scope.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!readOnly && pendingCount > 0 && invalidPendingCount === 0 && !save.isPending) save.mutate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [invalidPendingCount, pendingCount, readOnly, save])

  // Per-section counts for the side nav: pending edits + out-of-range params + matches.
  const sectionStats = useMemo(() => {
    const out: Record<string, { rows: number; pending: number; outOfRange: number; matched: number; notApplicable: number }> = {}
    for (const s of sections) {
      const rows = data[s] ?? []
      out[s] = {
        rows: rows.length,
        pending: Object.keys(pending).filter((k) => k.startsWith(`${s}__`)).length,
        outOfRange: rows.filter((p) => p.outOfRange).length,
        matched: rows.filter((row) => visible(row) && matches(row)).length,
        notApplicable: rows.filter((row) => row.applicability === 'NOT_APPLICABLE').length,
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, data, pending, q, applicabilityFilter])

  const applicabilityCounts = useMemo(() => {
    const counts: Record<ApplicabilityStatus, number> = {
      REQUIRED: 0,
      OPTIONAL: 0,
      CONDITIONAL: 0,
      NOT_IMPLEMENTED: 0,
      NOT_APPLICABLE: 0,
    }
    for (const rows of Object.values(data)) {
      for (const row of rows) counts[row.applicability] += 1
    }
    return counts
  }, [data])
  const navigableSections = sections.filter((section) => {
    const stats = sectionStats[section]
    return Boolean(stats && stats.rows > 0 && stats.matched > 0)
  })
  const readOnlyMessage = readOnlyReason === 'PUBLISHED'
    ? 'Versión publicada: sólo lectura.'
    : readOnlyReason === 'ARCHIVED'
      ? 'Versión archivada: sólo lectura.'
      : readOnlyReason === 'PERMISSION'
        ? 'Modo consulta: no tienes permisos de edición.'
        : 'Versión de sólo lectura.'

  return (
    <div className="grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start">
      {/* Side nav — desktop only */}
      <aside className="hidden lg:sticky lg:top-16 lg:block lg:self-start">
        <nav aria-label="Secciones de parámetros" className="grid gap-0.5 rounded-md border bg-card p-2 text-xs">
          <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Secciones
          </div>
          {navigableSections.map((s) => {
            const st = sectionStats[s]
            if (!st) return null
            return (
              <a
                key={s} href={`#${s}`}
                className="group flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-accent"
              >
                <span className="truncate">{s}</span>
                <span className="flex shrink-0 items-center gap-1 text-[10px]">
                  {st.pending > 0 && (
                    <span
                      className="rounded-full bg-blue-500/15 px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-400"
                      title={`${st.pending} cambios pendientes`}
                    >
                      {st.pending}
                    </span>
                  )}
                  {st.outOfRange > 0 && (
                    <span
                      className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-400"
                      title={`${st.outOfRange} parámetros fuera de rango`}
                    >
                      {st.outOfRange}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {st.matched === st.rows ? st.rows : `${st.matched}/${st.rows}`}
                  </span>
                </span>
              </a>
            )
          })}
          {navigableSections.length === 0 ? (
            <p className="px-2 py-1.5 text-muted-foreground">Sin secciones para el filtro actual.</p>
          ) : null}
        </nav>
      </aside>

      <div className="min-w-0">
      <nav aria-label="Navegación móvil de secciones" className="mb-3 lg:hidden">
        <label htmlFor="mobile-section-navigation" className="grid gap-1.5 text-xs font-medium">
          <span>Ir a una sección</span>
          <select
            id="mobile-section-navigation"
            value=""
            onChange={(event) => {
              const target = document.getElementById(event.target.value)
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground shadow-sm"
            disabled={navigableSections.length === 0}
          >
            <option value="">{navigableSections.length > 0 ? 'Selecciona una sección…' : 'Sin secciones para el filtro actual'}</option>
            {navigableSections.map((section) => (
              <option key={section} value={section}>{section} ({sectionStats[section]?.matched ?? 0})</option>
            ))}
          </select>
        </label>
      </nav>
      {profile && costBaseId ? (
        <AssumptionProfileEditor
          profile={profile}
          counts={applicabilityCounts}
          dirty={profileDirty}
          legacy={!profilePersisted}
          errors={profileErrors}
          readOnly={readOnly}
          pending={saveProfile.isPending || save.isPending}
          blockedByParameterEdits={pendingCount > 0}
          onChange={setProfile}
          onDiscard={() => setProfile(savedProfile)}
          onSave={() => saveProfile.mutate(profile)}
        />
      ) : null}
      <div className="sticky top-12 z-10 -mx-2 mb-3 flex flex-wrap items-center justify-between gap-2 border-b bg-background/90 px-2 py-2 backdrop-blur">
        <div className="flex w-full flex-col items-stretch gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
          <div className="w-full min-w-0 sm:w-auto" aria-live="polite">
            {readOnly ? (
              <span className="font-medium text-muted-foreground">{readOnlyMessage}</span>
            ) : invalidPendingCount > 0 ? (
              <span className="font-medium text-destructive">Completa {invalidPendingCount} {invalidPendingCount === 1 ? 'valor requerido' : 'valores requeridos'}.</span>
            ) : profileDirty && pendingCount === 0 ? (
              <span className="font-medium text-blue-700 dark:text-blue-400">Perfil operativo pendiente de guardar.</span>
            ) : pendingCount === 0 ? (
              <span className="text-muted-foreground">Sin cambios pendientes.</span>
            ) : (
              <span className="font-medium">{pendingCount} {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}</span>
            )}
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar parámetro…"
            aria-label="Buscar parámetros"
            className="h-8 w-full sm:w-44"
          />
          <label className="flex w-full flex-col items-stretch gap-1 text-xs text-muted-foreground sm:w-auto sm:flex-row sm:items-center sm:gap-1.5">
            <span>Aplicabilidad</span>
            <select
              value={applicabilityFilter}
              onChange={(event) => setApplicabilityFilter(event.target.value as ApplicabilityFilter)}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm sm:w-auto"
              aria-label="Filtrar por aplicabilidad"
            >
              <option value="APPLICABLE">Todos excepto No aplica</option>
              <option value="REQUIRED">Requeridos</option>
              <option value="CONDITIONAL">Condicionales</option>
              <option value="OPTIONAL">Opcionales</option>
              <option value="NOT_IMPLEMENTED">Sin efecto matemático</option>
              <option value="NOT_APPLICABLE">No aplican</option>
              <option value="ALL">Todos</option>
            </select>
          </label>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <Button variant="ghost" size="sm" onClick={() => setPending({})} disabled={readOnly || pendingCount === 0 || save.isPending || saveProfile.isPending}>
            Descartar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" size="sm" disabled={readOnly || resetAll.isPending || save.isPending || saveProfile.isPending}>
                  {resetAll.isPending ? 'Restableciendo…' : 'Usar recomendados'}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restablecer todos los parámetros?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto reemplazará cada valor de esta versión por el recomendado del catálogo V3.0. No afectará otras
                  bases, pero se perderán los cambios de esta versión.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetAll.mutate()}>Restablecer todo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={() => save.mutate()} disabled={readOnly || pendingCount === 0 || invalidPendingCount > 0 || save.isPending || saveProfile.isPending} title="Guardar (⌘S / Ctrl+S)">
            {save.isPending ? 'Guardando…' : `Guardar ${pendingCount || ''}`.trim()}
          </Button>
        </div>
      </div>

      {warnings.length > 0 && (
        <Card className="mb-4 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{warnings.length} {warnings.length === 1 ? 'valor fuera' : 'valores fuera'} del rango recomendado</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm text-muted-foreground">
            {warnings.map((w) => (
              <div key={`${w.section}__${w.field}`}>
                <span className="font-medium text-foreground">{w.section} · {w.field}</span> → {w.value}: {w.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {q !== '' && (
          <div className="text-xs text-muted-foreground">
            Filtrando por &ldquo;{search}&rdquo; · sólo se muestran coincidencias.
            {' '}
            <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setSearch('')}>
              Limpiar
            </button>
          </div>
        )}
        {sections.map((section) => {
          const rows = (data[section] ?? []).filter((row) => visible(row) && matches(row))
          if (rows.length === 0) return null
          return (
            <SectionCard
              key={section}
              section={section}
              rows={rows}
              pending={pending}
              onChange={(k, v) => setPending((p) => ({ ...p, [k]: v }))}
              onReset={(k, recommended) => setPending((p) => ({ ...p, [k]: recommended }))}
              onUndo={(k) => setPending((p) => Object.fromEntries(Object.entries(p).filter(([entryKey]) => entryKey !== k)))}
              readOnly={readOnly}
            />
          )
        })}
      </div>
      </div>
    </div>
  )
}

function AssumptionProfileEditor({ profile, counts, dirty, legacy, errors, readOnly, pending, blockedByParameterEdits, onChange, onDiscard, onSave }: {
  profile: CostBaseProfile
  counts: Record<ApplicabilityStatus, number>
  dirty: boolean
  legacy: boolean
  errors: string[]
  readOnly: boolean
  pending: boolean
  blockedByParameterEdits: boolean
  onChange: (profile: CostBaseProfile) => void
  onDiscard: () => void
  onSave: () => void
}) {
  const trailers = availableTrailers(profile.scope)
  const configurations = availableConfigurations(profile)
  const services = availableServices(profile.scope)
  const drivers = availableDrivers(profile)
  const updateTrailers = (value: CostBaseTrailer) => onChange({ ...profile, trailerTypes: toggleProfileValue(profile.trailerTypes, value) })
  const updateConfigurations = (value: CostBaseConfiguration) => onChange({ ...profile, configurations: toggleProfileValue(profile.configurations, value) })
  const updateServices = (value: CostBaseService) => onChange({ ...profile, services: toggleProfileValue(profile.services, value) })
  const updateDrivers = (value: CostBaseDriver) => onChange({ ...profile, driverTypes: toggleProfileValue(profile.driverTypes, value) })

  return (
    <Card className="mb-3 overflow-hidden border-primary/25">
      <details open={dirty || undefined}>
        <summary className="cursor-pointer list-none border-b bg-primary/5 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-medium">Perfil operativo de esta versión</span>
              <span className="ml-2 text-[11px] text-muted-foreground">{profile.countries.join(' + ')} · {profile.operations.join(', ')}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              {dirty ? <span className="rounded-full bg-blue-500/15 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-400">Cambios sin guardar</span> : null}
              {legacy ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">Legado · sin perfil explícito</span> : null}
              {readOnly ? <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">Perfil congelado</span> : null}
              <span className="rounded-full border bg-background px-2 py-0.5 text-muted-foreground">Abrir configuración</span>
            </div>
          </div>
        </summary>
        <div className="grid gap-4 p-3">
          <div className="grid gap-3 rounded-md bg-muted/20 p-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
            <ProfileSummary label="Países derivados" values={profile.countries.map((country) => country === 'MX' ? 'México' : 'EE. UU.')} />
            <ProfileSummary label="Operaciones derivadas" values={profile.operations} />
            <ProfileSummary label="Modelo fijo" values={[profile.calculationPolicy === 'WORKBOOK_V3' ? 'Workbook exacto' : 'Operacional V3', 'Flota propia/financiada', 'Truck Trailer']} />
            <ProfileSummary label="Contrato técnico" values={[profile.factorScheduleVersion]} />
          </div>

          <fieldset disabled={readOnly || pending} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <legend className="sr-only">Capacidades del perfil operativo</legend>
            <ProfileOptionGroup title="Remolques">
              {trailers.map((option) => {
                const checked = profile.trailerTypes.includes(option.value)
                return <ProfileToggle key={option.value} checked={checked} disabled={checked && profile.trailerTypes.length === 1} label={option.label} onChange={() => updateTrailers(option.value)} />
              })}
            </ProfileOptionGroup>
            <ProfileOptionGroup title="Configuraciones">
              {configurations.map((option) => {
                const checked = profile.configurations.includes(option.value)
                const disabled = (option.disabled && !checked) || (checked && profile.configurations.length === 1)
                return <ProfileToggle key={option.value} checked={checked} disabled={disabled} label={option.label} note={option.disabled ? 'Sólo con tramo México' : undefined} onChange={() => updateConfigurations(option.value)} />
              })}
            </ProfileOptionGroup>
            <ProfileOptionGroup title="Servicios">
              {services.map((option) => {
                const checked = profile.services.includes(option.value)
                const disabled = (option.disabled && !checked) || (checked && profile.services.length === 1)
                return <ProfileToggle key={option.value} checked={checked} disabled={disabled} label={option.label} note={option.disabled ? 'No soportado en Drayage V3' : undefined} onChange={() => updateServices(option.value)} />
              })}
            </ProfileOptionGroup>
            <ProfileOptionGroup title="Operadores">
              {drivers.map((option) => {
                const checked = profile.driverTypes.includes(option.value)
                const disabled = (option.disabled && !checked) || (checked && profile.driverTypes.length === 1)
                return <ProfileToggle key={option.value} checked={checked} disabled={disabled} label={option.label} note={option.disabled ? 'No corresponde a los países de esta base' : undefined} onChange={() => updateDrivers(option.value)} />
              })}
            </ProfileOptionGroup>
          </fieldset>

          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Aplicabilidad {dirty ? 'guardada; se recalculará al guardar el perfil' : 'vigente'}</p>
            <div className="flex flex-wrap gap-1.5" aria-label="Resumen de aplicabilidad">
              <CountBadge label="Requeridos" value={counts.REQUIRED} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" />
              <CountBadge label="Condicionales" value={counts.CONDITIONAL} className="bg-blue-500/10 text-blue-700 dark:text-blue-400" />
              <CountBadge label="Opcionales" value={counts.OPTIONAL} className="bg-muted text-muted-foreground" />
              <CountBadge label="Sin efecto matemático" value={counts.NOT_IMPLEMENTED} className="bg-violet-500/10 text-violet-700 dark:text-violet-400" />
              <CountBadge label="No aplican" value={counts.NOT_APPLICABLE} className="bg-muted text-muted-foreground" />
            </div>
          </div>

          {errors.length > 0 ? <div className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
          {blockedByParameterEdits && dirty ? <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-muted-foreground">Guarda o descarta primero los cambios de parámetros; así evitamos conservar una edición que el nuevo perfil marque como No aplica.</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="max-w-2xl text-[11px] leading-relaxed text-muted-foreground">Modificar capacidades recalcula qué supuestos son requeridos, condicionales o no aplicables. No cambia valores ni publica la versión.</p>
            {!readOnly ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={!dirty || pending}>{legacy ? 'Restablecer estándar' : 'Descartar perfil'}</Button>
                <Button type="button" size="sm" onClick={onSave} disabled={!dirty || errors.length > 0 || pending || blockedByParameterEdits}>{pending ? 'Guardando perfil…' : 'Guardar perfil'}</Button>
              </div>
            ) : null}
          </div>
        </div>
      </details>
    </Card>
  )
}

function ProfileSummary({ label, values }: { label: string; values: readonly string[] }) {
  return <div><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 leading-relaxed">{values.join(' · ')}</p></div>
}

function ProfileOptionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="grid content-start gap-1.5"><p className="text-xs font-medium">{title}</p>{children}</div>
}

function ProfileToggle({ checked, disabled, label, note, onChange }: {
  checked: boolean
  disabled: boolean
  label: string
  note?: string
  onChange: () => void
}) {
  return (
    <label className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/30'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="mt-0.5 accent-primary" />
      <span><span className="block">{label}</span>{note ? <span className="mt-0.5 block text-[10px] text-muted-foreground">{note}</span> : null}</span>
    </label>
  )
}

function CountBadge({ label, value, className }: { label: string; value: number; className: string }) {
  return <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${className}`}>{value} {label.toLowerCase()}</span>
}

function SectionCard({
  section, rows, pending, onChange, onReset, onUndo, readOnly,
}: {
  section: string
  rows: Param[]
  pending: Record<string, number>
  onChange: (key: string, value: number) => void
  onReset: (key: string, recommended: number) => void
  onUndo: (key: string) => void
  readOnly: boolean
}) {
  return (
    <Card id={section} className="scroll-mt-28 overflow-hidden">
      <CardHeader className="flex-row items-center justify-between border-b px-3 py-2">
        <CardTitle className="text-sm">{section}</CardTitle>
        <span className="text-[11px] text-muted-foreground">{rows.length} parámetros</span>
      </CardHeader>
      <CardContent
        className="overflow-x-auto p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        role="region"
        aria-label={`Tabla de parámetros de ${section}. Desplázate horizontalmente para consultar todas las columnas.`}
        tabIndex={0}
      >
        <table className="w-full min-w-[920px] table-fixed text-left text-xs">
          <caption className="sr-only">Parámetros de la sección {section}</caption>
          <thead className="bg-muted/45 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="sticky left-0 z-[1] w-[30%] border-r bg-muted px-3 py-2 font-medium">Parámetro</th>
              <th scope="col" className="w-[15%] px-3 py-2 font-medium">Valor actual</th>
              <th scope="col" className="w-[12%] px-3 py-2 font-medium">Recomendado</th>
              <th scope="col" className="w-[13%] px-3 py-2 font-medium">Rango</th>
              <th scope="col" className="w-[14%] px-3 py-2 font-medium">Aplicabilidad</th>
              <th scope="col" className="w-[10%] px-3 py-2 font-medium">Estado</th>
              <th scope="col" className="w-[6%] px-3 py-2 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => <Row key={p.id} p={p} pending={pending} onChange={onChange} onReset={onReset} onUndo={onUndo} readOnly={readOnly} />)}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function Row({
  p, pending, onChange, onReset, onUndo, readOnly,
}: {
  p: Param
  pending: Record<string, number>
  onChange: (key: string, value: number) => void
  onReset: (key: string, recommended: number) => void
  onUndo: (key: string) => void
  readOnly: boolean
}) {
  const k = key(p)
  const displayValue = k in pending ? pending[k] : p.value
  const modified = k in pending
  const lo = p.recommendedLow ?? p.low
  const hi = p.recommendedHigh ?? p.high
  const invalid = modified && !Number.isFinite(displayValue)
  const out = isOutOfRange(displayValue, lo, hi)
  const notApplicable = p.applicability === 'NOT_APPLICABLE'

  return (
    <tr className={notApplicable ? 'bg-muted/25 text-muted-foreground' : modified ? 'bg-blue-50/55 dark:bg-blue-950/20' : 'hover:bg-muted/20'}>
      <th
        scope="row"
        className={`sticky left-0 z-[1] border-r px-3 py-2 font-medium ${notApplicable ? 'bg-muted' : modified ? 'bg-blue-50 dark:bg-blue-950' : 'bg-card'}`}
      >
        <span className="block truncate" title={p.field}>{p.field}</span>
        <span className="block truncate text-[11px] font-normal text-muted-foreground">{p.unit}</span>
        <span className="mt-1 block whitespace-normal text-[10px] font-normal leading-relaxed text-muted-foreground">{p.applicabilityReason}</span>
        {p.applicabilityCondition ? <span className="mt-1 block whitespace-normal text-[10px] font-normal leading-relaxed text-primary"><strong>Condición:</strong> {p.applicabilityCondition}</span> : null}
      </th>
      <td className="px-3 py-1.5">
        <Input
          type="number"
          step="any"
          value={Number.isFinite(displayValue) ? displayValue : ''}
          onChange={(e) => onChange(k, e.target.value === '' ? NaN : Number(e.target.value))}
          aria-label={`${p.field} (${p.unit})`}
          aria-invalid={invalid || undefined}
          className={`h-8 w-full font-mono text-xs ${invalid ? 'border-destructive' : out ? 'border-amber-500/60' : ''}`}
          disabled={readOnly || notApplicable}
        />
      </td>
      <td className="px-3 py-2 font-mono text-foreground">{p.recommended != null ? fmt(p.recommended) : '—'}</td>
      <td className="px-3 py-2 font-mono text-muted-foreground">{formatRange(lo, hi)}</td>
      <td className="px-3 py-2">
        <ApplicabilityBadge status={p.applicability} />
      </td>
      <td className="px-3 py-2">
        {notApplicable ? (
          <span className="text-[11px] text-muted-foreground">Bloqueado</span>
        ) : invalid ? (
          <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">Valor requerido</span>
        ) : out ? (
          <span className="rounded-full bg-amber-500/12 px-2 py-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">Fuera de rango</span>
        ) : modified ? (
          <span className="rounded-full bg-blue-500/12 px-2 py-1 text-[10px] font-medium text-blue-700 dark:text-blue-400">Modificado</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">En rango</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {notApplicable ? null : modified ? (
          <button type="button" onClick={() => onUndo(k)} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
            Deshacer
          </button>
        ) : !readOnly && p.recommended != null ? (
          <button
            type="button"
            onClick={() => onReset(k, p.recommended as number)}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            title="Usar valor recomendado"
          >
            Usar
          </button>
        ) : null}
      </td>
    </tr>
  )
}

const APPLICABILITY_BADGE: Record<ApplicabilityStatus, { label: string; className: string }> = {
  REQUIRED: { label: 'Requerido', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  CONDITIONAL: { label: 'Condicional', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  OPTIONAL: { label: 'Opcional', className: 'bg-muted text-muted-foreground' },
  NOT_IMPLEMENTED: { label: 'Sin efecto', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  NOT_APPLICABLE: { label: 'No aplica', className: 'bg-muted text-muted-foreground' },
}

function ApplicabilityBadge({ status }: { status: ApplicabilityStatus }) {
  const badge = APPLICABILITY_BADGE[status]
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
}

function formatRange(lo: number | null, hi: number | null): string {
  if (lo == null && hi == null) return 'Sin rango'
  if (lo == null) return `≤ ${fmt(hi as number)}`
  if (hi == null) return `≥ ${fmt(lo)}`
  return `${fmt(lo)} – ${fmt(hi)}`
}

function isOutOfRange(v: number, lo: number | null, hi: number | null): boolean {
  if (!Number.isFinite(v)) return false
  if (lo != null && v < lo) return true
  if (hi != null && v > hi) return true
  return false
}
