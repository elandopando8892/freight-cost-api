import { createRoot } from 'react-dom/client'
import { BenchmarkCalculator } from '../../app/(app)/scenarios/benchmark/benchmark-calculator'
import '../../app/globals.css'
import schema from './benchmark-form-schema.json'
window.fetch = async path => {
  if (path === '/api/v1/engine/benchmark-owned-d2d/form') return new Response(JSON.stringify(schema), { status: 200 })
  throw new Error('QA: network blocked; no authentication or API')
}
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4">
  <p className="mb-4 rounded border p-3 font-bold">QA LOCAL · CONTRATO ESTÁTICO · SIN SESIÓN REAL NI CÁLCULO REMOTO</p>
  <BenchmarkCalculator />
</main>)
