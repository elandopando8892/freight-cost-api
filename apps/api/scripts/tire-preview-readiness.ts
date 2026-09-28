import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { evaluateTirePreviewReadiness } from '../src/modules/cost-bases/tire-preview-readiness.js'

const marker = process.argv.indexOf('--evidence')
const evidencePath = marker >= 0 ? process.argv[marker + 1] : undefined
if (!evidencePath) throw new Error('--evidence <path> is required')
const evidence = JSON.parse(readFileSync(resolve(evidencePath), 'utf8'))
const result = evaluateTirePreviewReadiness(evidence)
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
if (!result.ready) process.exitCode = 1
