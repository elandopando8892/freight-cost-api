# D2D · fuentes por expediente y contexto compartido

Base HEAD `3910b60851aa427c41e96999c591e656d77f9f3a`, worktree limpio en `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`.

## Cambio

- La fecha del servicio se captura una vez y se refleja en ruta, parámetros MX/US y capital. La referencia del remolque se refleja en capital y utilización. Se ocultaron las copias editables.
- Las referencias `evidenceIds` y `allocationEvidenceIds` se eligen de fuentes capturadas en el expediente correspondiente. No se mezclan fuentes entre países ni entre capital, costos fijos y utilización.
- Una fuente retirada deja visible la referencia pendiente hasta que el usuario la quite. No se elimina automáticamente ni se considera válida.
- Se corrigió la persistencia del control nativo de fecha al editar luego otro campo y un desbordamiento de texto técnico en móvil.
- El wireframe y estados están en `docs/design/owned-d2d-sources-context-wireframe.md`; la captura local está en `docs/design/owned-d2d-sources-context-qa.png`. Se siguió la guía `design-handoff` para estados, tokens, responsividad y accesibilidad.

## Validación y límites

- Pruebas de propagación de fecha/activo, aislamiento de fuentes con IDs iguales en distintos expedientes y fuente retirada. Se conservan las pruebas de formulario existentes y la comprobación de tipos.
- En navegador local se conservó la fecha al editar la referencia del remolque; se capturó `F-1` en costos fijos y apareció en su selector. Tras retirarla, la referencia se mostró como pendiente. A 390 px y 1440 px no hubo desbordamiento horizontal; también se midió el grupo de fuentes abierto a 390 px.
- El visor usa un contrato estático y bloquea llamadas remotas. No hubo validación autenticada en Preview, adopción económica, cambios de Auth/base de datos, despliegue ni consumo de fuentes externas. El benchmark sigue `DOCUMENTED_UNVERIFIED`.

Rollback: revertir este cambio de UI y documentación; no hay migración ni datos que restaurar. Siguiente corte: expediente completo con fuentes reales revisadas y sesión autenticada de operador en Preview. Modelo recomendado: Sol con esfuerzo medio para experiencia de captura; Astra alto si se cambian reglas de cálculo o autorización.
