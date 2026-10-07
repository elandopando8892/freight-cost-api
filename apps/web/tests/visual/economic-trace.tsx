import { createRoot } from 'react-dom/client'
import sample from './economic-trace-sample.json'
import { parseReview } from '../../app/(app)/scenarios/benchmark/review-contract'
import { ReviewResults } from '../../app/(app)/scenarios/benchmark/benchmark-review'
import '../../app/globals.css'

window.fetch = async () => { throw new Error('Synthetic trace QA: API requests forbidden') }
const fixture = parseReview(JSON.stringify(sample))
const mode = new URLSearchParams(window.location.search).get('state')
const result = mode === 'incomplete' ? parseReview(JSON.stringify({ ...fixture, status: 'INCOMPLETE', scenarios: null, issues: [{ field: 'mx.FUEL', code: 'MISSING_PARAMETER' }] })) :
  mode === 'legacy' ? parseReview(JSON.stringify({ ...fixture, scenarios: fixture.scenarios!.map(s => {
    const result = { ...s.result }; delete result.trace
    return { id: s.id, result }
  }) })) : parseReview(JSON.stringify(fixture))
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-[1440px] p-4">
  <p className="mb-4 rounded border p-3 text-sm font-bold">QA SINTÉTICA · MOTOR LOCAL REAL · SIN AUTH/DB · NO IMPORTES DE MERCADO · NO ADOPTAR</p>
  <h1 className="mb-4 text-2xl font-semibold">Traza económica D2D</h1>
  <ReviewResults result={result} calculated />
</main>)
