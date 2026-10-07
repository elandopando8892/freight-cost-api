# W2 · diagnóstico único con rollback

## Objetivo y autoridad

Humano «Autorizar diagnóstico acotado» responde a petición de nueva ventana45min, una sola ejecución del preparador en el mismo Neon Preview y cierre obligatorio. Inicio observado `2026-10-05T03:36:54Z`, deadline fijo `2026-10-05T04:21:54Z` = 4oct21:36:54–22:21:54México. Fuente explicit_user_instruction, no renovación automática/política global ni referencia infalsificable. Consumo/errores previos conservados. Sin ampliar a Auth/Google, producción, migraciones, usuarios de aplicación, fórmulas, valores económicos o cotizaciones; tampoco servidor/API/web/login nuevo.

Resultado buscado: un código/fase del fallo real, o prueba de que la preparación completa puede ejecutarse y revertirse; confirmar después inventario, fuente y cierre. No equivale a persistencia autenticada ni cierre W2. [Corte anterior y rollback Auth](W2_REVIEW_GATE_AMENDMENT_2030_2026-10-04.md), [adapter/wireframe reutilizado sin UI nueva](W2_REVIEW_CONTEXT_IMPLEMENTATION_2026-10-04.md).

Responsable Codex/OpenAI, GPT-6.1 Sol/high recomendado por continuidad, contexto local y verificabilidad; modelo/esfuerzo efectivos y cuota/tokens/cargos desconocidos. Claude considerado: una segunda revisión externa no recupera el error que fue descartado y requiere contexto/ruta adicionales; no invocado. Sin auxiliares/modelos nuevos/uso extra. Presupuesto45min, **un lanzamiento de escritura diagnóstica**, sin fallback ni relanzamiento; comprobaciones READ_ONLY de cierre apropiadas. Máximo dos correcciones locales justificadas, no otra iteración de benchmark de tarifas.

Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, checkout físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`; dirty preservado. C: es fachada; ruta antigua de AGENTS C ya no existe. Instrucciones humanas y `D:/andre/apps/codex-home/AGENTS.md` leídas completas. Sin AGENTS API adicionales encontrados. Skills debug, testing-strategy y documentation: causa antes del fix, simulación separada de DB real, evidencia/rollback de cierre.

## Benchmark proporcional y solución mínima

Runtime real instalado Prisma/client5.22.0, Node24.21.0, sin upgrade. Se compararon: (A) volver a --apply/commit y arrancar runtime, innecesario para diagnosticar; (B) modificar create/createMany o aumentar timeout sin error concreto, no justificado; (C) reutilizar preparación/transacción y lanzar rollback intencional antes del commit, con lectura independiente después. **C seleccionado**, sin nueva tecnología/licencia/infra ni cifra de ahorro inventada. Capacidad estándar Prisma, no innovación propia. El diferencial B2 económico queda intacto.

Fuentes primarias compatibles cotejadas con tipos/runtime instalado: [clase de validación tag5.22.0](https://raw.githubusercontent.com/prisma/prisma/5.22.0/packages/client/src/runtime/core/errors/PrismaClientValidationError.ts), [error conocido tag5.22.0](https://raw.githubusercontent.com/prisma/prisma/5.22.0/packages/client/src/runtime/core/errors/PrismaClientKnownRequestError.ts), [referencia clásica de errores](https://www.prisma.io/docs/orm/v6/reference/error-reference), [transacciones clásicas](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions). La documentación ORM genérica vigente usa otro modelo de envelopes y **no se trasladó** al runtime5.22.0. P2028 no prueba por sí solo timeout; P2010 requiere SQLSTATE conocido sin mensaje/SQL. No revelar metadata/error bruto.

Nuevo --diagnose sólo ejecuta el hijo administrativo con preparación idéntica (clone210 raw, binding separado y DDL rol exacto) dentro de la misma transacción; señal propia de rollback sólo se lanza si la preparación termina. Fallos reales se propagan y nunca se convierten en éxito. Padre verifica por READ_ONLY source/base/users sin cambio y target/rol ausentes; retorna antes del runtime. `--apply` rechazado y hijo sin diagnosticOnly=true/autoridad exacta rechazado. No persistencia comercial ni una API administrativa expuesta. Rollback se verifica, no se infiere del exit0 del hijo.

Diagnóstico extendido exclusivamente a clase real PrismaValidation, códigos Pdddd, SQLSTATE en lista fija para P2010 real y nombres estables de guardas exactas; no mensajes/stacks/SQL, actores, valores/URLs ni metadata arbitraria. Diferencia entre timeout del hijo y error transaccional. Observer de etapas del preparador sólo en memoria. Las pruebas sintéticas de rollback demuestran control de flujo, **no rollback PostgreSQL**.

## Criterios y rollback

1. Preflight pinned y source210 verificables; ningún fallback de target/credencial/rol.
2. Un --diagnose como máximo; fallo incierto implica inventario sólo lectura y parar.
3. Capturar fase/código seguros, sin afirmar causa retroactiva del intento anterior.
4. Ausencia de target/rol después y hash fuente conservado, conexiones cerradas; si rol propio inesperadamente existe, cleanup NOLOGIN sólo con marker de esta ventana/0sesiones. No borrar archivos/bases ajenos.
5. Suites focales y tipos después de última modificación. W2 pendiente de guardado/recarga/replay auténticos, sin confundirlos con preparación rollback.

Rollback local: retirar sólo flag/helper/observadores/diagnóstico y fechas de este corte; no reset general ni sobrescribir cambios previos. No rollback Auth necesario: configuración ya restaurada y no tocada en esta ventana. Lanzamiento y resultado se registran abajo; documento no autoriza una segunda llamada.

## Lanzamiento reservado

Suite final21:44:45México:104/104PASS,7archivos,4.70s; TSC estricto focalexit0. Se reserva **intento1/1 --diagnose** para esta autorización/deadline. Aunque falle antes del hijo, no relanzar el mismo comando automáticamente ni resetear el contador mediante otro ID. No --apply, sólo rollback diagnóstico; no otras escrituras. Inicio exacto y resultado de la salida se añadirán al cierre.

## Resultado real: diagnóstico completado

Lanzado único `--diagnose` a las `2026-10-05T03:45:41Z` (21:45:41México), proceso21625. Preflight real: rol/target ausentes, source210, hash `47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346`. Campo histórico de salida `apply:true` indica permiso para operaciones **transitorias del diagnóstico**; el argumento fue --diagnose, no --apply, y se exigió rollback.

Salida final exit0 observada a las `03:47:13Z`:

```json
{"event":"W2_DIAGNOSTIC_ROLLBACK_VERIFIED","sourceUnchanged":true,"sourceBaseUnchanged":true,"usersUnchanged":true,"reviewBaseAbsent":true,"temporaryRoleAbsent":true,"sourceHash":"47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346","runtimeStarted":false,"authenticatedPersistenceTested":false}
```

Preparación completa y rollback PostgreSQL **reales**, con lectura independiente posterior y comparación de huellas de fuente/base/usuarios. No sólo tests/exit0 del hijo. No quedaron borrador, binding asociado a ese borrador ni rol; conexiones owner/hijo desconectadas por finally, sin runtime/servidor iniciados. No procede NOLOGIN de un rol inexistente. Hash fuente igual a los preflights anteriores. Auth/Google no llamados/modificados, ni usuarios/fórmulas/valores/migraciones/producción. Intento1/1 consumido, no automáticamente disponible otra vez.

El fallo anterior **no se reprodujo**. No afirmar que fue timeout/network, ni que el logging lo corrigió; la causa histórica permanece desconocida. Sí queda comprobada la viabilidad del preparador actual en el mismo Preview, sin cambiar nested create/grants/30s. El siguiente objetivo de negocio sigue siendo guardar y recuperar una revisión en el wizard, no otra investigación técnica ni de tarifas.

Se solicita enmienda humana explícita de **un intento adicional de persistencia QA** antes del mismo deadline22:21:54, sin reset de consumo: clonar el mismo borrador no comercial, runtime limitado y sesión sales existente, guardar/recargar/replay y cleanup NOLOGIN/0sesiones. Sin cambios Auth/Google ni fallback de identidad/target. **Pendiente respuesta: no ejecutado ni habilitado --apply por la solicitud misma.** Si no se autoriza o la sesión no basta, conservar diagnóstico cerrado y W2 operativo abierto. Renovación de sesión/segundo HTTP replay no probados en este corte.

Comprobación local adicional: invocación --apply con autoridad vacía rechazada en preflight con `reason:DIAGNOSTIC_ONLY`, sin llegar al target/DB; salida de rechazo distinta del éxito del diagnóstico. No es segundo intento de preparación. Inventario de procesos propios posterior:0 preparadores/launchers W2 activos. No quedan timers/servidor de este corte. Archivos propios modificados: fechas de w2-local-gate, modo/etapas del launcher, rollback del preparador, helper/fixtures rollback y diagnóstico seguro; documentos de entrega/estado. No archivos UI ni datos económicos nuevos.
