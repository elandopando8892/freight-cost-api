# W2 · auditoría de relevo propio y decisión mínima

## Resultado

**Auditoría local terminada; W2 operativo sigue abierto.** El motor SaaS V3 no demuestra soporte del escenario confirmado: tractores propios MX/US con la misma caja. No corresponde quitar su bloqueo ni sustituir el escenario por THROUGH_TRACTOR. El compositor B2 sí representa tres recursos y una sola caja, pero sus resultados son de planeación, no tarifas comerciales ni calibración observada.

Autoridad: respuesta humana «autorizo» a auditar el soporte y corregir la validación **sólo si el motor existente lo soporta**. Una nueva asignación o integración metodológica requiere propuesta y autorización específica. Esta auditoría no ejecutó SQL, creó roles/bases/versiones ni inició runtimes. No extendió la vigencia del gate anterior (20:30 UTC del 4 oct 2026).

Checkout comprobado al inicio y cierre: `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Árbol preexistente sucio preservado; sin nueva rama, commit o worktree.

## Evidencia y recorrido

| Capa | Evidencia local | Consecuencia |
| --- | --- | --- |
| Alta de base | `cost-bases.schema.ts:62` aplica `profileConsistencyIssues`; `cost-base-profile.ts:141` admite sólo THROUGH_TRACTOR en CROSS_BORDER | YARD_TRANSFER y PARTNER_HANDOFF siguen rechazados. D2D_BINATIONAL_OWN por sí solo no habilita otro cálculo. |
| Validación de cálculo | `cost-bases.service.ts:145` parsea el perfil versionado; `:965` lo resuelve antes de calcular; `engine.routes.ts:154` conserva ese camino | La prueba directa del kernel no es permiso para saltar la API. |
| Motor SaaS | `engine.calculator.ts:88` pasa el mismo ParamMap a ambos tramos; `:115` suma sus costos. No usa applicabilityProfile para repartir recursos | Cambiar únicamente el proceso de cruce deja la aritmética idéntica; no introduce relevo ni custodia de caja. |
| Pool mensual | `engine.outputs.ts:80` deriva un agregado. `engine.mex.ts:62` y `engine.usa.ts:49` incluyen capital de remolque para Dry Van; denominadores y MAX por tramo diferentes | No existe en este recorrido un contrato explícito MX_TRACTOR / US_TRACTOR / SHARED_TRAILER ni conservación del pool compartido. **No se afirma doble facturación real**. |
| Planeación B2 | `benchmark-binational-budget.ts:4` define los tres recursos y conserva asignaciones; `benchmark-binational-cost-projection.ts:100` aplica MAX por recurso y `:131` cuenta una caja | Reutilizable para revisión; declara calibrated=false, quoteReady=false, adoptedValues=0, purchase/sell=null. No se importa en el orquestador SaaS. |
| Frontend | `apps/web/app/(app)/cost-bases/cost-base-profile.ts:203` exige el mismo tractor | No se cambia la UI para aparentar compatibilidad que la API no tiene. |

Demostración sintética, no tarifa: dos MAX de 20/80 y 80/20 suman 160; un MAX del ciclo 100/100 es 100. Por eso el reparto por tramo no puede asumirse equivalente al reparto de una caja por ciclo. Tampoco basta con dividir por dos el remolque o asignarlo a un solo país: faltan exposición, capacidad y ownership explícitos.

YARD_TRANSFER es la representación preparada en el gate, **no una definición completa de relevo propio**. El mensaje actual lo agrupa con costos de terceros; el caso humano no compra necesariamente un servicio de tercero. Una nueva semántica debe distinguir estos casos sin reinterpretar perfiles guardados.

## Benchmark y alternativas

Se reutilizó [el baseline tecnológico documentado](../research/ECOSYSTEM_REUSE_BASELINE_2026-10-03.md), verificando ahora en código la capacidad pertinente: validación Zod existente, compositor B2, kernel MAX compartido y contratos de versión. Las comparaciones históricas de proveedores/licencias no se presentan como una verificación nueva de precios o versiones. Ningún paquete externo, ERP, router, fuente tarifaria o infraestructura resuelve por sí mismo este reparto metodológico; no se añadieron dependencias ni se repitió investigación de casetas.

| Opción | Ajuste / costo total / riesgo | Decisión |
| --- | --- | --- |
| Relajar el validador o etiquetar como THROUGH_TRACTOR | Poco código, pero no cambia la aritmética ni acredita el caso; alto riesgo de resultados aparentemente válidos | Rechazada. |
| Adapter local de revisión B2 dentro del recorrido SaaS existente | Reutiliza las fórmulas y fuentes de planeación; cambios acotados de contrato/lectura. Conserva Auth, permisos y bloqueo comercial | **Recomendada como siguiente corte**, sujeta a autorización metodológica explícita. |
| Incorporar reparto por recursos al motor comercial V3 | Resuelve más alcance, pero necesita versionado, equivalencias, riesgos/márgenes, snapshots/replay y aceptación económica | Posterior; no reescribir V3 ni alterar cotizaciones históricas ahora. |

## Siguiente corte propuesto, no implementado

Objetivo: consultar en el producto la proyección de relevo propio, con CFU/CVU por recurso y evidencia, sin confundirla con una cotización autorizada. El contrato debe indicar escenario de ciclo, contado/financiado, periodo, caja única, referencias, procedencia y limitaciones. Los 210 parámetros originales no se sobrescriben ni se convierten automáticamente a pools B2. El adaptador consume la salida del compositor actual; no calcula otra fórmula en React ni introduce valores públicos como defaults comerciales.

Flujo: versión/base seleccionada → revisión de escenario binacional → desglose de MX/US/caja y fuentes → faltantes o costo de planeación → retorno al armado de supuestos. Wireframe esquemático para revisión, no pantalla implementada:

```text
[Base / versión]      REVISIÓN NO COMERCIAL · relevo propio, misma caja
[Ciclo de red | Retorno dedicado] [Contado | Financiado] [Periodo]
MX tractor       US tractor       Caja única
CFU / CVU        CFU / CVU         CFU / CVU
            Costo de planeación / fuentes / limitaciones
[Volver a supuestos]    Cotizar / publicar: no habilitados por este escenario
```

Conservar la dirección MARKSMAN y los wireframes existentes del wizard; no rediseñar el producto. Definir antes de implementar dónde vive el contrato de revisión para que no haga pasar un perfil unsupported como through-tractor. Ninguna decisión aquí modifica el enum de políticas, el esquema SQL o la metadata persistida. No habilitar cálculo comercial ni crear un segundo motor.

Criterios de cierre del corte recomendado:

- El escenario humano se identifica sin alias THROUGH_TRACTOR ni confusión con partner/transbordo.
- La salida coincide con el compositor B2 para ambos ciclos y modos; una caja y gastos compartidos conservados una sola vez.
- Fuentes/hipótesis/faltantes visibles; no null→0, no tarifas purchase/sell ni declaración de calibración.
- Permisos y aislamiento de organización conservados; errores, recarga, duplicación y snapshots con pruebas proporcionales al adapter.
- WORKBOOK_V3 y OPERATIONAL_V3 históricos sin cambios; cotización/publish no habilitados por esta revisión.
- Primero entrega local; persistencia autenticada real W2 requiere gate vigente y permisos expresos, no se presume de tests.

Responsable: Codex, escritor único. Recomendación concreta: OpenAI/Codex `gpt-6.1-sol`, esfuerzo solicitado `high`. Claude se consideró como candidato de contrato/UI, pero no se requiere transferencia ni segundo revisor para este corte acotado y verificable; no se invocó. Modelo/versión/esfuerzo efectivos, cuota y cargos atribuibles desconocidos. No cambiar el selector nativo. Presupuesto propuesto para implementación local: 60 min, sin IA auxiliar ni APIs facturables, máximo dos reparaciones diagnosticadas del mismo problema; detener ante expansión material. El presupuesto no concede autorización de implementación ni gasto. Auditoría actual acotada a 30 min locales; no consumo externo de IA, tokens/cargos nativos desconocidos.

## Pruebas realmente ejecutadas

`npx.cmd vitest run tests/w2-own-relay-audit.test.ts tests/benchmark-binational-cost-projection.test.ts tests/benchmark-binational-budget.test.ts tests/cost-base-applicability-engine.test.ts tests/w2-local-gate.test.ts`

**83/83 PASS, cinco archivos**, ejecución 4 oct 2026 13:56 México. Seis nuevas pruebas de caracterización: alta through-tractor, rechazo de dos cruces no soportados, perfil ignorado en aritmética directa, MAX no aditivo y capital de caja incluido en ambos agregados. Prisma está mockeado en el archivo nuevo: no permite una llamada de persistencia satisfactoria. Las otras suites ejercen planeación y validación local, no login/DB.

`npm.cmd run typecheck`: **FAIL**, únicamente TS2322 en `trip-fuel-review.ts:79,81` (number|null a number), mismos dos errores previos registrados en preparación W2. No se repararon archivos ajenos. No presentar el build general como verde. No se probaron sesión real, guardado, renovación, replay o reload de DB, ni se desplegó.

SHA256 de fuentes auditadas (sin modificaciones de implementación):

- engine.calculator.ts: `0b22dd0e223c300fbad40964d8c671660a4050c0cd409bbcc514353da5988ea6`
- engine.outputs.ts: `3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b`
- benchmark-binational-cost-projection.ts: `4e93fcfba6c0da647006b077cc95895eefebab515a84eb11b27f9f8844444776`
- cost-base-profile.ts: `e33d6d8a480a02d4adb877881de9dc29559f273a1a4767dfa2e41f9085b9ff2f`
- Nueva prueba w2-own-relay-audit.test.ts: `6968aca449720987358b4597cae29f4b3957b6e33ceff18f1582a55f907c2fb4`

Rollback local: retirar sólo la nueva prueba, este documento y la entrada de auditoría en SPRINT_STATUS.md. Sin revertir árbol completo, validadores, motor, cambios ajenos o la preparación anterior. No existe rollback de DB de este corte porque no se conectó ni escribió. B2 conserva su cierre **sólo de planeación**; W2 no se declara cerrado.

Decisión requerida: autorizar **la integración local del compositor B2 como revisión no comercial de relevo propio**, con contrato explícito y bloqueo comercial intacto; no una relajación general del motor V3, migración, deploy o autorización indefinida del gate.
