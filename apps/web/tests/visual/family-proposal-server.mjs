import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
const root=fileURLToPath(new URL('../../',import.meta.url))
const server=await createServer({root,configFile:false,envDir:false,resolve:{alias:{'@':root}},esbuild:{jsx:'automatic'},
  server:{host:'127.0.0.1',port:4740,strictPort:true,headers:{'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:4740; font-src 'self' data:; form-action 'none'"}}})
await server.listen()
console.log('UI transport/identity synthetic only: http://127.0.0.1:4740/tests/visual/family-proposal.html')
