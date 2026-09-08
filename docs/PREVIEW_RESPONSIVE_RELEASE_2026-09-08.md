# Detalle móvil: validación en preview alineado

Observación: 2026-09-08, cierre 17:07 UTC. Rama `codex/supabase-auth-slice`,
checkout `D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830`.

## Resultado visible

El arreglo local de las acciones del detalle está publicado en preview y probado
con sesión ADMIN existente. Las acciones se distribuyen en varias líneas en móvil.
No se rediseñaron otros recorridos. Wireframe: `design/proposal-review-wireframe.html`.

| Vista real | Ancho de ventana | Ancho del documento | Resultado |
|---|---:|---:|---|
| Detalle móvil | 390 | 375 | Sin overflow horizontal |
| Detalle desktop | 1280 | 1265 | Sin overflow horizontal |
| Detalle desktop amplio | 1440 | 1425 | Sin overflow horizontal |
| Revisión comercial móvil | 390 | 375 | Resultado visible sin overflow |

La diferencia de 15 px corresponde al espacio de scrollbar. Baseline anterior:
documento de 1197 px en ventana de 390 px. Mediciones DOM y capturas observadas
en Chrome; las capturas quedaron en la conversación, no se adjuntan como archivos.

## Release y trazabilidad

SHA desplegado en ambos proyectos: `00cfa519bcc4141a33a3124033a992acc65aea84`.
Los commits documentales posteriores no forman parte de este despliegue.

- Web: https://freight-cost-gv29f3bx3-elandopando8892s-projects.vercel.app
- API: https://freight-cost-7w7v6aqjz-elandopando8892s-projects.vercel.app
- IDs, proyectos, equipo y revisiones: `evidence/preview-release-00cfa51.json`.
- Ambos READY, target preview (`null` en metadatos), `gitDirty=0`, sin aliases.
- Exportación sólo de archivos versionados mediante `git archive`; SHA-256 ZIP:
  `F9863739740748F135D47B1C19697727662F685D9F94D52E49E8BCC5CD9EACBC`.
- Escaneo de secretos: PASS, 427 archivos versionados.
- API_URL de este despliegue web apunta a esta API; no se cambiaron variables compartidas.
- Health 200 a las 17:03:31Z; ready 200 a las 17:03:32Z con base conectada.
  Ambos reportaron el SHA esperado. Readiness usa lectura, no mutación.
- Build API: generación Prisma Client seguida de
  `Production migrations skipped outside Vercel Production.` a las 17:02:43Z.
  Ref no staging y confirmación de migraciones staging deshabilitada.
- Lint/typecheck/build web: PASS del incremento local anterior; build cloud READY.

## Prueba autenticada real y límites

Google Sign-In completado en el nuevo origen con cuenta ADMIN existente; regreso
a la app, panel y detalle accesibles. La recarga posterior conservó rol y sesión.
Esto demuestra el flujo de login funcional, no una inspección de tokens.

Revisión comercial real sobre cotización confirmada existente del piloto; cliente
ficticio `QA responsive — no enviar`, vigencia 2026-09-10. La respuesta mostró
`VISTA PREVIA · SIN GUARDAR`, ruta, equipo y tarifa 2,100 USD. Se cerró la revisión
y se restauró el viewport. La fuente NO fue totalmente sintética. No se pulsaron
guardar, confirmar, eliminar, enviar ni operaciones de negocio.

Una consulta temprana de logs del endpoint no devolvió entradas; no se considera
prueba de status HTTP. El resultado funcional aquí se sustenta en la UI real.
OPERATOR, VIEWER, aislamiento entre organizaciones, renovación por expiración y
el recorrido completo de la matriz siguen pendientes. No se declara QA global PASS.

Sin cambios de Auth, Site URL, usuarios, permisos, Neon, migraciones, producción,
infraestructura compartida, comunicaciones ni consumo de IA de la aplicación.

## Rollback y gate

Para retirar esta revisión basta volver a usar la pareja preview anterior `7a3d92d`:

- Web: https://freight-cost-7xpqa49bc-elandopando8892s-projects.vercel.app
- API: https://freight-cost-f9a008ivm-elandopando8892s-projects.vercel.app

Ambos permanecen intactos; no hace falta promover, borrar ni modificar Auth.
El preview anterior conserva el defecto móvil. No hay rollback de datos necesario.
Antes de cada release repetir `verify:preview-revisions`, comparar SHA/API_URL y
probar detalle/revisión a 390, 1280 y 1440 px además del login real. El gate de
metadatos no sustituye esa prueba autenticada ni autoriza producción.

Gate ejecutado con `evidence/preview-release-00cfa51.json` y SHA completo: PASS
(`DECLARED_DEPLOYMENT_METADATA_ONLY`). Sus campos authenticatedQa PENDING,
upstreamRouting NOT_VERIFIED y oauthCoverage NOT_VERIFIED conservan el alcance
limitado del script; la evidencia de navegador se registra separadamente arriba.

## Modelo y método

Recomendación por actividad: GPT-5.6 Sol medio para despliegue, responsive y
documentación; esfuerzo alto para revisión de Auth. El selector real no se verificó
y no se afirma haber cambiado de modelo. La skill deploy-checklist guió el control
de mismo SHA, alcance preview, migraciones deshabilitadas, evidencia y rollback.
