import { createRoot } from 'react-dom/client'
import { BenchmarkCalculator } from '../../app/(app)/scenarios/benchmark/benchmark-calculator'
import '../../app/globals.css'
window.fetch = async () => { throw new Error('QA: network blocked; no authentication or API') }
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4">
  <p className="mb-4 rounded border p-3 font-bold">QA LOCAL · RED BLOQUEADA · SIN SESIÓN REAL</p>
  <BenchmarkCalculator />
</main>)
