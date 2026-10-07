# B3: consolidación local de lecturas

## Objetivo y alcance

Continuación humana «adelante con el siguiente trbajo». Reducir trabajo dentro del guardado B3 sin debilitar validación, locks, aislamiento o recibos. Criterio local: una lectura conjunta de binding/propuestas W2, dos lecturas de auditoría B3 por guardado; contratos y regresiones intactos. No significa cierre operativo de B3.

Checkout físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Se preservaron los cambios ajenos y archivos previos sin crear rama/worktree/commit. No llamadas DB, QA, Auth, Google, deploy ni producción en este corte.

## Benchmark y decisión previa

Inspeccionados código W2/B3, locks existentes, historial Git, schema, fixtures y dependencia real @prisma/client 5.22.0. Referencia primaria: [transacciones Prisma, documentación versionada v6](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions), usando únicamente el API existente y comprobado en 5.22. No adoptar el API nuevo de la documentación v8.

1. Consolidar consultas de metadatos con el ORM actual: menor cambio, ninguna nueva dependencia/configuración, conserva read/validate/write interactivo. Elegido.
2. Batch o SQL dedicado: no resuelve por sí solo decisiones dependientes de lecturas; mayor superficie de cambio y posible alteración del orden de locks. No elegido.
3. Ampliar timeout o actualizar Prisma: no acredita la causa y cambia límites/dependencias sin necesidad. No elegido.

Se usaron codebase-design y engineering:debug para conservar la interfaz, introducir pruebas de regresión antes del cambio y evitar un nuevo adaptador/infraestructura. Sin cambios UI: wireframes existentes B3 permanecen aplicables.

## Antes y después

Antes: W2 leía binding y propuestas en dos consultas; B3 añadía otra consulta propia. Después: W2 hace una consulta limitada a tres discriminadores y particiona el resultado; B3 conserva su consulta independiente con atribución de actor. Auditoría B3: **3 → 2 llamadas findMany por guardado**, probado con espías. No se mide aquí el número físico de consultas SQL, latencia Neon ni porcentaje de mejora en tiempo.

La consulta conjunta tiene take=130. Un historial válido permite hasta un binding y 128 propuestas (129 filas). Cualquier conjunto de 130 filas excede necesariamente al menos un límite. Siguen vigentes rechazo de binding ambiguo, límite de 128 propuestas, schemas estrictos, fingerprints y revisiones. La organización, base, acción y versión siguen filtradas en DB. No filtrar tenant después de cargar.

Se conservan dos locks ordenados (organización antes de versión), validación posterior a locks, transacción única, maxWait=2000ms y timeout=15000ms. Sin cambios a CFU/CVU, parámetros, importes, adopción o permisos.

## Evidencia local

- Pruebas nuevas ejecutadas antes del cambio: dos fallos esperados por llamadas redundantes; 38 pruebas restantes pasaron.
- Regresión final: **162/162 pruebas, 10 archivos, exit0** (W2 draft/version/context/routes/transaction; B3 planning/routes/relay/gate; B2 relay).
- Cobertura nueva: presupuesto de llamadas, scope, locks antes de lectura y lectura antes de append; exceso de propuestas solo o con binding primero/último; binding duplicado junto a historial lleno. Persistencia, replay, concurrencia y corrupción son fixtures, no pruebas reales DB.
- Tipos focales de los módulos y dos tests modificados: **exit0** con ES2022/moduleResolution node. Primer comando CommonJS incluyendo test import.meta falló TS1343; corregida opción de módulo del comando, no código de producto.
- git diff --check exit0; advertencias de CRLF de cambios existentes. Archivos nuevos no son cubiertos por git diff --check y requieren inspección independiente.

## Modelo, presupuesto y cierre

Responsable: Codex en sesión existente. Recomendado OpenAI gpt-6.1-sol / high para implementación y revisión local; modelo y esfuerzo efectivos no certificados por estas herramientas. Claude considerado como alternativa de revisión, no necesario para este cambio pequeño con regresión verificable; cero invocaciones Claude o subagentes. Cupo del corte: hasta 60 minutos locales, una consolidación y hasta dos correcciones diagnosticadas por causa, cero reintentos/escrituras externas. Tokens, cuota y cargos nativos desconocidos; no consumo cero inferido.

El gate FINAL previo sigue cerrado y consumido. El fallo real P2028/EXPIRED no se considera resuelto con fixtures. Próxima aceptación requiere enmienda humana puntual para ejecución QA finita conservando intentos anteriores: guardado único, recuperación, replay sin duplicado y lectura independiente; cerrar acceso al terminar o fallar. No reiniciar automáticamente ni aumentar timeout.

## Rollback

Revertir únicamente el hunk de consolidación en cost-base-wizard-version.ts y las pruebas añadidas de este corte, recuperando las dos consultas anteriores. Conservar fixtures previos, cambios ajenos, contratos, gates cerrados y evidencia del fallo. No reset/delete ni rollback DB: no se escribieron datos. Este documento y el checkpoint conservan la trazabilidad.
