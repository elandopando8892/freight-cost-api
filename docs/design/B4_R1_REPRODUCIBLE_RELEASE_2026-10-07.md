# R1 · candidato reproducible y compilación API sin migraciones

## Encargo

Autorización humana «autorizo» del 7 de octubre de 2026, posterior a la propuesta
local de R1 en B4_RELEASE_REVIEW_2026-10-07.md. Base Git
689432674e65619352318182e2cc05fc97af53d8, rama codex/cost-tires-release-s14,
checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927.
Entrega local, sin commit/push/publicación ni cambios de Auth, bases, usuarios,
valores económicos, fórmulas, snapshots o originales históricos.

Responsable: Codex/OpenAI en sesión actual. Recomendado GPT-6.1 Sol/high para
implementación y verificación: causas conocidas, cambios acotados y contratos
comprobables. Modelo/versión nativos y esfuerzo efectivo no observables desde
esta actividad; no se cambia modelo. Claude Fable 5.1 considerado: el costo de
transferir contexto no aporta una validación necesaria para estas causas y su
encargo anterior está cerrado; cero llamadas nuevas. Cuota/tokens/cargos no
observables. Presupuesto local: 45 minutos desde 08:34 CDMX, hasta dos ciclos de
corrección por causa; cero reintentos externos, nuevas instalaciones o inferencias.
Skill engineering:debug: reproducción, aislamiento, causa y regresión verificable.

## Benchmark y decisión

1. Conservar bytes mediante atributos Git versionados. Solución nativa, gratuita,
   sin dependencia o servicio; aplicable también a futuras fuentes del directorio.
   [Git gitattributes](https://git-scm.com/docs/gitattributes) documenta que -text
   desactiva la conversión de fin de línea. Recomendado frente a cambiar cada
   configuración global de Git (no portable) o recalcular hashes (altera evidencia).
2. Reutilizar tools/evidence-package: ya dispone de manifiesto, SHA, derivación y
   protección de rutas. Se agrega lectura explícita de originales desde vault
   externo con ese mismo contrato. Frente a copiarlos al repositorio o sustituirlos
   por derivados, evita exposición y mantiene la identidad documental.
3. Reutilizar Prisma 5.22.0 y TypeScript instalados para generar cliente y compilar.
   Es un comando adicional; no se cambia vercel-build.ts ni sus confirmaciones.
   La documentación [Prisma generate](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)
   redirige a v7, por lo que la compatibilidad se decide con la CLI instalada 5.22.0
   y su ejecución real, sin adoptar ejemplos/configuración v7.

Sin UI ni flujo visual nuevo: se mantienen branding y wireframes existentes.
La capacidad estándar aquí es empaquetado/verificación; el modelo de costos
diferencial permanece intacto. No hay costos recurrentes ni infraestructura nueva.

## Contrato implementado

- .gitattributes conserva bytes de docs/**, Markdown, snapshots y paquete B2.
  Las reglas anteriores permanecen. No se normalizan originales ni se cambian pins.
- verify:evidence-checkout compara en memoria los blobs de HEAD con filtros Git
  autocrlf=true/false usando atributos de trabajo; se incorpora a verify:ci.
  No modifica índice/configuración ni afirma aprobar cambios sin commit como HEAD.
  Las 15 pruebas del manejo de evidencias se incorporan como test:evidence-package
  al mismo gate verify:ci.
- test:runtime-package valida el paquete congelado y sus 24 casos sin investigación.
  family-base-reconstruction.test.ts permanece en la suite completa y exige
  reconstrucción exacta. No se sustituye la suite por el subconjunto runtime.
- Ante un original ausente, el lector de investigación requiere explícitamente
  FCM_EVIDENCE_VAULT. Sólo admite el original registrado, con SHA y derivación
  verificados. No copia archivos ni hace consultas. Un archivo local presente
  conserva prioridad y su fallo de integridad nunca se oculta usando el vault.
- build:release ejecuta sólo herramientas instaladas: prisma generate y tsc.
  Pasa un entorno mínimo, URL sintética de loopback puerto 1, sin credenciales
  heredadas, hooks NODE_OPTIONS ni auto-instalación Prisma. Falla sin reintento
  si cualquiera de los dos comandos falla. No inicia API ni invoca SQL/migración.

## Comandos y límites de uso

Desde checkout Git: `npm run verify:evidence-checkout`.
Desde apps/api: `npm run test:runtime-package` y `npm run build:release`.

Reconstrucción local con originales externos: definir FCM_EVIDENCE_VAULT sólo
en el proceso de diagnóstico con la ruta del archivo previamente verificado,
luego `npm run verify:research-package` o `npm test`. No configurar esa ruta como
variable de runtime/Vercel ni subir originales a CI. Sin originales, el gate de
investigación falla de forma explícita; eso no es aprobación parcial de CI.

El futuro despliegue sin migraciones requiere seleccionar expresamente
`npm run build:release` en su configuración autorizada. El launcher existente
vercel-build mantiene sus efectos y no debe ejecutarse bajo ese alcance.
Esta entrega no configura Vercel ni garantiza que un deployment use el nuevo comando.

## Verificación

| Comprobación real | Resultado |
|---|---|
| check-checkout.mjs | 672 archivos idénticos a blobs HEAD con ambos filtros Git; exit 0 |
| node --test de evidence-package (3 archivos) | 15/15; incluye vault, corrupción, sustitución por derivado, rutas y duplicados |
| Focal API en workspace | 6/6: runtime 3, reconstrucción 1, build-only 2 |
| test:runtime-package en exportación sin originales ni variable vault | 3/3; exit 0 |
| verify:research-package en esa exportación, sin vault | exit 1 esperado, RESEARCH_SOURCE_REQUIRED con ruta faltante; no skip |
| verify:research-package con vault explícito | exit 0, paquete exacto, 8.933.593 bytes descomprimidos |
| build:release en exportación | exit 0: cliente Prisma 5.22.0 generado y TypeScript compilado |
| scanner vigente sobre exportación del candidato | 1.569 archivos, exit 0; Git usado sólo como inventario, índice intacto |
| scanner final después de correcciones y reportes | 1.571 archivos, exit 0; incluye ambos reportes JSON de prueba |
| verifyPackage con vault existente | 9 originales y 9 derivados verificados, 41 redacciones, manifiesto sin cambios |
| Suite API completa, primera pasada | exit 1: 225 archivos; conteo de assertions: 3.288 passed, 20 failed, 31 skipped; adicionalmente un archivo RLS falla al preparar colección por ausencia de fixture |
| Regresión afectada después de corregir los lectores restantes y el entorno CLI | 147/147, 9 archivos, exit 0, 52,66 s; cero skips |

RED/prevención: los dos tests nuevos de lectura desde vault fallaron inicialmente
porque no existía esa capacidad; después pasan. La primera compilación aislada
falló porque la copia incluía dependencias raíz pero no apps/api/node_modules;
se completó la copia física de esas dependencias instaladas y pasó. No se cambió
código por ese fallo ni se descargaron paquetes. Es una compilación aislada con
dependencias existentes, no evidencia de npm ci ni de Linux o CI remoto.

Exportación ordinaria nueva, sin Git repo/worktree:
D:/andre/validation/fcm-r1-release-20261007-0844, creada con
`git -c core.autocrlf=true archive --worktree-attributes HEAD` más overlay explícito
de los cambios R1. Dependencias: 40.817 archivos, cero enlaces; originales
restringidos presentes en candidato: cero. El lector utiliza el vault externo
D:/andre/evidence-vault/fcm-b4-20261006 con acceso local de lectura.

Paquete y snapshots comparados contra blobs de HEAD, sin cambios:

- b2-family-source.pack.json: d1235ca788312cb5f0dd7b82a8354809ab93756e57bf5385483e52f0026d7df0.
- b2-own-relay.snapshot.json: c174750445a619a04e25b2fc5dadf64eafbb4c68097889300578a9986ffc63dd.
- b2-evidence.snapshot.json: 5a94f5ad1ba353edc2b7a84cfc56a70d6947f14b27927f2efab3da56f580afea.

Los 88 sourcePins del snapshot coinciden con el SHA de sus archivos actuales.
Git diff en apps/api/src y docs/research está vacío.

La pasada completa identificó 19 fallos de acceso al original MRO mediante el
lector independiente readRouteSource y uno por la whitelist del entorno del CLI
de planeación, que omitía la ruta de investigación. Se reutilizó readOriginal en
ese lector conservando su schema de rutas y hashes; al subprocess de prueba sólo
se agregó FCM_EVIDENCE_VAULT. Los 20 fallos se resuelven en la regresión afectada,
incluyendo los otros consumidores del lector de rutas (147 assertions). No se
tocaron tarifas, comportamiento del motor, snapshots ni expectativas económicas.

El archivo tire-calibration-rls-postgres.test.ts exige desde su colección una base
PostgreSQL desechable fcm_tire_s8. El comando npm test directo no la prepara. Su
error ocurrió antes de conectar; no es una regresión SQL ni una prueba RLS aprobada.
El runner existente test-tire-preview-isolated.ps1 sí crea ese fixture y aplica
migraciones locales, por lo que no se ejecutó bajo el alcance actual sin SQL ni
migraciones. Tampoco se agregó skip ni se cambió la guarda para obtener verde.
Las pruebas PostgreSQL del corte anterior conservan su evidencia histórica, no
se presentan como nuevas. El reporte JSON global incluye skipped dentro de su
numPassedTests (3.319); aquí se usa el conteo real de assertionResults (3.288) para
evitar inflar los aprobados. No se declara una ejecución completa verde.

Reportes mecánicos conservados en la copia de validación:
api-test-results.json (primera pasada), api-affected-results.json (regresión final).
El único ajuste posterior a la primera pasada en build-only.test.ts añadió tipos
al mock; se volvió a ejecutar en la regresión final. Los cambios posteriores de
package.json son conexiones de comandos ya ejecutados, sin alterar producción.

El scanner del workspace sigue dando exit 1 únicamente por los nueve originales
históricos no versionados. No se debilita ni se borran/ignoran originales para
obtener verde. verify:ci completo no ejecutado en este corte: pruebas Web/UI,
auditoría de dependencias y aceptación autenticada no se presentan como nuevas.
El flujo CI completo requiere acceso aprobado a originales para investigación;
no se ha configurado almacenamiento o distribución remotos. La prueba de
portabilidad corre sobre el Git local y los atributos candidatos; el resto sobre
la exportación con overlay, no sobre un nuevo commit inexistente.

Estado del corte: implementación local terminada y contratos afectados verificados.
Queda pendiente una certificación global con fixture PostgreSQL y el entorno CI
autorizado; no se amplía este encargo a SQL, almacenamiento remoto ni publicación.

## Rollback y siguientes gates

Cambios locales sin commit: revertir únicamente los hunks de R1 revisados y retirar
sus archivos nuevos si se solicita, preservando recibos/informes y trabajo previo.
No reset, borrado de vault ni modificación de snapshots. Validación en directorio
ordinario de D:/andre/validation, sin rama/worktree adicional.

R2 sigue siendo aceptación económica de los casos existentes; R3 publicación y
aceptación autenticada del mismo SHA en Web/API. quoteReady:false, adoptedValues:0
y calibración/adopción operativa pendientes conservan su significado. El éxito de
R1 no los convierte automáticamente en aprobados.
