'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type CoverageStatus = 'INHERITED' | 'SPECIFIC' | 'MISSING' | 'OUT_OF_RANGE'
type Counts = { inherited: number; specific: number; missing: number; outOfRange: number; total: number }

interface CoverageParameter {
  key: string
  section: string
  label: string
  kind: 'ASSUMPTION' | 'COST_CARD'
  unit: string
  recommended: number
  low: number | null
  high: number | null
  updateFrequency: string
  costBehavior: string
  activation: string
  sourceSheet: string
  value: number | null
  paramId: string | null
  updatedAt: string | null
  status: CoverageStatus
}

interface BaseCoverage {
  id: string
  code: string
  name: string
  scope: string
  status: string
  isDefault: boolean
  version: { id: string; version: number; updatedAt: string } | null
  counts: Counts
  sections: Record<string, Counts>
  parameters: CoverageParameter[]
}

export interface CoverageResponse {
  catalogTotal: number
  sections: { section: string; total: number }[]
  bases: BaseCoverage[]
}

const STATUS: Record<CoverageStatus, { label: string; dot: string; badge: string }> = {
  INHERITED: { label: 'Inherited', dot: 'bg-slate-400', badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' },
  SPECIFIC: { label: 'Base-specific', dot: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  MISSING: { label: 'Incomplete', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  OUT_OF_RANGE: { label: 'Out of range', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
}
const selectCls = 'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const formatValue = (value: number | null) => value == null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value)
const sectionLabel = (section: string) => section.replace(/^COST_/, '').replaceAll('_', ' ')

export function CoverageCatalog({ initial, initialBaseId }: { initial: CoverageResponse; initialBaseId?: string }) {
  const initialBase = initial.bases.find((base) => base.id === initialBaseId) ?? initial.bases.find((base) => base.isDefault) ?? initial.bases[0]
  const [baseId, setBaseId] = useState(initialBase?.id ?? '')
  const [section, setSection] = useState('ALL')
  const [status, setStatus] = useState<'ALL' | CoverageStatus>('ALL')
  const [kind, setKind] = useState<'ALL' | CoverageParameter['kind']>('ALL')
  const [search, setSearch] = useState('')
  const selected = initial.bases.find((base) => base.id === baseId) ?? initial.bases[0]

  const filtered = useMemo(() => {
    if (!selected) return []
    const needle = search.trim().toLowerCase()
    return selected.parameters.filter((parameter) => (
      (section === 'ALL' || parameter.section === section)
      && (status === 'ALL' || parameter.status === status)
      && (kind === 'ALL' || parameter.kind === kind)
      && (!needle || [parameter.label, parameter.key, parameter.section, parameter.unit, parameter.costBehavior, parameter.activation]
        .some((value) => value.toLowerCase().includes(needle)))
    ))
  }, [selected, search, section, status, kind])

  const reset = () => { setSection('ALL'); setStatus('ALL'); setKind('ALL'); setSearch('') }

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parameter catalog & coverage</h1>
          <p className="text-sm text-muted-foreground">
            {initial.catalogTotal} canonical parameters across {initial.sections.length} categories. Select a base to see what is inherited, customized, incomplete, or unsafe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cost-bases" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Manage bases</Link>
          {selected?.version && <Link href={`/assumptions/${selected.version.id}`} className={buttonVariants({ size: 'sm' })}>Edit active version</Link>}
        </div>
      </header>

      {initial.bases.length === 0 ? (
        <Card><CardHeader><CardTitle>No cost bases yet</CardTitle><CardDescription>Create a cost base before reviewing parameter coverage.</CardDescription></CardHeader><CardContent><Link href="/cost-bases" className="text-sm underline underline-offset-2">Create a base →</Link></CardContent></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
            <label className="grid min-w-[260px] gap-1 text-xs text-muted-foreground">
              Cost base
              <select className={selectCls} value={selected?.id} onChange={(event) => setBaseId(event.target.value)}>
                {initial.bases.map((base) => <option key={base.id} value={base.id}>{base.code} · {base.name} · {base.scope.replaceAll('_', '-')}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              State
              <select className={selectCls} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                <option value="ALL">All states</option>
                {Object.entries(STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Type
              <select className={selectCls} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
                <option value="ALL">All types</option><option value="ASSUMPTION">Assumptions</option><option value="COST_CARD">Cost cards</option>
              </select>
            </label>
            <label className="grid min-w-[240px] flex-1 gap-1 text-xs text-muted-foreground">
              Search
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Parameter, key, unit, behavior…" className="h-9" />
            </label>
            <Button variant="ghost" size="sm" onClick={reset}>Reset view</Button>
          </div>

          {selected && <CoverageSummary base={selected} />}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Coverage meaning:</span>
            <span><span className="font-medium">Inherited</span> = matches the canonical FCM V3 recommendation</span>
            <span><span className="font-medium">Base-specific</span> = effective value changed by this base</span>
            <span><span className="font-medium">Incomplete</span> = no effective value</span>
            <span><span className="font-medium">Out of range</span> = outside the configured bounds</span>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Coverage matrix</CardTitle>
              <CardDescription>Rows are the 16 canonical categories; columns are cost bases. Select a cell to inspect that category.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="border-y bg-muted/30 text-xs text-muted-foreground">
                    <tr><th className="sticky left-0 z-10 min-w-[180px] bg-muted px-4 py-2 text-left font-medium">Category</th>{initial.bases.map((base) => <th key={base.id} className="min-w-[190px] px-3 py-2 text-left font-medium"><div className="text-foreground">{base.code}</div><div>v{base.version?.version ?? '—'} · {base.scope.replaceAll('_', '-')}</div></th>)}</tr>
                  </thead>
                  <tbody>
                    {initial.sections.map(({ section: rowSection, total }) => (
                      <tr key={rowSection} className="border-b last:border-b-0">
                        <th className="sticky left-0 z-10 bg-card px-4 py-2 text-left"><button type="button" className="font-medium hover:underline" onClick={() => setSection(rowSection)}>{sectionLabel(rowSection)}</button><div className="text-xs font-normal text-muted-foreground">{total} parameters</div></th>
                        {initial.bases.map((base) => <MatrixCell key={base.id} counts={base.sections[rowSection]} active={selected?.id === base.id && section === rowSection} onClick={() => { setBaseId(base.id); setSection(rowSection) }} />)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <CategoryButton active={section === 'ALL'} label="All categories" count={initial.catalogTotal} onClick={() => setSection('ALL')} />
            {initial.sections.map((item) => <CategoryButton key={item.section} active={section === item.section} label={sectionLabel(item.section)} count={item.total} onClick={() => setSection(item.section)} />)}
          </div>

          <ParameterTable parameters={filtered} total={selected?.parameters.length ?? 0} onClear={reset} />
        </>
      )}
    </div>
  )
}

function CoverageSummary({ base }: { base: BaseCoverage }) {
  const covered = base.counts.total - base.counts.missing
  const pct = base.counts.total ? Math.round(covered / base.counts.total * 100) : 0
  return (
    <div className="grid gap-3 md:grid-cols-[1.4fr_repeat(4,1fr)]">
      <Card><CardHeader className="p-4"><CardDescription>{base.code} · active coverage</CardDescription><CardTitle>{pct}% <span className="text-sm font-normal text-muted-foreground">({covered}/{base.counts.total})</span></CardTitle><CardDescription>{base.version ? `Version ${base.version.version}` : 'No active version'}</CardDescription></CardHeader></Card>
      <MetricCard label="Inherited" value={base.counts.inherited} status="INHERITED" />
      <MetricCard label="Base-specific" value={base.counts.specific} status="SPECIFIC" />
      <MetricCard label="Incomplete" value={base.counts.missing} status="MISSING" />
      <MetricCard label="Out of range" value={base.counts.outOfRange} status="OUT_OF_RANGE" />
    </div>
  )
}

function MetricCard({ label, value, status }: { label: string; value: number; status: CoverageStatus }) {
  return <Card><CardHeader className="p-4"><CardDescription className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${STATUS[status].dot}`} />{label}</CardDescription><CardTitle>{value}</CardTitle></CardHeader></Card>
}

function MatrixCell({ counts, active, onClick }: { counts?: Counts; active: boolean; onClick: () => void }) {
  const safe = counts ?? { inherited: 0, specific: 0, missing: 0, outOfRange: 0, total: 0 }
  const coverage = safe.total ? Math.round((safe.total - safe.missing) / safe.total * 100) : 0
  const width = (value: number) => safe.total ? `${value / safe.total * 100}%` : '0%'
  return (
    <td className="p-1.5">
      <button type="button" onClick={onClick} className={`w-full rounded-md border px-2.5 py-2 text-left hover:bg-accent ${active ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''}`} title={`${safe.inherited} inherited, ${safe.specific} specific, ${safe.missing} incomplete, ${safe.outOfRange} out of range`}>
        <div className="mb-1 flex items-center justify-between"><span className="font-medium">{coverage}%</span><span className={`text-xs ${safe.missing + safe.outOfRange > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{safe.missing + safe.outOfRange > 0 ? `${safe.missing + safe.outOfRange} attention` : 'healthy'}</span></div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted"><span className="bg-slate-400" style={{ width: width(safe.inherited) }} /><span className="bg-blue-500" style={{ width: width(safe.specific) }} /><span className="bg-amber-500" style={{ width: width(safe.outOfRange) }} /><span className="bg-rose-500" style={{ width: width(safe.missing) }} /></div>
      </button>
    </td>
  )
}

function CategoryButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-md border px-3 py-2 text-left text-xs ${active ? 'border-primary bg-primary/5 text-foreground' : 'text-muted-foreground hover:bg-accent'}`}><div className="font-medium">{label}</div><div>{count} parameters</div></button>
}

function ParameterTable({ parameters, total, onClear }: { parameters: CoverageParameter[]; total: number; onClear: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Effective parameter coverage</CardTitle><CardDescription>{parameters.length} of {total} parameters in the current view.</CardDescription></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="border-y bg-muted/30 text-xs text-muted-foreground"><tr><th className="px-4 py-2 text-left font-medium">Category</th><th className="px-4 py-2 text-left font-medium">Parameter</th><th className="px-4 py-2 text-right font-medium">Effective</th><th className="px-4 py-2 text-right font-medium">Recommended</th><th className="px-4 py-2 text-left font-medium">Range</th><th className="px-4 py-2 text-left font-medium">Coverage state</th><th className="px-4 py-2 text-left font-medium">Update</th><th className="px-4 py-2 text-left font-medium">Behavior</th></tr></thead>
            <tbody>
              {parameters.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No parameters match this view. <button type="button" onClick={onClear} className="underline underline-offset-2">Reset filters</button></td></tr> : parameters.map((parameter) => (
                <tr key={parameter.key} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{sectionLabel(parameter.section)}</td>
                  <td className="px-4 py-2"><div className="font-medium">{parameter.label}</div><div className="max-w-[360px] truncate font-mono text-[10px] text-muted-foreground" title={parameter.key}>{parameter.key}</div></td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium">{formatValue(parameter.value)} <span className="text-xs font-normal text-muted-foreground">{parameter.unit}</span></td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">{formatValue(parameter.recommended)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{formatValue(parameter.low)} … {formatValue(parameter.high)}</td>
                  <td className="whitespace-nowrap px-4 py-2"><span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS[parameter.status].badge}`}>{STATUS[parameter.status].label}</span></td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">{parameter.updateFrequency || '—'}</td>
                  <td className="max-w-[220px] truncate px-4 py-2 text-xs text-muted-foreground" title={parameter.costBehavior}>{parameter.costBehavior || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
