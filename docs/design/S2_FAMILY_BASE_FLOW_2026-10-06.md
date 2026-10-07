# S2 · Propuesta por familias desde B3

Objetivo: un operador recupera el cálculo B3 y conserva su propuesta por familias
en la misma base/versión, sin recalibrar V3, adoptar inputs ni habilitar cotización.
Desarrollo local autorizado por «adelante continua», 6 octubre 2026.

## Revisión previa y decisión

Se reutiliza el benchmark externo CRUD del 3 octubre, vigente para este flujo:
[comparación A/B/C](../research/EXTERNAL_STACK_CRUD_BENCHMARK_2026-10-03.md).
Next/React, componentes existentes, BFF y Fastify ya resuelven pantalla, sesión y
transporte; Refine/ra-core añadirían adaptación sin sustituir los comandos de dominio.
No se instala dependencia ni proveedor. Reinspeccionados factories B3/familias,
locks, página de planeación y contratos. Es estándar guardar/recuperar; lo específico
es la procedencia económica y su separación respecto a adopción/publicación.

Fuente runtime: importar scripts de investigación introduce filesystem e import.meta
fuera del build API; JSON completo ocupa 8.933.593 bytes. Se elige paquete gzip/base64
inmutable generado offline con zlib nativo, verificado contra los mismos hashes B2.
Se conservan todos los casos y números; nunca se genera presupuesto desde HTTP.
El navegador recibe sólo estado/procedencia, no los 8,9 MB ni otro motor.

## Flujo y wireframe

Dentro de la página actual, después de conservar el cálculo y antes del detalle:

```text
Planeación del viaje / escenario B3 existente
  CFU / CVU / costo de planeación
  [Guardar cálculo]             [Recuperar cálculo guardado]
┌ Propuesta por familias ──────────────────────────────────────┐
│ Conserva el cálculo guardado como presupuesto de referencia.  │
│ No adopta inputs ni publica la base.                           │
│ Estado: sin consultar / ninguna / vigente / anterior           │
│ Revisión propuesta N · cálculo B3 N · 32 partidas fijas         │
│ 0 inputs adoptados · sin calibración · no cotizable             │
│ [Consultar propuesta] [Guardar propuesta por familias]         │
│ Fuentes y huella (detalle desplegable)                         │
└───────────────────────────────────────────────────────────────┘
```

Móvil: mismo orden, botones envuelven y ocupan al menos 44 px; texto/hash quiebra
sin scroll horizontal de página. La tabla B3 conserva su región desplazable.
Usar tokens y Button existentes de MARKSMAN, sin nueva paleta, fuente o logo.
Panel con encabezado h3/aria-label; status/alert, foco visible existente, sin modal.

Estados: antes de recibo B3 indica «Guarda primero el cálculo». Consultar es GET
sin caché; sólo después de recuperar estado se habilita guardar. CURRENT impide
duplicar con UUID nuevo. STALE conserva procedencia anterior pero no la presenta
como presupuesto del cálculo actual. 409 exige recuperar propuesta y cálculo;
no sobrescritura ni retry automático. Fallo incierto conserva exactamente UUID y
comando para replay; 401/403, cambio de cuenta/contexto o salida retiran el panel.
Cada nuevo recibo B3 remonta el panel, sin reutilizar estado de otra revisión.

## Contratos y aceptación

GET/PUT `/cost-bases/:id/versions/:versionId/family-proposal`, dentro del scope
autenticado existente, ADMIN/OPERATOR, no-store. PUT sólo referencias técnicas:
contexto, revisión propuesta, fingerprint versión, recibo/revisión B3, snapshot,
UUID. No importes o JSON económico cliente. Store actual deriva y guarda un
evento auditado; entrega resumen mínimo validado con scope/contexto/recibo/hash.

Cierre local exige: pack original/tamper; HTTP identidad/rol/límites/body estricto,
conflicto/replay; UI recorrido/errores/replay/cambio de contexto/vencimiento;
tipos/builds/suites; wireframe y browser desktop/móvil/teclado. PostgreSQL local
real separado del transporte/UI sintéticos; ninguna prueba local implica OAuth
real, adopción, despliegue o aceptación operativa.

Responsable Codex. Recomendado OpenAI GPT-6.1 Sol, esfuerzo solicitado alto;
modelo/esfuerzo nativos observados y tokens/cuota desconocidos. Claude es candidato
para revisión incierta de arquitectura/UI, pero aquí la incertidumbre está acotada
y el flujo es verificable: no llamada adicional, gasto ni cambio de modelo.
Presupuesto de este corte 90 min, máximo 2 reparaciones por causa; ante agotamiento
o segundo bloqueo conservar checkpoint y pedir decisión, sin ampliar accesos.

Rollback: retirar sólo nuevos módulos/pack/tests/panel y hunks de registro/render
de este corte. No reset, migraciones, borrado de eventos o cambios de valores.
Auth, QA cerrada, producción, otros usuarios/aplicaciones y source B2 no se tocan.

## Entrega y evidencia local

Checkout físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927,
codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd,
verificados antes de escribir y al cierre. No commit ni worktree/branch adicional.

Antes: bridge/store probados, pero sin fuente runtime ni endpoint/panel. Ahora:
paquete server-only, servicio transaccional registrado dentro del scope autenticado,
resumen HTTP pequeño y panel React real dentro de B3. El PUT transporta siete
referencias técnicas, nunca presupuesto cliente. Guardado incierto conserva UUID,
bloquea el editor B3, permite consultar/replay y no reintenta automáticamente.
Cambios de referencia, 401/403 o sesión vencida retiran la propuesta; CURRENT no
habilita otra escritura idéntica, STALE no sustituye el cálculo actual.

Paquete generado por `package-family-base-source.ts --create`, exclusivo `wx`,
comprobado por `--check` sin modificarlo: 1.605.589 bytes JSON sin LF final,
archivo1.605.590bytes,8.933.593 bytes
descomprimidos, 24 casos intactos. SHA de contenido completo
`6ae06c901a0a378ad2a7560f4a4becbdb1e629f9979863e8dd8f6a7e38167a61`;
SHA archivo generado con LF final
`D1235CA788312CB5F0DD7B82A8354809AB93756E57BF5385483E52F0026D7DF0`.
El scenario SHA B2 continúa
`a8598d73a31f62246d540c293aee548f971a35096b0f1f0742341e42c2473655`.
No cambia un importe: decode exige checksum/tamaño, cases y pins originales, aun
si se rehace el checksum del envelope. Límites medidos 2 MB base64/10 MB salida;
no carga del pack desde HTTP ni importación al cliente. Runtime CJS compilado
decodificó y verificó los 24 casos sin scripts, DB ni fuente online.

Verificación después de los últimos cambios afectados:

- API focal source/HTTP: **5/5 PASS**; modelo original/tamper, identidad/roles,
  comando estricto, contexto, conflicto 409, bodyLimit 413 y replay de transporte.
- PostgreSQL real descartable: **5/5 PASS**, último inicio 00:50:33, duración23.79s,
  exit0. Usa pack runtime + lector B3/store reales con rol limitado. Guardado y
  nuevo cliente, replay, duplicados/otra identidad, concurrencia, baseline210
  intacto; HTTP GET/replay real entrega menos de5kB sin familyInput y mantiene
  cinco eventos (no un sexto). Middleware de identidad es sintético: no JWT real.
- Web focal **16/16 PASS**; integración del bloqueo del editor padre incluida.
  Suite web final **251/251 PASS**,28archivos,inicio00:53:21,duración125.15s,exit0.
- API amplia **3281 PASS/30 SKIP**,214archivosPASS/1FAIL/5SKIP,220archivos,
  inicio00:39:55,duración793.10s,exit1. Única suite bloqueada en colección:
  `tire-calibration-rls-postgres.test.ts`, falta su env obligatorio loopback
  `FCM_TEST_ADMIN_DATABASE_URL` para fcm_tire_s8; cero tests ejecutados fallidos.
  Cinco de30SKIP son familias y pasaron por separado; los25restantes no certificados.
  Run amplio comenzó antes del rename técnico fixedEntryCount; afectados repetidos
  por los focales y PostgreSQL posteriores. No se relajó el guard ni hubo release verde.
- Build API y Next16.3.3 **exit0**, tipos web **exit0**. El primer build Next falló
  por `.js` en el import compartido; corregido al patrón extensionless ya existente
  y repetido. El fixture se tipó mediante RelaySnapshot.parse, sin casts de enums.
  Lint focal nuevo: exit0; al incluir editor B3 hay0errores/1warning del counter
  preexistente. Lint global desnudo anterior no verde:830errores/9290warnings,
  incluye artefactos generados, tests y benchmark-form ajenos; no se repitió todo
  ese alcance tras el cleanup focal. No limpieza masiva. Inspección de los bundles
  `.next/static` finales:0hits del formato del pack/gzipBase64 (rg exit1 esperado
  por no coincidencias), coherente con la separación server-only.

Los RED iniciales detectaron módulos ausentes. Fallos de pruebas durante desarrollo:
fixture compartía context/scope y mutarlo cambiaba también la expectativa; ahora
copias independientes. Test padre inicial conservaba el editor vacío por cambiar
props sin remount; ahora arranca como página recién abierta y comprueba disabled
heredado del fieldset. Ninguna corrección relajó permisos o el contrato económico.

## Navegador y límites de cierre

Servidor own loopback4740/fixture con CSP y bloqueos de solicitudes externas.
Identidad/transporte y guardado **sólo en memoria**; no BFF/Auth/DB reales. Chrome:
AX confirmó Consultar→NONE→Guardar→CURRENT/revisión1,32partidas/0adopciones/no
cotizable y botón de duplicación deshabilitado. Eso prueba interacción accesible
inicial, no validación visual final ni persistencia tras recargar.

La apertura IAB expiró sin crear pestaña. En Chrome, captureScreenshot expiró dos
veces y, tras recarga, AX informó capture changed before committed dos veces.
Se detuvieron los intentos; no screenshot generado ni aceptación móvil/teclado.
Viewport1280 temporal restaurado; sólo pestaña own cerrada y servicio own terminado.
Los logs Vite muestran reloads de `.next/server/*.html` y `api/dist/*` concurrentes
con builds: **posible contribución al bloqueo, no causa confirmada**. Próxima prueba
debe ejecutarse sin builds/HMR simultáneos y con observación estable, sin sustituir
evidencia por captura sintética ni ampliar Auth para resolverlo.

Runner PostgreSQL sólo usó Docker local, DB fcm_family_s2,tmpfs,identidades sintéticas,
46migraciones ya existentes (sin nueva migración) y finally/restauración env. Own
contenedores descartados; fixtures no recuperables pero recreables. No servicio
API real/lease/gate QA/Neon reabierto, usuario Supabase, OAuth, despliegue o producción.

Estado: **endpoint/panel desarrollados y funcionalmente probados localmente**.
Pendientes: aceptación visual desktop/móvil/teclado y recorrido autenticado del
panel bajo autorización vigente; revisión/adopción económica explícita sigue
separada. Sprint2/B4 no se declaran cerrados ni base calibrada/publicada.

Skills utilizadas: codebase-design mantuvo bridge/store/reader y kernel; frontend-design
y design:design-handoff conservaron MARKSMAN y wireframe/estados; test-driven-development
orientó los casos antes de implementación; vercel:react-best-practices separó pack
server-only y contrato browser-safe; systematic-debugging explicó tamaño/imports/
fixtures antes de corregir; verification-before-completion distingue cada capa.

Archivos del corte: family-base-source/contract/routes/service y pack, generador,
tests source/routes/PG, cliente family-proposal, panel/render de OwnRelayReview,
tests UI y fixture/servidor visual, este documento/status. Retirar sólo esos hunks
para rollback; preservar el store/bridge, investigación, parámetros y cambios ajenos.
