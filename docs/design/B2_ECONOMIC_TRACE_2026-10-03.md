# B2 · Traza económica de escenarios (corte local)

## Objetivo y revisión previa

Hacer revisable el recorrido fuentes → inputs → tasas → CFU/CVU del calculador D2D existente. No adoptar comparadores, calibrar importes ni publicar bases.

Inspección actual: `benchmark-rates.ts` ya conserva dependencias canónicas y fuentes; `benchmark-d2d.ts` conserva inputs del viaje y aportaciones por recurso; `benchmark-owned-d2d.ts` calcula la caja compartida una sola vez. `benchmark.routes.ts` descarta ese linaje y entrega solamente totales y fuentes del remolque. El frontend ya tiene `ReviewResults`, contrato Zod y desplegables nativos.

Comparación proporcional al cambio:

| Alternativa | Ajuste y costo | Decisión |
| --- | --- | --- |
| Proyectar resultados existentes y reutilizar ReviewResults | Sin dependencia, infraestructura ni segunda fórmula; conserva reglas y permisos | Elegida |
| Recalcular o reconstruir dependencias en el navegador | Duplica lógica, introduce divergencia y mantenimiento | Descartada |
| Nueva plataforma administrativa | No resuelve el descarte del linaje; agrega integración | Descartada para este corte |

Se reutiliza la decisión documentada en `docs/research/EXTERNAL_STACK_CRUD_BENCHMARK_2026-10-03.md`; sus candidatos no se reinstalan ni se consideran acceso actual a servicios. La capacidad diferencial es la composición económica y asignación del FCM; desplegables, validación y enlaces son estándar y se reutilizan.

## Alcance y flujo

El operador calcula con inputs explícitos. Si el servidor reporta faltantes, conserva la vista sin total. En un escenario completo puede expandir la traza y revisar tractor MX, tractor US y caja compartida. Cada recurso muestra sus aportaciones y distingue inputs originales, tasas derivadas, datos del viaje y fuentes con fechas/limitaciones. La caja agrega adquisición, horizonte, residual, interés y gastos originales del escenario. Frontera sigue separada de CFU/CVU.

No se leen archivos de investigación desde el handler, no se consultan bases, ni se recomputan fórmulas para formar la vista. El contrato de transporte serializa los dos tractores comunes una sola vez en `sharedTractorResources`; cada escenario conserva su caja. El parser valida y expande esos recursos sin operaciones económicas, y comprueba las aportaciones contra los totales ya entregados. Los resultados importados siguen siendo declarados: la consistencia estructural no autentica el JSON ni sus fuentes. Respuestas antiguas sin traza siguen admitidas y muestran que ésta no está disponible.

## Wireframe y handoff

```text
Escenario [id] · DOCUMENTADO, NO VERIFICADO
CFU  | CVU | Frontera | Total calculado/declarado
▸ Traza económica · 3 recursos
  ▸ Tractor MX · CFU $… / CVU $…
    Revisión, fecha, alcance (tractor sin caja)
    CFU distancia / CFU tiempo / CFU asignado
    Desglose variable: combustible, mantenimiento, llantas, operador, peajes
    ▸ Tasas y dependencias
      ▸ [tasa] [valor unidad]
        [sección · campo · clave] [valor unidad] [justificación] [ids fuente]
    ▸ Datos del viaje
    ▸ Fuentes (país, observado, vigencia, limitaciones y enlace HTTPS)
  ▸ Tractor US (misma estructura)
  ▸ Caja compartida (una sola aportación; capital/gastos y utilización)
Fuentes no verificadas; no es precio comercial ni calibración.
```

Mantener tokens MARKSMAN y componentes actuales: fondo/card, bordes, texto principal y naranja `text-primary`; sin nueva paleta ni reinterpretación de marca. Desktop conserva dos escenarios; móvil una columna. Campos largos envuelven sin scroll horizontal. `details/summary` nativos, foco visible, apertura por teclado, fuentes externas con noopener/noreferrer. Todo cerrado inicialmente; no llamadas adicionales al expandir. Estados: vacío, incompleto, completo con traza, legado sin traza y contrato inválido.

## Criterios de cierre y ejecución

- API entrega linaje solo de escenarios completos, sin alterar sus resultados económicos; caja una vez y scopes locales de fuentes sin colisión MX/US.
- Dependencias proceden de `parameterLineage.requirements`, valores de resultados originales y metadatos del catálogo; ningún default nuevo.
- Contrato rechaza números no finitos, URLs inseguras, referencias inexistentes, duplicados y traza inconsistente con totales.
- Roles, organización verificada, no-store y rechazo de datos extra del cliente se conservan.
- Pruebas unitarias/de handler/componente y validación visual sintética desktop/móvil. No equivalen a sesión Supabase real ni aceptación económica.

Responsable: Codex. Proveedor recomendado/elegido previamente: OpenAI, gpt-6.1-sol, esfuerzo solicitado alto; modelo/versión/esfuerzo efectivos no observables. Claude es candidato equivalente, pero sumar proveedor/contexto para este contrato determinista no aporta ahorro comprobado y no hay autorización de invocación en este corte. Presupuesto de trabajo: 60 minutos orientativos, cero inferencias auxiliares, cero llamadas facturables, hasta dos reparaciones diagnosticadas por la misma causa. Tokens/cuota/cargos efectivos desconocidos; no activar créditos. Sin despliegue ni cambios de Auth, DB o infraestructura.

## Recuperación y límites

Conservar copia previa de los tres archivos de implementación existentes y la suite histórica de rutas en `tmp/b2-economic-trace-checkpoint/`. En `benchmark-dossier-flow.test.ts` se añaden únicamente aserciones de traza/no-store y rechazo de inyección. Rollback: revertir únicamente los hunks de este corte, comparando esas copias y sin borrar cambios anteriores/ajenos; retirar los nuevos archivos exclusivos solo si no tienen cambios posteriores. No usar checkout/reset sobre el árbol sucio.

## Evidencia de cierre local · 2026-10-04 05:55 UTC (3 de octubre en México)

Repositorio físico: `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Árbol previamente sucio conservado. Sin commit, rama nueva, despliegue, cambios de Auth, DB o infraestructura.

Pruebas finales tras la última modificación de implementación/fixtures:

| Capa | Resultado observado | Límite |
| --- | --- | --- |
| API: benchmark-route, b2-evidence, projection, d2d, owned-fixed, dossier-flow, rates | 165/165, siete archivos | HTTP real local vía Fastify inject; identidad/roles simulados, Prisma bloqueado |
| Web: economic-trace, review, calculator, dossier | 43/43, cuatro archivos | Componentes/contratos con datos sintéticos |
| Typecheck API y web | Ambos exit 0 | No build ni despliegue |
| ESLint focal: cuatro módulos web y dos fixtures/tests | Exit 0, cero errores y warnings | No lint de todo el repositorio |
| Chrome headless: traza | 34/34 | 1440×1000 y 390×844; teclado, tres recursos, inputs, fuentes, recarga, legado e incompleto; sin overflow/excepciones/HTTP externo |
| Chrome headless: continuidad anterior | 26/26 | Regresión local con shim Next; no router Next productivo ni Supabase real |

Evidencia visual: `tmp/b2-economic-trace-evidence/results.json`, `trace-1440.png`, `trace-390.png`; ambas capturas revisadas visualmente. La expansión es progresiva: sólo un recurso y una tasa abiertos en las capturas. Fixture generado por `node --import tsx apps/api/scripts/generate-economic-trace-qa.ts`; sus importes son QA, **no investigación, precios ni inputs productivos**. SHA256 del JSON generado: `09634254B251BD78C5D120637C055EEF8B27BB28A07B23ED3939288B470A647C`.

Pruebas de error incluyen fuente/dependencia inexistente, duplicados, URL insegura, vencimiento, alcance incorrecto, componentes/totales contradictorios y números no finitos. El contrato wire compartido rechaza orden ambiguo y caja duplicada. Se verificaron veinte escenarios sintéticos dentro del límite previo de un millón de caracteres; esto no prueba que veinte expedientes con todos los textos al máximo quepan en él. No se elevó ningún límite.

Reparaciones diagnosticadas, sin modificar fórmulas:

1. La proyección inicial repetía tractores y alcanzaba 1,368,262 caracteres en veinte escenarios. Se normalizó el transporte para compartirlos una vez. La integración API → parser usa la salida real calculada y comprueba igualdad con tasas/costos originales.
2. Importar el motor en tests/fixture web arrastraba un error de tipos preexistente de Prisma (`ProcessEnv`/`DatabaseEnvironment`). Se eliminó esa dependencia web y se generó un JSON QA desde una CLI de backend; ambos typechecks finales pasan.
3. La ampliación de la suite encontró cuatro fallos antiguos de `benchmark-route.test.ts`: esperaba un cálculo completo usando recapeadas independientes positivas. Se utiliza el fixture sintético explícito sin ellas y se añade una prueba del rechazo original. No se alteró el fixture histórico ni la guarda; los nuevos totales esperados siguen siendo exclusivamente sintéticos.
4. Lint inicialmente se ejecutó desde una carpeta sin configuración; se corrigió al directorio web. Se retiraron dos variables de descarte no usadas; lint focal final limpio.

Archivos de implementación: nueva `apps/api/src/modules/engine/benchmark-review-projection.ts`, cambio acotado en `benchmark.routes.ts`; nuevas `economic-trace-contract.ts` y `economic-trace.tsx` en `apps/web/app/(app)/scenarios/benchmark/`; cambios acotados en `review-contract.ts` y `benchmark-review.tsx`. Pruebas/fixtures: `benchmark-review-projection.test.ts`, `fixtures/benchmark-review-trace.ts`, `benchmark-route.test.ts`, `benchmark-dossier-flow.test.ts`, `generate-economic-trace-qa.ts`, `economic-trace.test.tsx` y los cinco artefactos `tests/visual/economic-trace*` / `verify-economic-trace.mjs`.

Hashes sin cambio durante el corte: `engine.outputs.ts` `3640A05D4CC10820F84DE5F295F8D7E0413AD48A87A3921BE8981336B6EF5D8B`; lock `ED99EE3B784F30A6BC166B5CCEC08D0B1FD1326C12E6418EF29DA93E7971DFAF`; manifests web/API sin cambio. `git diff --check` focal exit 0. El servidor QA de este turno, PID 11076 / loopback 4330, fue detenido tras verificar su comando; no se dejó listener y no se tocaron procesos ajenos.

Resultado: desarrollado y probado **localmente**, no desplegado ni utilizado para una operación. El linaje económico ahora es revisable, pero ni las fuentes ni los importes están automáticamente autenticados/adoptados. Siguen pendientes la suficiencia y calibración por sección de B2 y su aceptación económica; el inspector público no alimenta automáticamente la captura. No se declara cerrado B2 por este corte. No se necesita decisión humana para este resultado local; adoptar/publicar bases o cambiar producción requiere su autorización puntual.
