# W2 · aislamiento de conexión antes de persistencia

Encargo humano: «procede con tu recomendacion», después de la recomendación de cerrar W2 antes de otro desarrollo. 5 octubre 2026, America/Mexico_City. Alcance nuevo: diagnóstico READ_ONLY y cambio local de observabilidad; **no renueva la ventana de escritura vencida a las22:21:54 del4oct ni sus intentos consumidos**. No ejecutar --apply/--diagnose, crear base/rol, guardar wizard, activar parámetros, modificar Auth/Google/Neon/producción o infraestructura.

## Objetivo, benchmark y elección

Aislar si el arranque de conexión falla antes de la transacción y evitar atribuir ese fallo al clone/SQL. Misma rama codex/cost-tires-release-s14 y HEAD4f5fc2de0c3d178dace917231e1092040dec21fd comprobados, checkout físico D:, dirty ajeno preservado. Preparador y diagnóstico existentes, Node24.21.0/Prisma5.22.0, inspeccionados; no historial Git del preparador aún (archivo no rastreado de cortes anteriores).

Comparación proporcional:

| Alternativa | Capacidad concreta / riesgo / costo | Elección |
| --- | --- | --- |
| Conexión implícita actual | Soportada, menos código; fase transaction mezcla arranque y comienzo de transacción. No distingue la frontera del P1001. | Comparador READ_ONLY, una ejecución. |
| $connect explícito y revalidación antes de transacción | Misma API/engine, separa fase connect y detiene operación si falla o vence el gate. No añade retry, timeout, pool, proveedor o licencia. | Cambio mínimo local recomendado. No se presenta como cura de intermitencia. |
| Aumentar timeout/reintentar/cambiar driver o proveedor | Puede ocultar causa y abre riesgo de escrituras inciertas/costo/mantenimiento. No sustentado por la evidencia actual. | No ejecutar. |

Fuente primaria exacta: [LibraryEngine Prisma5.22.0](https://github.com/prisma/prisma/blob/5.22.0/packages/client/src/runtime/core/engines/library/LibraryEngine.ts), transaction llama start antes de startTransaction. Runtime instalado corrobora ese patrón y $connect→engine.start. La documentación genérica actual redirige a versiones nuevas; no se usan sus contratos v7/v8 como baseline5.22. [Guía v6 de conexión](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/connection-management) como apoyo, no sustituto del código exacto.

## Contrato y aceptación

Una comparación padre→dos hijos nuevos secuenciales: LAZY y EXPLICIT, una ejecución cada uno, sin retry/fallback. Destino Preview verificado por helper y CLI oficiales existentes; URL sólo memoria/stdin, nunca archivo/stdout. Cada hijo sólo SET TRANSACTION READ ONLY, settings locales y SELECT/model reads; exigir transaction_read_only=on observado, source210/hash, target/rol ausentes; desconectar siempre. No importar preparador ni launcher de escritura. Ventana de esta comparación READ_ONLY 06:04:12Z–06:24:12Z, máximo45s por hijo, sin renovarla; no constituye una ventana de escritura. Si falla una variante, registrar diagnóstico sanitizado sin repetirla. Dos conexiones no prueban estabilidad ni identifican por sí solas la causa histórica.

Cambio local: guardas vigentes antes de conectar y nuevamente antes de ejecutar operación; observer connect/transaction. Fallo de conexión, vencimiento y rollback se propagan intactos; caller conserva finally/disconnect. Criterio: tests de orden, rechazo sin ejecutar transacción, gate vencido durante connect, sin retry y preservación de rollback/errores; tipos focales y regresión W2. Gate de escritura original y economía intactos. No cambia UI: wireframes MARKSMAN del wizard continúan vigentes, no otra pantalla.

Responsable escritor/verificador Codex/OpenAI, gpt-6.1-sol/high recomendado y elegido por continuidad del encargo explícito; modelo/esfuerzo efectivos y tokens/cuota/cargos desconocidos. Claude considerado, no elegido: la incertidumbre está en la conexión real, no en otra revisión de diseño; no duplicar contexto/consumo. Sin llamadas auxiliares/subagentes ni nuevos cargos. Presupuesto30min local, comparación READ_ONLY20min contenida, máximo2 reparaciones locales diagnosticadas por causa; sin reintentos de conexión. Skills debug y testing-strategy aplicadas.

Rollback local sólo hunks/helper/tests de este corte, después de comprobar cambios posteriores; sin reset/borrado del árbol ajeno. No estado externo que revertir. Resultados se añaden debajo y no autorizan persistencia.

## Resultados comprobados y cierre

Comparación real mediante código efímero Node/TSX, sin guardar credenciales ni archivos ejecutables nuevos: sesión17205, exit0, terminó06:07:44.694Z /00:07:44 México. Verificación oficial del mismo destino Preview en memoria; dos hijos nuevos secuenciales, desconectados en finally. **LAZY exit0/24571ms; EXPLICIT exit0/16325ms**, elapsed total del bloque de cada hijo, no tiempo puro de conexión ni benchmark estadístico. Ambas observaron `transactionReadOnly:true`, source210/hash `47a5bf5ea3571cad8b0c40a15b3715c93d0ab6ab93e1c9ad529f0e7270076346`, target/rol ausentes y `databaseWritesAttempted:false`. Dos intentos comparativos consumidos2/2, retries0; no preparar base/rol, guardar wizard ni relanzar el gate vencido. No se ejecutó el script de lectura antiguo saltando su guardia de expiración: comparación independiente de lectura, no extensión de aquella autoridad.

El P1001 anterior **no se reprodujo**; no se atribuye a lazy-connect ni se declara reparación de conectividad, estabilidad sostenida o causa DNS/TLS/Neon. Ambos modos llegan al mismo engine.start del cliente5.22. La diferencia de duración de una pareja secuencial tampoco demuestra ventaja de rendimiento: puede incluir variación externa y calentamiento del servidor.

Cambio local implementado en `scripts/lib/w2-connected-preparation.ts`, integración mínima en `scripts/prepare-w2-review-base.ts`, seis tests en `tests/w2-connected-preparation.test.ts`: conexión explícita, observer por fase y revalidación de vigencia antes de operación. Caller conserva disconnect/finally y rollback original. Ningún grant, límite/timeouts, fingerprint, importes o perfil modificado. El preparador de escritura modificado **no se ejecutó contra DB**.

Pruebas finales: sesión58997 **117/117 en9archivos, exit0**, inicio00:06:40 México/duración8.34s. Incluyen seis nuevas y111 regresiones W2/wizard. TSC estricto focal del preparador, launcher, diagnóstico y helper/tests: exit0. Advertencia ViteCJS preexistente; no declarar typecheck/build general del repo aprobado. `git diff --check -- docs/SPRINT_STATUS.md` exit0 (advertencia LF/CRLF), no certifica todos los archivos no rastreados.

Gate original conservado con deadline `2026-10-05T04:21:54.000Z`, SHA256 `e6a733e7a664aa5d503c5f95a5b8ae86e03e89ef3052930dd245b06f5669dcc7`; no renovado. Procesos de comparación terminaron/exit0, no servicios Web/API iniciados y ningún preparador/launcherW2 vivo observado tras cierre. No cambios Auth/Google/migraciones/usuarios/infraestructura/deploy/operaciones/IA auxiliar. Modelo/esfuerzo efectivos y consumo monetario desconocidos.

**Corte de diagnóstico local terminado; W2 operativo sigue abierto.** No hay evidencia para otra tecnología, timeout mayor o retry automático. Propuesta de siguiente gate, aún NO autorizada: nueva ventana45min desde la recepción humana, máximo1 --apply para crear el mismo borrador QA no comercial/binding y rol limitado temporal; sesión existente, una propuesta diesel-mx/MARKSMAN sin aplicar parámetros, recarga/replay y comprobación de permisos; cierre de procesos propios y rol NOLOGIN/0sesiones. Si fallo/resultado incierto, no repetir escritura, sólo inventario/cierre. No Auth/Google/producción/migraciones/usuarios/fórmulas/importes/negocio/Maps/IA. La autorización del presente diagnóstico no habilita ese gate.
