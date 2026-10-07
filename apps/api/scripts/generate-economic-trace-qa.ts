import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { economicTraceFixture } from '../tests/fixtures/benchmark-review-trace.js'

// Generated synthetic test artifact only. No env loading, DB, provider calls or product input writes.
const output = fileURLToPath(new URL('../../web/tests/visual/economic-trace-sample.json', import.meta.url))
const fixture = economicTraceFixture()
writeFileSync(output, `${JSON.stringify(fixture, null, 2)}\n`)
console.log(`Synthetic QA artifact generated: ${output}`)
