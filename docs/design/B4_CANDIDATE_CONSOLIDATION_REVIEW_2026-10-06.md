# B4 · selección del candidato frontend/API, antes de commit

## Entrega y límite

Preparada una [lista explícita de runtime con hashes](../reviews/B4_RUNTIME_CANDIDATE_REVIEW_2026-10-06.json): **96 cambios**, más6documentos ya versionados de dependencia directa. Incluye API/Web, catálogo/snapshots server-only, CSS del flujo y dos dependencias nuevas dentro docs (perfilJSON y escala del wizard). **No es todavía un candidato consolidado por commit ni un export limpio.** No se presenta HEAD como si contuviera los avances sin consolidar.

Base: codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd, checkout físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927. Huella del contenido seleccionado **1628b303b324a0ab137cd41df7cb5a402fc063cdb531bef0d915e3c10eca6fc9**: SHA256 de baseHEAD+registros/bytes seleccionados+dependencias. **No es SHA de Git commit, revisión humana, prueba de consentimiento ni autorización de despliegue.** gitCandidateCommit:null/readyForProduction:false.

El inventario expandido inicial contiene912entradas; las cifras anteriores de393 eran git status con carpetas untracked agrupadas, no912cambios nuevos de este turno.296archivos de scripts/tests de verificación y106capturas de fuentes quedan fuera de esta selección mínima de runtime. Su entrega completa sigue pendiente: package.json contiene también comandos de auditoría y los tests de reconstrucción necesitan sus datos. No desplegar una selección mínima incompleta como paquete integral ni afirmar reproducibilidad desde una copia limpia que no se probó.

## Revisión proporcional y elección

Se reutilizaron TypeScript compiler instalado (API/Webconfigs y sourceFiles), git status -z, scanner de secretos existente, contratos B4 y evidencia QA18:19. No nueva librería/infraestructura/stack ni otra arquitectura. Una selección por carpeta apps sólo perdería JSON/scale.mjs realmente importados desde docs; un staging masivo incluiría capturas y gates locales no revisados. **Lista acotada y revisable primero** elegida frente a ambos, con builds y verificación actuales, preservando originales y trabajo ajeno.

Solicitud humana «continu con el siguiente bloque» autoriza preparación local y correcciones necesarias, no push/deploy/Auth/DB ni adjudicar propiedad a todo el árbol. No staging ni commit durante este corte, índice previo vacío conservado, branch/HEAD sin cambio. Queda una decisión sobre evidencias antes de cerrar la consolidación. No rama/worktree/PR nuevos, ni se invocan launchers QA consumidos.

Codex/OpenAI ejecutor único. GPT-6.1 Sol/high recomendado/solicitado, modelo/esfuerzo efectivo y cuota/cargos desconocidos; Claude considerado y no necesario para inventario/builds verificables, Fable anterior1/1 sigue cerrado, cero llamadas nuevas/subagentes/IA de negocio. Presupuesto45min desde20:05 hasta20:50CDMX; una corrección causal del test de descarga y una repetición limpia de Web después, no retries externos. No nuevas tecnologías/licencias contratadas, compras o activación de uso extra.

Skills: engineering:deploy-checklist separa compilación/selección de revisión/CI/candidato/despliegue; systematic-debugging y TDD aislaron temporizador de test; verification-before-completion exige resultado final sin unhandled errors; Supabase limita build a configuración pública existente, sin credenciales privilegiadas ni cambios Auth. No UI modificada, se conservan wireframes/branding S2; los únicos cambios de implementación de este corte son **del test**, no del producto.

## Scanner: bloqueo que no se oculta

El scanner existente examina tracked+untracked no ignorados, no sólo HEAD. Terminóexit1 y señaló **patrones de clave Google** en9HTML bajo docs/research/sources. Se registran nombres en el manifiesto, nunca los valores. Ninguno pertenece a los96cambios seleccionados de runtime: selectedFileFindings:[] es intersección del resultado global con esa lista, **no aprobación del repositorio completo ni un nuevo scanner permisivo**.

No se verificaron propietario, restricciones o validez de esas cadenas, ni se usaron/probaron claves con API. No se afirma que sean claves de nuestro proyecto, tampoco que por aparecer en una página pública no importen. No se borraron archivos, editaron originales, relajaron patrones ni añadieron ignores para aparentar verde.

Los88pins B2 principales son JSON, pero varios módulos/tests verifican SHA de HTML originales mediante metadata archive. Por ello removerlos o sustituir bytes a ciegas rompería evidencia de reconstrucción; la selección mínima runtime no elimina ese requisito del bundle de verificación. El pack económico permanece intacto y no se recalcula/adopta para esconder el hallazgo.

Comparación de salida pendiente:

| Alternativa | Impacto | Recomendación |
|---|---|---|
| Commit masivo/cambiar scanner para aceptar todo | Publica material no revisado y oculta el guard | No autorizada/rechazada |
| Editar originales y reemplazar sus hashes automáticamente | Cambia evidencia y puede reinterpretar historial/modelo | Rechazada |
| Conservar originales íntegros fuera del commit y preparar evidencias depuradas, con lineage y validación explícita | Requiere separar entregables y resolver cómo accede la verificación a originales; no tocar importes/V3/Auth | **Propuesta para autorización humana, no implementada.** |

La propuesta no implica rotar/revocar claves ajenas, activar llamadas facturables ni inventar fuente alternativa. Antes de implementarla habrá que especificar originalSHA/derivadoSHA/ubicación y guardas, y confirmar que la aritmética y snapshots históricos no cambian. core.autocrlf:true y ausencia de .gitattributes observadas: también se debe comprobar preservación de bytes/hashes al preparar el commit/checkout; no se modificó esa configuración ni se verificó todavía un export limpio.

## Verificaciones realizadas

- API `npm run build`: exit0. Es compilación local, no ejecución de aplicación/SQL ni vercel-build (éste incluye caminos de migración y no se invocó).
- Web `npm run build` Next16.3.3: exit0, compilación30.0s/tipos20.2s/prerender14páginas. Config pública rateware-prod existente sólo memoria, NEXT_PUBLIC_SITE_URLquotes.heymarksman.com como **perfil de build local deseado**, API_URLloopbackpuerto1 aislada, sin DB/secret/Google/IAkeys ni credenciales persistidas. Nada asignó quotes a Vercel, modificó SiteURL compartido/allowlist o validó OAuth cloud. Guía env de Next instalado leída completa: NEXT_PUBLIC queda fijado al build; no confundir cambiar env después con reconstruir artefacto.
- Primer `npm test` Web:263tests/29archivos PASS pero**1unhandled error/exit1**,277.72s. URL.revokeObjectURL ausente después de restaurar mock mientras seguía pendiente el temporizador1000ms del producto. No fue suite verde; no se modificó el producto para un límite de JSDOM.
- RED focal: export test incorporó seguimiento de URLs vivas; encontró1cuando debía cerrar antes de restaurar el entorno. Corrección: finally espera la liberación real de la URL del test (hasta2000ms) y después restaura APIs/anchor, incluso si falla otra aserción. No eliminar timer ni silenciar error. Focal final24/24PASS en2archivos,10.54s.
- **Web completo final:**263/263PASS,29/29archivos,143.89s/exit0, sin unhandled errors. Ejecutado después del último cambio de test. No prueba browser/permiso humano, se conservan límites de mocks.
- Typecheck Web: se completó sin diagnósticos antes de ESLint. La invocación conjunta con guard explícito sólo falló en el paso lint. **Lint focal no verde:**4errores no-explicit-any en benchmark-calculator.test.tsx líneas33/61/89/130, fuera de las líneas144+ modificadas aquí; no se relajó regla ni modificó tipos ajenos para esconderlos. Global lint/verify:ci no ejecutados de nuevo ni certificados.
- API completo/RLS3313PASS/29SKIP/backup-restorePASS corresponden al [corte anterior19:44](B4_LOCAL_API_RELEASE_RUNNER_2026-10-06.md), no se presentan como reejecutados en este bloque. No API de negocio cambió aquí; un futuro bundle limpio necesita sus gates propios.

## Estado y siguiente decisión

Antes: cientos de cambios sin distinción entre ejecución, investigación y verificación. Ahora:96cambios de runtime identificados/hashados, dependencias docs explícitas, buildsAPI/Web comprobados y error asíncrono del test corregido; fuera de la lista queda el material por revisar, intacto. **Consolidación por GitSHA aún abierta**, scanner global y lint no verdes, no merge/push/deploy ni aceptación productiva.

Decisión necesaria: autorizar **preparar un paquete de evidencias depuradas para Git, conservando los originales y sus hashes fuera del commit**, sin modificar parámetros/fórmulas ni snapshots históricos, y definir validación de originales para el bundle. Tras esa decisión se resolverá el conjunto completo de soporte y se pedirá/reconfirmará consolidación local de la lista final; no commit masivo ni SHA inventado por este informe.

Rollback de este corte: retirar exclusivamente la espera/seguimiento de URLs añadidos al test y estos artefactos de revisión/entrada de estado; preservar todas sus ediciones anteriores, capturas, evidencias y archivos sin consolidar. Builds sólo actualizaron dist/.next/cachés ignorados, no cambian producción. Sin procesos propios/API/frontend/QA ni lease nuevo activados.
