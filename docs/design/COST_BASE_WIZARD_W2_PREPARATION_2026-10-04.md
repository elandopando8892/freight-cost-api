# W2 · preparación autorizada y perfil operativo incompatible

**W2 no cerrado. No se crearon base, versión ni rol.**
Autorización humana «autorizo» recibida después del preflight PostgreSQL: crear
una base NO COMERCIAL, un borrador clonado sin importes nuevos/activación y el
rol temporal de máximo 24 h con los grants exactos documentados. Esta autorización
no cambia metodología ni permite sustituir el relevo propio solicitado por un
through-tractor, cambiar validadores del motor, parámetros históricos o Auth.

## Resultado comprobado

- Checkout físico D:, rama `codex/cost-tires-release-s14`, HEAD
  `4f5fc2de0c3d178dace917231e1092040dec21fd`; cambios ajenos preservados.
- Preflight READ_ONLY reutilizando el lector Vercel/Neon existente: nuevo rol
  y código de base ausentes, 210 parámetros origen; no secreto impreso/guardado.
- Hash SHA256 del origen completo, incluyendo params ordenados por id:
  `47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346`.
- Un intento explícito de preparación se detuvo en `create-review-base`.
  No retry de creación, rol/GRANT, rotación ni rollback automático.
- Diagnóstico posterior real a las **2026-10-04T19:41:07.181Z**, transacción
  READ_ONLY, constató **cero bases con el código aprobado y cero roles con el
  nombre aprobado**; hash origen idéntico. Conexiones cerradas.
- Validaciones puras sobre los 210 parámetros reales: cero problemas de
  identidad canónica, cero problemas de dominio numérico y cero problemas entre
  campos. No se corrigió ni recalibró ningún importe.
- El mismo input de alta propuesto falla `CreateCostBaseSchema.safeParse` en
  `applicabilityProfile`: «YARD_TRANSFER y PARTNER_HANDOFF necesitan un modelo de
  costos de terceros; la versión V3 sólo soporta THROUGH_TRACTOR.»

La preparación asignó YARD_TRANSFER al relevo propio MX/US, misma caja. Esa
clasificación **no está admitida por el contrato actual**; no es evidencia de que
los parámetros históricos estén mal. `operational-segments.ts` describe hoy
D2D_BINATIONAL_OWN como operación propia con cruce through-tractor. La base de
planeación B2 y el perfil SaaS/motor no deben declararse equivalentes sin revisión.
No cambiar el perfil a THROUGH_TRACTOR sólo para conseguir un alta exitosa.

## Revisión previa y artefactos locales

Benchmark vigente reutilizado: [alternativas W2](COST_BASE_WIZARD_W2_2026-10-04.md)
y [permisos/contexto PostgreSQL](COST_BASE_WIZARD_W2_DATABASE_PREFLIGHT_2026-10-04.md).
Se conserva el alta/auditoría existente y metadata append-only, no tablas, paquetes
o servicio nuevos. Se separa el proceso administrativo del runtime autenticado
para que el owner nunca sea la credencial de aplicación.

Archivos propios preparados, aún sin runtime operativo demostrado:

- `apps/api/src/config/w2-local-gate.ts`: whitelist exacta y grants por columna.
- `apps/api/tests/w2-local-gate.test.ts`: rutas, verbos, IDs, SQL fijo y bloqueo de
  perfil incompatible; sin normalización silenciosa a through-tractor.
- `apps/api/scripts/prepare-w2-review-base.ts`: alta por servicio existente dentro
  de una transacción, locks/hash origen y auditoría. Falló el input antes del alta.
- `apps/api/scripts/start-w2-authenticated-gate.ts`: preflight, proceso admin
  separado, rol temporal, comprobación efectiva de columnas/PUBLIC/definers,
  runtime loopback sólo auth/me, health/ready y wizard del target exacto; una
  decisión diesel-mx MARKSMAN y replay. Después del diagnóstico, validación del
  perfil adelantada antes del child y DDL. **No probar ni lanzar esta ruta como
  writer hasta resolver el perfil**; el precheck actual la rechaza expresamente.

El deadline del launcher es fijo **2026-10-04T20:30:00Z** para el bloque iniciado
a las 19:30 UTC; restart no extiende ese plazo. No es un servicio permanente,
automatización ni política global. No se preparó credencial DPAPI nueva ni se
descifró la vieja; ningún password de rol llegó a existir en este corte.

## Verificación después de la última modificación

`vitest run` en tres archivos focales: **41/41 PASS** (15 de guardas, 19 de wizard
versionado, 7 de rutas), exit 0. DB/proveedor simulados; el test de perfil comprueba
el rechazo vigente, no soporte de relevo propio ni persistencia real.

El `tsc --noEmit` general API falló con dos diagnósticos de nulabilidad en el
archivo previo ajeno `src/modules/engine/trip-fuel-review.ts`, líneas 79 y 81.
Comprobación de scripts incluyendo la declaración Fastify vigente informó esos
mismos dos diagnósticos; no declarar typecheck verde. El primer comando de scripts
omitió esa declaración y produjo diagnósticos de `request.user`; al incluirla
desaparecieron. No se modificó trip-fuel-review.ts. No build/release completo.

Sesión real, intercambio OAuth, guardar metadata, recarga/reinicio, replay real,
roles/otra cuenta/expiración reales: **no ejecutados**. Inventario de navegador
solamente; no extracción de cookies/tokens ni automatización de autenticación.
No API o frontend de este gate arrancados, ni procesos ajenos detenidos.

## Decisión pendiente y rollback

Hace falta autorizar un corte distinto de compatibilidad metodológica:
**auditar el relevo propio MX/US, misma caja, frente a las fórmulas y el perfil SaaS;
corregir la validación sólo si se demuestra soporte del motor existente**.
Si exige nuevas fórmulas/asignación de costos, proponer el cambio antes de
implementarlo. No sustituir el escenario humano ni inventar inputs. No ampliar
automáticamente el presupuesto/vigencia del gate original.

DB/roles no tienen cambios comprometidos de este corte que revertir; historial
origen conservado. Rollback local por archivos propios: retirar los cuatro
artefactos arriba y sólo las referencias/checkpoint propios, sin reset, staging,
commit, borrar historial ni modificar cambios ajenos. El launcher no está
registrado en el servidor estándar ni se agregó a scripts de paquete.

Responsable: Codex/OpenAI. GPT-6.1 Sol/high recomendado y elegido por continuidad
de la propuesta autorizada; modelo/esfuerzo efectivos desconocidos. Presupuesto
local finito 60 min, un intento de preparación, **0 retries de escritura**; se
detiene ante el perfil rechazado. Sin Claude, subagentes, IA auxiliar, APIs pagadas,
deploy, migración, Auth ni producción. Cuota/cargos reales no observables.
Skills: codebase-design separó el adapter administrativo y el runtime; testing-strategy
separó evidencia simulada/real; documentation registra el bloqueo y rollback;
computer-use sólo permitió inventario de navegador, no prueba de login.
