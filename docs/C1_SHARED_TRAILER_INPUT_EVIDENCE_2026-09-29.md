# Referencias de evidencia por input: remolque compartido

Base: `c78c57a67b2415759a6fa899e18c935d8e0ae8cd`, rama `codex/cost-tires-release-s14`, worktree limpio al inicio en `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`. Recomendación de modelo para implementación/revisión: Astra, esfuerzo alto; no se cambió el selector de modelo.

## Entregable

Se adapta el contrato existente de evidencia, sin crear otro catálogo. Cada uno de los siete inputs del remolque debe incluir `evidenceIds`; `allocationEvidenceIds` vincula la declaración de exclusión de costos de remolque en los tramos a fuentes del mismo dossier. La derivación y el locator del documento se conservan. Se admite una fuente para varios inputs si realmente los respalda; el código no acredita esa suficiencia.

Referencias omitidas o vacías producen `MISSING_EVIDENCE_REFERENCE`, inexistentes `UNKNOWN_EVIDENCE_REFERENCE` y repetidas `DUPLICATE_EVIDENCE_REFERENCE`. Todos esos casos impiden emitir el costo D2D. No se vincula automáticamente un input a la primera fuente. El contrato anterior sin referencias se puede leer, pero queda INCOMPLETE: cambio deliberado fail-closed, solo local, sin consumidores desplegados actualizados en este corte.

El resultado del remolque conserva `evidenceCoverage`, mapa de ocho campos a sus referencias; también declara `DOCUMENTED_UNVERIFIED` y `calibrated=false`, incluso cuando se usa separado del ensamblador D2D. Los validadores anteriores de vigencia, unidades y coherencia siguen activos. Un dossier vencido no se vuelve válido por estar referenciado.

## Validación

73/73 pruebas: D2D 35, tasas 15, tramo 14, operating-model C1 9. Typecheck API PASS. Nuevos casos cubren los siete inputs sin referencias, asignación sin respaldo, referencias desconocidas/repetidas, lectura del contrato anterior y conservación de fuentes distintas por input. Fixtures sintéticos; no son importes investigados ni datos adoptados.

## Límites y siguiente paso

Esto cierra el enlace técnico input-fuente del remolque, no el benchmark completo, calibración ni publicación. Siguen pendientes revisar fuentes públicas y documentar derivaciones/asignaciones de capital, mantenimiento, seguros y gastos agregados. No hay validación semántica automática de alcance del activo, cohorte o autenticidad. No se consultaron fuentes públicas nuevas en este corte.

No se modificaron UI, Preview, Auth, producción, bases de datos ni infraestructura. No hay nuevo wireframe porque no hay cambio visual. Siguiente entrega sustantiva: expediente público de una modalidad, con cada input respaldado o marcado pendiente; nunca llenar faltantes con fixtures.

Rollback: revertir únicamente el commit de este corte. No hay escrituras remotas que deshacer. Revertir restablecería el contrato anterior menos estricto, por lo que no debe interpretarse como habilitación de publicación.
