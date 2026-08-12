import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

// Local development accepts an app-level or workspace-level `.env.local`.
// Hosted environments inject process variables directly; `override: false`
// ensures an explicit deployment secret is never replaced by a local file.
for (const path of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '../../.env.local')]) {
  loadEnv({ path, override: false, quiet: true })
}
loadEnv({ override: false, quiet: true })

import { buildApp } from './app.js'
import { env } from './config/env.js'

const app = buildApp()

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`Freight Cost API running on port ${env.PORT}`)
})
