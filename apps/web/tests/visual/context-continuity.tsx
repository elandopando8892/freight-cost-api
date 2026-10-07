import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CostBasesBoard, type CostBase } from '../../app/(app)/cost-bases/cost-bases-board'
import { BenchmarkCalculator } from '../../app/(app)/scenarios/benchmark/benchmark-calculator'
import '../../app/globals.css'
import schema from './benchmark-form-schema.json'

window.fetch = async path => {
  if (path === '/api/v1/engine/benchmark-owned-d2d/form') return new Response(JSON.stringify(schema), { status: 200 })
  // Deliberate denial, never a real BFF fallback or public research adoption.
  if (String(path).startsWith('/api/v1/engine/benchmark-owned-d2d/b2-evidence')) return new Response(JSON.stringify({ error: 'Fixture: forbidden' }), { status: 403 })
  throw new Error('Synthetic QA: all other requests blocked')
}
const base = (id: string, isDefault: boolean): CostBase => ({
  id, code: `QA-${id}`, name: `Base sintética ${id}`, description: 'Sólo prueba de selección', scope: 'CROSS_BORDER', operationalSegment: null,
  status: 'ACTIVE', defaultPolicy: 'OPERATIONAL_V3', currency: 'USD', isDefault, updatedAt: '2026-10-03T00:00:00Z',
  _count: { lanes: 0, quotes: 0 }, versions: [{ id: `qa-set-${id}`, name: `Versión sintética ${id}`, version: 1, isActive: true,
    status: 'PUBLISHED', notes: null, sourceVersionId: null, applicabilityContext: null, publishedAt: null,
    createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z', _count: { params: 210 } }],
})
const bases = [base('A', true), base('B', false)]
const isBoard = new URLSearchParams(window.location.search).get('view') === 'bases'
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient()}>
  <main className="mx-auto max-w-[1440px] p-4">
    <p className="mb-4 rounded border p-3 text-sm font-bold">QA SINTÉTICA · SIN AUTH/DB · NO PARÁMETROS CALIBRADOS · NO SERVICIOS EXTERNOS</p>
    {isBoard ? <CostBasesBoard initial={bases} segments={[]} canEdit={false} /> : <BenchmarkCalculator />}
  </main>
</QueryClientProvider>)
