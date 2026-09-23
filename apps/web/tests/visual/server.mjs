import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const server = await createServer({
  root, configFile: false, envDir: false,
  resolve: { alias: { '@': root, 'next/link': fileURLToPath(new URL('./test-link.tsx', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  server: { host: '127.0.0.1', port: 4317, strictPort: true,
    headers: { 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:4317; font-src 'self' data:; form-action 'none'" } },
})
await server.listen()
console.log('Synthetic component QA only: http://127.0.0.1:4317/tests/visual/index.html')
