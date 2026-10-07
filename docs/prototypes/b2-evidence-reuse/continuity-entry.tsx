import { createRoot } from 'react-dom/client'
import { BenchmarkCalculator } from '@/app/(app)/scenarios/benchmark/benchmark-calculator'
import { sessionExpiredEvent } from '@/lib/fetcher'
import './continuity.css'

// Visual test uses the PRODUCT component, never seeds its inputs. The test runner
// intercepts only /api/v1/* with synthetic data/identity; no live backend fallback.
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4">
  <header className="mb-6 grid gap-3"><p className="rounded border p-3 text-sm">QA LOCAL · inputs sintéticos · transporte/Auth simulados · no cotización real.</p>
    <div className="w-fit max-w-full rounded bg-[#efefef] p-3"><img src="/brand/marksman-logo.png" alt="MARKSMAN" className="w-64 max-w-full" /></div>
    <button className="min-h-11 justify-self-start rounded border px-3" onClick={() => window.dispatchEvent(new Event(sessionExpiredEvent))}>Simular vencimiento</button></header>
  <BenchmarkCalculator />
</main>)
