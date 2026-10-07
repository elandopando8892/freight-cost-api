import path from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../../../..'),
    resolveAlias: { '@/lib/api': './api-fixture.ts' },
  },
}
export default config
