# Bases de terceros — incremento local de persistencia

## Identidad y alcance

- Worktree: `D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830`.
- Rama: `codex/quote-integrity-sprint`; HEAD inicial `419b10c202d396eed1801e5b3ce3e6393d4faf6e`. Cambios de este incremento sin commit/deploy.
- Conservados los documentos de evidencia del preview anterior y el contrato/wireframes preexistentes.
- AGENTS de C: ausente; AGENTS de codex-home vacío; no se editaron archivos Next/UI.
- Modelo recomendado: Astra alto para arquitectura y persistencia; medio para ejecución de pruebas. No se afirma cambio del modelo de sesión.

## Resultado funcional de API

`POST /partner-bases` crea base y borrador v1; `POST /partner-bases/:baseId/versions` agrega revisiones inmutables; `POST .../:versionId/publish` publica y activa atómicamente. Sólo ADMIN muta bases. OPERATOR/ADMIN calculan y guardan; VIEWER consulta. GET lista y versiones paginan de 20 en 20; detalle devuelve las 20 últimas y el conteo total.

`POST .../:versionId/calculate` admite únicamente fecha de viaje y FX. La API lee tarifas, ruta, equipo y supuestos desde PostgreSQL por organización y versión activa. No acepta términos del navegador. `POST .../:versionId/estimates` vuelve a calcular, valida checksum y guarda snapshot completo en PartnerCostEstimate, incluyendo baseId/versionId/número/hash. GET del historial existente verifica el hash sin recalcular.

Actualizar tarifas requiere otra revisión. Publicación verifica inclusiones, conceptos y vigencias superpuestas; no inventa FX ni costos faltantes. No valida autenticidad comercial de referencias; conserva USER_SUPPLIED_UNVERIFIED. Guardados usan clave idempotente y reintentos recuperan el resultado incluso después de cambiar la versión activa. Una revisión manual de un resultado con baseLineage se rechaza para no perder procedencia.

## Persistencia y aislamiento

Migración nueva: `20260923000200_partner_tariff_bases`. Sólo dos tablas, sus constraints y dos funciones/triggers. Términos y versiones congelados por trigger; publicación DRAFT→PUBLISHED de una sola vez. FK compuesta impide versión activa de otra base/organización. Activación de borrador rechazada. Revisar/publicar/calcular/guardar bloquean la fila de base, evitando comprobaciones contra una activa obsoleta.

PartnerTariffBase es un tipo distinto de CostBase V3: no llena ni transforma la base histórica XBF. El editor futuro debe mostrar ambas familias en Bases de costo con modelo explícito. No sumar automáticamente estas bases al contador actual de 210 parámetros.

## Validación

Runner reproducible (Node 24 en PATH): `apps/api/scripts/test-partner-persistence.ps1`. Requiere Docker local por named pipe, crea PostgreSQL 16 desechable sin volúmenes en loopback, aplica migraciones sobre DB VACÍA, comprueba estado y replay, corre pruebas y elimina el contenedor al terminar. No lee URLs de proveedores.

Primera ejecución: 42 migraciones aplicadas, replay sin pendientes; 7 pruebas de bases + 9 de estimaciones anteriores aprobadas. Ejecución final: **18/18 pruebas PostgreSQL aprobadas** (9 bases + 9 estimaciones), incluyendo rollback de publicación y guardado bloqueado por publicación; migración/replay correctos. Los errores de unique constraint impresos en pruebas de concurrencia anteriores son rechazos esperados, no fallos de prueba.

Suite general API: 581 aprobadas; 18 omitidas en esa ejecución sin URL PostgreSQL (16 de socios que se ejecutaron por separado y 2 históricas de Quote no ejecutadas). Esa corrida comenzó antes de agregar las dos últimas pruebas PostgreSQL; el total PostgreSQL final es el indicado arriba. TypeScript detectó inicialmente una propiedad redundante en nested create de Prisma y después el tipo unknown del manejador Fastify; ambos se corrigieron antes del cierre.

Cierre: TypeScript `--noEmit` aprobado y 39/39 pruebas focalizadas aprobadas sobre el código final (contrato de bases, motor de terceros y rutas de estimaciones). `git diff --check` sin errores; ningún contenedor del runner quedó activo. No se ejecutó build/QA web porque no hubo cambios de UI.

Identidades y tarifas son fixtures sintéticos. Esto prueba almacenamiento y contratos HTTP con identidad simulada, NO OAuth, navegación, evidencia de proveedor ni aprobación comercial. La migración Auth histórica sólo se ejecuta como parte del esquema vacío local; permanece excluida del ámbito remoto.

## Pendientes / release gate

- Editor integrado en Bases con wireframes existentes, cálculo por versión y procedencia visible en historial.
- Retiro/archivo de bases antes de habilitación comercial; no existe endpoint de borrado.
- UI autenticada con ADMIN/OPERATOR/VIEWER reales; móvil/desktop; recarga.
- Tarifas comerciales, supuestos operativos revisados y referencias de proveedor.
- Autorización puntual para nueva migración y preview pareado. NO desplegar este API contra un esquema sin las tablas nuevas. NO ejecutar `migrate deploy` remoto: sigue pendiente la migración Auth histórica excluida.
- El ejecutor selectivo anterior fija 41 artefactos y cuatro migraciones autorizadas: no se amplía silenciosamente para esta migración número 42.

## Rollback

No hay cambio remoto que revertir. El runner detiene y elimina sólo su contenedor desechable creado para la prueba (sin volúmenes); sus fixtures no se recuperan ni son datos comerciales. Para retirar código, revertir únicamente los hunks de este incremento y regenerar Prisma; preservar documentos/cambios anteriores. No usar reset/clean global.

Si en un futuro se autoriza aplicar el esquema remoto, rollback preferido es retirar las rutas/UI nuevas y conservar tablas/datos. Antes de cualquier eliminación de tablas exigir backup, evidencia de uso y autorización específica. No borrar snapshots ni manipular ledger para simular rollback.

No hubo llamadas de IA del producto, operaciones comerciales, cambios de usuarios/Auth, proveedores, Neon ni producción.
