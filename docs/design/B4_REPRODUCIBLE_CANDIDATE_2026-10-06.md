# B4 · validación de copia candidata y lint

## Objetivo y autoridad

Solicitud humana «continu con el siguiente bloque», después de entregar el paquete depurado: preparar/verificar localmente el candidato completo y corregir el lint acotado conocido. No stage/commit/push/deploy, Auth, Neon, migraciones externas, usuarios ni adopción de importes. Se permite PostgreSQL sintético desechable del runner existente, sin tocar infraestructura compartida. Checkout D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd; índice inicialmente vacío.

## Revisión previa y alcance

Se reutilizan manifiestos B4, tooling de evidencias, Git para enumerar fuentes, runner API/RLS existente, Vitest/ESLint/TypeScript y build Next16.3.3. Alternativas para lint: desactivar la regla (rechazado), cambiar tipos de producto sin necesidad (rechazado), tipar la proyección de campos usados por el test (elegido; sin cambio de aserciones ni datos). No dependencia/stack/licencia o tecnología nueva.

Para reproducción: construir una copia local nueva delimitada en D:, sin archivos de entorno/credenciales, caches ni launchers activados. Las dependencias instaladas se reutilizan mediante junctions explícitas; no se pretende demostrar npm ci desde una máquina vacía. Las nueve capturas con patrones Google quedan fuera del candidato distribuible y sus copias sanitizadas entran con hashes propios. Sólo para reconstrucción histórica se usa overlay local desde el vault verificado; NO se aceptan derivados en lugar de originales canónicos. La lista y hashes del candidato no incluyen ese overlay. Esto es copia de contenido aún sin commit, no checkout de un commit nuevo ni nuevo worktree/rama.

Cierre esperado: test acotado sin any/lint verde, inventario íntegro y hashes, scanner del candidato sin originales, builds/tests relevantes desde copia, errores/omisiones reportados y originales económicos/HEAD/índice preservados. CI global, nueva instalación de dependencias, browser multiusuario y despliegue siguen gates separados. No cambios UI: wireframes/branding existentes intactos.

Ejecutor actual Codex/OpenAI. Recomendado GPT-6.1 Sol/high; efectivos/cuota/cargos desconocidos y sin cambio nativo. Claude considerado, sin nuevo encargo: baja incertidumbre en tipos y copia verificable, cupo anterior cerrado. Cero Claude/subagentes/consumo IA negocio. Presupuesto45min desde21:47 hasta22:32CDMX, una corrida completa por capa y una corrección causal local si resulta necesaria; sin retries externos. Skills deploy-checklist, systematic-debugging, TDD y verification-before-completion. No activación de gasto ni nuevo proveedor.

## Evidencia

Preparada [lista completa de fuentes con hashes y gates](../reviews/B4_SOURCE_BUNDLE_REVIEW_2026-10-06.json): **1,495 archivos**, con11documentos Markdown añadidos tras detectar faltantes del empaquetado. Exportación fuente revisable en `D:/andre/validation/fcm-b4-source-review-20261006`: sin nueve originales restringidos, archivos de entorno, dependencias, dist ni .next. Copia de ejecución separada en `D:/andre/validation/fcm-b4-candidate-20261006-2152`: mismos archivos más dependencias instaladas enlazadas y overlay de9originales externos sólo para reconstrucción histórica. No nuevo repo/rama/worktree/commit.

Huella de baseCommit+records/bytes/SHA: **492fd2bd783622040c25bfa8fa2b4b986168985b5479e90dcdf80eeed0ba6351**. No SHA de commit ni aprobación humana. `newCommit:null`, `readyForProduction:false`. Git sólo enumeró/leyó: GIT_DIR del checkout existente y GIT_WORK_TREE de la exportación en los procesos de verificación; sin add/index alterno/checkout ni cambio de rama.

### Resultados efectivos

- Scanner existente: copia inicial1484PASS; exportación final **1495PASS/exit0**. Un intento concurrente encontró EBUSY durante la copia y NO fue PASS; se esperó y se repitió después de su terminación. Scanner intacto SHA355de5bc…; sin excepciones/ignores de originales ni reglas permisivas. El checkout original conserva sus9capturas; el verde sólo cubre la exportación sin overlay.
- Exportación1495/1495hashes sin drift, sin originales restringidos ni envs. Runtime anterior96+6dependencias:102/102intactos. Pack d1235ca788312cb5f0dd7b82a8354809ab93756e57bf5385483e52f0026d7df0 sin cambio. Git hash-object sin -w conserva bytes de6archivos críticos muestreados (dos registros, perfil confirmado, pack, snapshot y contrato llantas); no certifica checkout limpio completo/Linux/CI.
- API `npm run build` desde copia: exit0. No vercel-build/server/deploy.
- **Web `npm test`:263/263PASS,29/29archivos,0SKIP/sin unhandled/exit0,213.70s**. Tipos Web y ESLint focal exit0 después de corregir4casts any con proyección de campos reales, sin cambiar aserciones ni lógica de producto. Lint RED previo reproducido; no se presenta un cambio de tipos como nueva regresión funcional TDD.
- **API primer intento completo:**2187PASS/92FAIL/29SKIP,68archivosFAIL/151PASS/4SKIP,497.20s/exit1.45colecciones no construyeron sus casos. Diagnóstico focal reprodujo ENOENT del registro Markdown; también faltaban freshness/registro1oct. No era verde ni un nuevo fallo del motor. Corregida sólo la lista/copia añadiendo11Markdown originales, sin cambiar sus hashes ni los supuestos.
- **API completo final:3313PASS/29SKIP/0FAIL**,219archivosPASS/4SKIP/223total,1027.15s/exit0 después de añadir soporte. Runner FullSuite existente, Docker local/cache postgres17-alpine; migraciones existentes/replay sólo en fixture desechable.6testsRLSllantas+2cohortSQL ejecutados. Backup/restore PASS: dossiers3/events9/packages2/v2snapshots2/v2heads1/7tablasRLSforzadas iguales, rol sin superuser/bypass.29SKIP:partner-base12/partner-cost9/family-base6/quote-preview2; no certificados. No OAuth/QAhumano/DBproductiva validados de nuevo.
- Tooling de evidencias desde copia:13/13PASS/0SKIP y lineage9/9 contra vault. No cambios económicos, usuarios externos, operaciones de negocio, compras ni IA auxiliar.

### Compilación y dependencias

El preparador falló antes de lanzar Next por quoting de PowerShell y valores públicos entre comillas. Diagnóstico sin imprimirlos; se reutilizó dotenv.parse instalado, manteniendo la guarda de URL aprobada/prefijo publishable. Build sólo recibió esos dos valores públicos existentes en memoria, API_URLloopbackpuerto1, NEXT_PUBLIC_SITE_URLquotes como perfil local deseado, telemetría desactivada y credenciales privilegiadas removidas del child. No .env nuevo ni SiteURL/allowlist/Auth/Google modificados. Skill Supabase limita cliente a configuración pública; [documentación de claves](https://supabase.com/docs/guides/getting-started/api-keys) revisada. Changelog.md no recuperable por content-type del visor; no se implementó característica/migración Supabase nueva.

**Turbopack default falló**: junction de node_modules apunta fuera de su raíz. Retirar junctions fue rechazado por política antes de ejecutar; no se retiraron ni se intentó hacerlo con otra herramienta. Robocopy no ejecutado; no instalación, next.config ni package.json alterados. CLI help instalado verificó --webpack: **`npm run build -- --webpack` PASS/exit0**, compilación90s/tipos42s/14páginas. Prueba compilación alternativa, **NO certifica default ni adopta Webpack**. Junctions siguen intactas; npm ci limpio no ejecutado.

### Lint y gates pendientes

Primer npm run lint original:825errores/9289warnings/exit1, incluyendo .next generado dentro del fixtureSSR. Se corrigió el ignore existente de `.next/**` a `**/.next/**`, sin desactivar reglas/excluir fuentes o tests. Config copiado a validación y **npm run lint real completo repetido:39errores/10warnings/exit1**. No verify:ci verde.

| Archivo Web | Errores | Causa |
|---|---:|---|
| app/(app)/scenarios/benchmark/benchmark-form.tsx | 1 | set-state-in-effect |
| tests/b2-evidence.test.tsx | 4 | any |
| tests/benchmark-dossier.test.tsx | 11 | any |
| tests/benchmark-form-context.test.tsx | 2 | any |
| tests/cost-base-navigation.test.tsx | 1 | any |
| tests/google-review-map.test.tsx | 7 | any |
| tests/google-route-review.test.tsx | 3 | any |
| tests/own-relay-review.test.tsx | 6 | any |
| tests/version-wizard-page.test.tsx | 3 | any |
| tests/visual/version-wizard.tsx | 1 | prefer-const |

## Resultado y siguiente corte

Antes: selección mínima sin todo el soporte, lint focal rojo y sin prueba desde copia. Ahora: exportación1495con scanner/hashes, reconstrucción histórica/API/RLS/backup-restauración y Web263desde copia; tipos focales y alcance del lint corregidos. **Consolidación/release B4 abiertos**, sin atribuir avances al HEAD antiguo.

Siguiente: corregir39errores reales con sus pruebas y disponer dependencias dentro de una copia nueva sin enlaces para validar default/instalación limpia, sin retirar enlaces existentes ni eludir rechazos. Después lista final y autorización puntual para consolidación local por GitSHA. Producción/quotes, Auth compartido, aceptación económica y browser multiusuario son gates separados. QA18:19 permanece cerrado, no repetir con permisos consumidos.

## Rollback

Revertir únicamente el tipado nuevo de los cuatro casts del test y los artefactos de este bloque. Conservar todos los cambios anteriores. La copia de validación es prescindible; verificar su ruta absoluta y retirar junctions antes de cualquier limpieza recursiva futura, sin eliminar dependencias enlazadas, vault ni repo. No modificar el índice/Git ni producción.
