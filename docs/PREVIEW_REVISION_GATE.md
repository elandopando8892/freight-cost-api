# Revisión de versiones antes de QA autenticada

Fecha: 2026-09-08. Base local `06bc5ab7c7a3e18b1ecb2bdff8754f6da28904b3`.
Rama `codex/supabase-auth-slice`, worktree limpio al iniciar en D:.

## Narrativa

La revisión comercial estaba lista localmente, pero no se debe probar un preview
anterior y atribuirle el resultado del nuevo código. La consulta de sólo lectura
de Vercel confirmó proyectos web/API, equipo y repositorio. Los deployments más
recientes consultados no declaran la revisión local: web `b4bdd4d`, API `f6e0d64`
con `gitDirty=1`. READY no demuestra que contengan la funcionalidad terminada.

Se añadió una comprobación reutilizable de metadatos: revisiones completas,
proyectos/equipo/repositorio esperados, estado READY, destino no productivo,
orígenes limitados, deployments distintos y evidencia de menos de 24 horas.
Bloquea metadatos ausentes/malformados, revisiones distintas y código marcado dirty.
No descarga dependencias, lee credenciales, ejecuta red ni toca datos de negocio.

## Evidencia y reproducción

Fuente: Vercel `list_teams`, `list_projects`, `list_deployments` para cada proyecto
y `get_deployment` por cada ID. Captura redactada en
`docs/evidence/preview-revisions-2026-09-08.json`. Se omitieron datos personales.
El equipo corresponde al ámbito solicitado a Vercel y el repositorio al enlace
de los proyectos; no se deducen del prefijo del hostname.

```powershell
npm run verify:preview-revisions -- --evidence=docs/evidence/preview-revisions-2026-09-08.json --sha=06bc5ab7c7a3e18b1ecb2bdff8754f6da28904b3
```

Resultado esperado de esta captura: BLOCK, `WEB_SHA_MISMATCH`,
`API_DIRTY_SOURCE`, `API_SHA_MISMATCH`; posteriormente también caducidad.
No cambiar su fecha para hacerla pasar. Obtener una nueva lectura del proveedor
para cada revisión, contrastar IDs y exportar únicamente los campos del esquema.

Validación ejecutada: 16 pruebas del gate y 4 de cobertura OAuth aprobadas;
build TypeScript API aprobado y `git diff --check` sin errores. La CLI aplicada
a la captura viva devolvió código 1 con las tres razones esperadas. No se repitió
la suite completa de negocio ni el build web porque no cambió su código.
El intento de lint API no pudo ejecutarse: ese workspace no tiene script `lint`;
no se registra como aprobado.

El archivo es evidencia declarada, no una atestación firmada. Un PASS sólo acredita
coherencia de esos metadatos: no prueba los archivos desplegados, upstream efectivo,
configuración OAuth, callback, rol, sesión ni renovación. La ausencia de gitDirty
no prueba que la fuente estuviera limpia. Este comando es un precheck manual de
QA de preview, no sustituye ni se incorpora como aprobación automática a CI.

## Siguiente paso y límites

1. Preparar frontend/API del mismo SHA aprobado, sin migraciones ni seed.
2. Verificar el upstream efectivo del BFF hacia ese API, no sólo las dos URLs.
3. Actualizar evidencia y ejecutar este gate y el gate OAuth existente.
4. Ejecutar AUTH-11/12 con cuenta y cotización sintética autorizadas. No crear
   usuarios, cotizaciones ni propuestas como atajo; la matriz sigue pendiente.

No se desplegó, hizo push ni cambió Auth, producción, Neon, usuarios o infraestructura.
No se cambió UI: se conservan los wireframes del incremento anterior.
Rollback: revertir exclusivamente el commit de este gate; no requiere rollback
de datos ni afecta los previews existentes.

Guía aplicada: testing-strategy, separando comprobación de metadatos, integración
y prueba autenticada. Modelo recomendado: GPT-5.6 Sol, esfuerzo medio para el gate
y alto para revisar límites de confianza. Ejecución en Codex sin delegación;
modelo/selector efectivos no verificados desde el entorno.
