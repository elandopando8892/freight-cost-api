# ADR-009 · cobertura local de familias para referencias públicas MX/US

**Estado:** Accepted para contrato/auditor locales; Proposed para integración económica. Ninguna adopción ni activación.

**Fecha:** 29 septiembre 2026.

**Decisores:** ejecución local autorizada por continuidad del usuario; responsable de producto XBF para referencia económica y adopción puntual. No se exige segundo revisor.

## Contexto y resultado

La [revisión de suficiencia](../C1_B1_PILOT_SUFFICIENCY_REVIEW_2026-09-29.md) concluyó GO técnico B2 y NO-GO económico. El objetivo es estimar costos de terceros D2D caja seca MX/US con intercambio, no reconstruir contabilidad privada XBF ni compra/venta a partir de promedios.

ADR-007 ya propone familias públicas; ADR-008 ya valida capital, nómina, conductor y exposición. Se reutilizan esos artefactos y las librerías del repositorio. No se contrataron proveedores, APIs, infraestructura ni otro motor de cálculo. Las fuentes no se refrescaron en este corte de implementación.

## Decisión y alternativas

| Opción | Complejidad/costo | Decisión |
| --- | --- | --- |
| Repartir agregados entre 135 claves | Poco código, alto riesgo económico | Rechazada: inventa apertura y aparenta calibración. |
| Motor de cálculo público paralelo | Alto mantenimiento, sin cifras suficientes | Rechazado para este corte. |
| Auditor de cobertura que envuelve ADR-008 | Acotada; sin servicio/costo adicional contratado | Adoptado localmente. Conserva método detallado y valida bloques complementarios. |

Contrato `FCM_PUBLIC_REFERENCE_COMPONENTS_V1`: un `core` del contrato existente y ocho tipos complementarios. No cambia ninguna fórmula activa ni llama `calculateBenchmarkLeg`. Aun cuando un fixture es compatible, entrega **calibrated=false, quoteReady=false, adoptedValues=0**; rates, CFU/CVU, compra y venta permanecen null.

Las bases de investigación se conservan en un [ledger MX/US](../research/B2_PUBLIC_REFERENCE_COMPONENTS_LEDGER_2026-09-29.json). Éste referencia la plantilla ADR-008 por nombre local y SHA-256, sin duplicar sus valores. La CLI comprueba el hash y que el archivo resuelto permanece en la misma carpeta; no admite rutas externas ni carga env/DB/red.

## Fronteras y cobertura

| Bloque | Representación | Control local |
| --- | --- | --- |
| Capital/administración/conductor/exposición | `core` ADR-008 | Auditor existente, sin sustituirlo. Vidas por activo, propiedad/renta, beneficios, mes/cohorte y conteos. |
| Seguro | Rango USD/flota-mes | Prima normalizada con derivación e inclusiones; no límite/deducible ni importe anual rotulado mensual. No se convierte automáticamente. |
| Corporativo | Rango USD/flota-mes, sólo si no hay overhead conjunto | Si core cubre ADMIN_PAYROLL+COMPANY, no se carga COMPANY otra vez. |
| Mantenimiento / llantas | Dos rangos USD/km | Familias disjuntas, inclusiones y exclusiones explícitas; no repartir el bloque en microinputs. |
| Combustible | Precio USD/L y dos rendimientos km/L | Tres tipos distintos, positivos, con fuentes; no cálculo de consumo ni FX automático. |
| Capital de trabajo | Rango USD/flota-mes o exclusión explícita de financiación XBF | La exclusión requiere responsable XBF, razón y evidencia compatible; no significa costo del carrier cero. Un carrier pendiente no puede autoexcluirse. |
| Riesgo/margen | Políticas declaradas sin precio | Tratamiento y razón explícitos; no porcentaje por defecto ni compra/venta inferida. |

Cada componente admite `MISSING`, `MODELED` u `OUTSIDE_SCOPE` (éste sólo para la financiación XBF delimitada). Un rango tiene min/max/unidad; no se elige midpoint ni se afirma intervalo de confianza. Cero requiere justificación, y precio/rendimientos no admiten cero. Estado MISSING no puede ocultar valores/referencias, incluso si el coste está cubierto por overhead/renta.

Fuentes complementarias retienen país/equipo/cohorte, periodo, observación/vigencia, URL/localizador, unidad/moneda original, limitación y hash del snapshot. Se bloquean fuentes de contraste/fiscales como evidencia de una cifra. **Presencia de hash/metadatos no verifica autenticidad, representatividad, aplicabilidad económica ni conversión**; la derivación sigue requiriendo revisión. Los campos de aprobación del cliente son rechazados, incluidos los anidados.

La frontera `separateCostFamilies` se recalcula desde los componentes modelados con valor y se compara con core: no se puede esconder un coste para eludir el control de solape. Renta sólo puede cubrir capital, seguro, mantenimiento o llantas en esta versión. Se conserva la validación del mismo activo entre tramos y fecha/país D2D; identidad de IDs no prueba identidad física ni resuelve asignación del remolque.

## Lo que este corte NO integra

- No genera nueve tasas ni CFU/CVU numéricos, no adopta rangos y no modifica 210 parámetros.
- No resuelve ruta/ciclo, peajes, frontera/intercambio, responsabilidad operacional del trailer ni persistencia.
- No certifica supuestos de UTILIZATION/RISK/TECHNICAL_MARGIN ni compatibilidad de precios originales con normalizados.
- No endpoint, UI, Auth, DB/Neon, usuarios, deployment ni operación de negocio. Sin IA de aplicación.

Por eso `COMPONENTS_COMPATIBLE_UNVERIFIED` significa sólo compatibilidad estructural de **los bloques**, no dossier económico completo ni quoteReady. Los rangos sintéticos existen únicamente en tests, no en el ledger real.

## Consecuencias y siguiente salida

La cobertura de ocho tipos por país complementa el core; no reemplaza las 135 keys ni mejora su estado por tener un schema. El ledger real sigue INCOMPLETE: 24 incidencias iniciales por país (14 core + 8 componentes + 2 políticas). Ese número no representa todas las obligaciones condicionales del método.

La siguiente salida de negocio es **dos fichas públicas modeladas MX/US y un caso de evaluación D2D**, comenzando por un perfil/tenencia y exposición compatibles. Cada cifra/rango tendrá supuesto, fuente, transformación y sensibilidad; lo insuficiente quedará individualizado. No más sprints genéricos de FX/overhead ni pantallas antes de la economía. Adopción/persistencia requiere autorización puntual; bases privadas, compra y venta siguen independientes.

## Plan de pruebas y evidencia

| Área | Tipo | Criterio verificado |
| --- | --- | --- |
| Compleción y unidades/rangos | Unitarias | Ocho tipos, ausencia/ceros, valores no finitos, unidades, rango ordenado y límites numéricos. |
| Linaje y límites de fuente | Unitarias | País/cohorte/periodo/vigencia, equipo, fuente desconocida/duplicada, hash ausente y contrastes. |
| Solapes y responsable | Unitarias/contrato | Overhead conjunto, renta, boundary derivada, financiación XBF frente a carrier y políticas. |
| Compatibilidad existente | Regresión | Core ADR-008 y D2D, vidas usadas, exposición, identidad de trailer y dirección/fecha. |
| Ledger real | Lectura de archivos/CLI local | Referencia por hash a plantilla intacta; ambos países INCOMPLETE; cero cifras adoptadas. |
| Auth/persistencia/UI/producción | No ejercitadas | Fuera del alcance; permanecer pendientes y no deducir aceptación de las pruebas locales. |

Validación: **53 nuevas / 254 totales** en nueve archivos, typecheck API y diff-check aprobados. Auditor canónico mantiene 135/135, 3 candidatos/47 contrastes/85 faltantes, cero adopciones. Ledger SHA-256 `e57cdd449f0a285f9758ded2ac438838d38edc6eef6e06ccb082d9238a8a6d60`; plantilla core `cabfda00873356406d838306bfa87b912eccd9a6026449c0ebb26046acd8bd85`. CLI real conserva INCOMPLETE. Los tests no prueban datos públicos suficientes ni sesión real.

Uso local desde apps/api:

```powershell
npx --no-install tsx scripts/audit-public-reference-components.ts ../../docs/research/B2_PUBLIC_REFERENCE_COMPONENTS_LEDGER_2026-09-29.json
```

El script declara exit 2 para INCOMPLETE, 1 para uso/entrada/hash inválidos y 0 para estructura compatible sin aprobación; el lanzador de esta sesión reportó 1 en la invocación npx incompleta. El contenido JSON, no ese código del wrapper, demuestra los 24 faltantes iniciales por país. No se instala dependencia.

## Entorno y rollback

Worktree D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD base 4f5fc2de0c3d178dace917231e1092040dec21fd. AGENTS central vacío, sin AGENTS API/docs; cambios anteriores conservados. UI intacta: no corresponde wireframe nuevo; sigue obligatorio en B3.

Rollback: retirar sólo módulo/CLI/test/ledger/este ADR de este corte y sus nuevas notas en plan/estado. No revertir archivos completos compartidos ni tocar la plantilla core o register anteriores. Sin cambio externo que restaurar.

Modelo/esfuerzo por actividad: GPT-6.1 Sol · alto para contrato, implementación, pruebas y documentación; mismo modelo recomendado para la siguiente ficha económica. No se cambia automáticamente el selector. La guía de arquitectura provocó reutilización/adaptación/rechazo de motor paralelo; la de pruebas, separación entre controles locales y aceptación real.
