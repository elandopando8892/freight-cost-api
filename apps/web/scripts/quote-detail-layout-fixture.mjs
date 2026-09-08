/** Local visual regression fixture: real source classes/CSS, synthetic header content.
 * Open /before and / at 390 px; never serves Auth or connects to an API.
 */
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(web, 'package.json'))
const page = await readFile(resolve(web, 'app/(app)/quotes/[id]/page.tsx'), 'utf8')
const confirmation = await readFile(resolve(web, 'app/(app)/quotes/[id]/quote-confirmation.tsx'), 'utf8')
const actions = page.match(/<div className="([^"]+)">\s*<ShareButtons/)?.[1]
const confirmed = confirmation.match(/if \(status === 'CONFIRMED'\) return <div className="([^"]+)"/)?.[1]
const header = page.match(/<header className="([^"]+)"/)?.[1]
if (!actions || !confirmed || !header) throw new Error('Header source changed: update fixture extraction.')
const cssFile = resolve(web, 'app/globals.css')
const css = (await require('postcss')([require('@tailwindcss/postcss')({ base: web })])
  .process(await readFile(cssFile, 'utf8'), { from: cssFile })).css
const labels = ['Copiar enlace', 'Copiar resumen', 'Imprimir / PDF', 'Revisar propuesta', 'Paquete Rateware', 'Volver a cotizar', 'Eliminar']
function html(before) {
  const actionClass = before ? 'flex shrink-0 flex-wrap items-center gap-2 print:hidden' : actions
  const confirmationClass = before ? 'text-right text-xs text-emerald-700' : confirmed
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FCM · Layout QA ${before ? 'antes' : 'corregido'}</title><link rel="stylesheet" href="/style.css"><style>:root{--font-geist-sans:Arial;--font-geist-mono:monospace}button{padding:8px 12px;border:1px solid #999;white-space:nowrap}</style><body><main class="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4"><h1>Prueba local · datos ficticios</h1><header class="${header}"><div class="min-w-0 max-w-full"><h2>Cotización confirmada</h2><p>Ruta · base · versión</p></div><div data-qa="actions" class="${actionClass}">${labels.slice(0,3).map(x=>`<button>${x}</button>`).join('')}<div data-qa="confirmation" class="${confirmationClass}"><div>Confirmada por una persona</div><div>operador.con.nombre.muy.largo.de.prueba@ejemplo.test · 08/09/2026 12:00</div><div class="mt-1 max-w-64 text-muted-foreground">${'NotaSinEspacios'.repeat(10)}</div></div>${labels.slice(3).map(x=>`<button>${x}</button>`).join('')}</div></header><p>Sin sesión, red externa ni acciones de negocio.</p></main></body></html>`
}
const server = createServer((request, response) => {
  const path = request.url?.split('?')[0]
  if (!['/', '/before', '/style.css'].includes(path)) { response.writeHead(404); response.end(); return }
  response.writeHead(200, { 'content-type': path === '/style.css' ? 'text/css' : 'text/html; charset=utf-8', 'cache-control': 'no-store' })
  response.end(path === '/style.css' ? css : html(path === '/before'))
})
server.listen(0, '127.0.0.1', () => console.log(`Fixture: http://127.0.0.1:${server.address().port} (/before para reproducir el defecto)`))
