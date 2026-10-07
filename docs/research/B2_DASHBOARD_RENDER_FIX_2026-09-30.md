# B2 · corrección autorizada del panel local

Usuario autorizó corregir el render local sin Auth, bases de datos ni producción. Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. AGENTS global/web y skills debug/testing/computer-use revisados; cambios ajenos preservados.

## Antes y causa reproducida

Registros locales del intento anterior: callback OAuth GET 307, luego GET / y TypeError `frame.join is not a function` (digest 1520508736). Esto indica fallo posterior al retorno; no prueba por sí solo sesión, cookies o renovación completas. API local 3002 sin listener/ECONNREFUSED. Nueva pestaña protegida sin sesión utilizable volvió al login; no se extrajeron cookies, códigos ni tokens y no se repitió Google por agente.

La reproducción aislada importa **el panel real**, con Next 16.3.3/Turbopack/RSC y el mismo fetch nativo hacia API local apagada, sustituyendo sólo módulo API dentro del proyecto de tests. Antes del cambio: **HTTP 500, frame.join reproducido** (digest 1304021434). Capturar la excepción no bastaba: `section()` conservaba Error/stack/cause como prop de SectionError. Next compilado intenta `frame.join` al reconstruir stack de depuración. Retirar esas props es causal en esta reproducción: mismo motor/dependencias/fixture da HTTP 200 tras la corrección. No se afirma un bug universal del proveedor ni una corrección de todos sus stacks.

Benchmark proporcional: manejo existente de errores parciales reutilizado y [guía oficial Next de errores esperables](https://nextjs.org/docs/app/getting-started/error-handling), además de guía instalada de Next 16.3.3. Comparación: (1) estados simples sin Error/stack, mínima y recomendada; (2) cambio de motor webpack reversible sólo si persiste; (3) upgrade Next/React, más alcance/retrabajo sin necesidad demostrada. Se aplicó únicamente (1); no instalación, actualización, package/lockfile, cambio del motor o arquitectura.

## Ahora

`section()` entrega `{status, kind}` serializable, nunca Error, cause, stack, mensaje interno o cuerpo de respuesta. HTTP 401/403 conservados, conexión rechazada/timeouts/502/503/504 diferenciados. Panel usa descriptor simple; datos exitosos parciales permanecen visibles. Actividad reciente no dice cero cotizaciones si la consulta falló. No cambia API compartida ni autorización del BFF. [Wireframe del estado existente](../design/dashboard-unavailable-wireframe.md), [captura SSR aislada](B2_DASHBOARD_UNAVAILABLE_2026-09-30.jpg).

## Verificación y límites

- **29/29 pruebas** de cuatro archivos: 17 nuevas de estado/árbol del panel y errores parciales; 12 existentes de callback y retornos seguros. Callback probado con mocks, no login externo nuevo.
- **Cuatro probes SSR Next real PASS**: fetch nativo rechazado, HTTP 401 sintético, HTTP 503 sintético, fetch rechazado tras recarga; todos HTTP 200, cinco alertas, sin frame.join ni falsa lista vacía. Fixture sin Supabase/layout autenticado, sólo loopback 4321. No despliega endpoint público ni crea bypass en la app. Browser confirmó panel y recarga con estilos originales; fallback Arial, sin shell autenticado/paridad total ni nueva matriz móvil.
- Vitest 1.6.1 registraba rechazo del spy de API aun con aserciones pasadas; se sustituyó el spy por función async/captura de llamadas en el test, no se ignoraron errores ni se alteró implementación para pasar tests. Prueba DOM de sección parcial y probes Next proporcionan evidencia de render separado.
- Typecheck web **PASS**; diff check **PASS**. Pruebas afectadas repetidas después del último cambio del panel. Sin build completo ni suite general innecesaria.
- App real localhost:3000 conserva / protegido: visitante anónimo obtiene 307 al login, BFF /api/v1/org obtiene 401. API 3002 permanece apagada; sin datos de negocio consultados o escritos.
- Auth/Site URL/lista de retornos y claves Google intactos en este corte; sin Neon/SQL/migraciones/usuarios/deploy/IA de aplicación. Maps/Routes nuevas **0/0**. No cookie dump ni captura de credenciales.

## Cierre y siguiente

**Fallo de render local reproducido/corregido; flujo autenticado completo aún pendiente.** Usuario debe iniciar login fresco desde http://localhost:3000/login. No reutilizar códigos ni mezclar localhost/127. Después verificar callback, sesión, recarga y renovación; API segura debe acreditarse antes del candidato Maps/Routes. B2 parcial, cero adopciones, 0/4 gates.

Recuperación: deshacer sólo los cambios de este corte en lib/dashboard-state.ts y app/(app)/page.tsx, conservando otros archivos ajenos. Fixture/tests/evidencia son nuevos y propios, sin efecto productivo; sesión fixture 75995 detenida al cerrar QA y puerto 4321 libre. Next app sesión 20110 sigue activa, cambios aplicados por HMR. No rollback Auth/DB necesario. No commit/publicación realizados.

Modelo recomendado: GPT-6.1 Sol · alto diagnóstico/implementación, medio siguiente comprobación de sesión. No selector cambiado ni consumo de tokens medido. Skills debug/testing guiaron reproducción antes/después y separación de pruebas simuladas/SSR/aceptación autenticada.
