'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetcher } from '@/lib/fetcher'

type Profile = { legalName: string | null; operatingName: string | null; primaryContactName: string | null; primaryContactEmail: string | null; primaryContactPhone: string | null; defaultCurrency: 'USD' | 'MXN'; operatingScopes: string[] } | null
export type CarrierOnboarding = { profile: Profile; completed: number; total: number; ready: boolean; steps: Array<{ key: string; label: string; description: string; complete: boolean; href: string }> }

const scopes = [['CROSS_BORDER', 'Cross-border'], ['DRAYAGE', 'Drayage'], ['LOCAL', 'Local'], ['INTRA_MEX', 'Intra-Mex'], ['INTRA_US', 'Intra-US']] as const

export function CarrierOnboardingBoard({ initial, canEdit }: { initial: CarrierOnboarding; canEdit: boolean }) {
  const [onboarding, setOnboarding] = useState(initial)
  const [form, setForm] = useState({ legalName: initial.profile?.legalName ?? '', operatingName: initial.profile?.operatingName ?? '', primaryContactName: initial.profile?.primaryContactName ?? '', primaryContactEmail: initial.profile?.primaryContactEmail ?? '', primaryContactPhone: initial.profile?.primaryContactPhone ?? '', defaultCurrency: initial.profile?.defaultCurrency ?? 'USD', operatingScopes: initial.profile?.operatingScopes ?? [] as string[] })
  const save = useMutation({
    mutationFn: () => fetcher<CarrierOnboarding>('/api/v1/onboarding/carrier/profile', { method: 'PUT', json: form }),
    onSuccess: (result) => setOnboarding(result),
  })
  function toggleScope(scope: string) { setForm(value => ({ ...value, operatingScopes: value.operatingScopes.includes(scope) ? value.operatingScopes.filter(item => item !== scope) : [...value.operatingScopes, scope] })) }
  return <div className="grid gap-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Onboarding de carrier</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Prepara la operación paso a paso. El progreso se calcula con evidencia real; completar esta pantalla no publica tarifas ni conecta integraciones.</p></div><div className="rounded-md bg-muted px-3 py-2 text-sm font-medium">{onboarding.completed} de {onboarding.total} listos</div></header>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><Card><CardHeader><CardTitle>Perfil operativo</CardTitle><CardDescription>La identidad que acompaña tus bases y tarifarios.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Razón social *"><Input disabled={!canEdit} value={form.legalName} onChange={event => setForm(value => ({ ...value, legalName: event.target.value }))} /></Field><Field label="Nombre operativo"><Input disabled={!canEdit} value={form.operatingName} onChange={event => setForm(value => ({ ...value, operatingName: event.target.value }))} /></Field><Field label="Contacto principal *"><Input disabled={!canEdit} value={form.primaryContactName} onChange={event => setForm(value => ({ ...value, primaryContactName: event.target.value }))} /></Field><Field label="Correo principal *"><Input disabled={!canEdit} type="email" value={form.primaryContactEmail} onChange={event => setForm(value => ({ ...value, primaryContactEmail: event.target.value }))} /></Field><Field label="Teléfono"><Input disabled={!canEdit} value={form.primaryContactPhone} onChange={event => setForm(value => ({ ...value, primaryContactPhone: event.target.value }))} /></Field><Field label="Moneda predeterminada"><select disabled={!canEdit} className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.defaultCurrency} onChange={event => setForm(value => ({ ...value, defaultCurrency: event.target.value as 'USD' | 'MXN' }))}><option value="USD">USD</option><option value="MXN">MXN</option></select></Field><div className="sm:col-span-2"><Label>Alcances operativos</Label><div className="mt-2 flex flex-wrap gap-3">{scopes.map(([scope, label]) => <label key={scope} className="flex items-center gap-2 text-sm"><input disabled={!canEdit} type="checkbox" checked={form.operatingScopes.includes(scope)} onChange={() => toggleScope(scope)} />{label}</label>)}</div></div><div className="sm:col-span-2"><Button disabled={!canEdit || form.legalName.trim().length < 2 || form.primaryContactName.trim().length < 2 || form.primaryContactEmail.trim().length < 3 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Guardando…' : 'Guardar perfil'}</Button>{save.isError && <p className="mt-2 text-sm text-destructive">No se pudo guardar el perfil. Revisa los campos requeridos.</p>}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Ruta de activación</CardTitle><CardDescription>Los pasos se completan cuando existe el dato operativo correspondiente.</CardDescription></CardHeader><CardContent className="grid gap-3">{onboarding.steps.map((step, index) => <div key={step.key} className="flex gap-3 rounded-md border p-3"><span className={step.complete ? 'text-emerald-600' : 'text-muted-foreground'}>{step.complete ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="font-medium">{index + 1}. {step.label}</p><p className="mt-1 text-xs text-muted-foreground">{step.description}</p><Link href={step.href} className="mt-2 inline-block text-xs font-medium underline underline-offset-2">{step.complete ? 'Revisar' : 'Completar'} →</Link></div></div>)}</CardContent></Card></div>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5"><span className="text-sm font-medium">{label}</span>{children}</label> }
