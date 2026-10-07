# B2 · capital por activo: puente de adquisición y financiamiento

## Resultado

Quedan dos fichas públicas trazables de tracto **usado/propio propuesto** MX/US y un contraste separado de pagos de arrendamiento. El entregable cierra la conciliación de oferta versus adquisición versus desembolso: no cierra el costo mensual de capital, la calibración de COST_CAPITAL ni el sprint económico B2.

Datos reproducibles: [JSON](B2_CAPITAL_ACQUISITION_BRIDGE_2026-09-29.json) y [notebook](B2_CAPITAL_ACQUISITION_BRIDGE_2026-09-29.ipynb). Fecha de consulta 2026-09-29; no equivale a vigencia comercial de las ofertas ni a periodo del servicio modelado.

## Contexto y método

Objetivo: estimar costo de transportistas terceros para D2D caja seca MX→US con intercambio del **mismo remolque cargado**, sin transbordo. Se reutilizan ADR-008/009, fichas B1 de usados y B2 perfil/exposición; no se cambia el motor, no se reemplaza propiedad por renta por conveniencia documental y no se crea otra base.

Supuestos críticos: usado/propio sigue siendo propuesta; financiación, periodo objetivo, flota y responsabilidad del remolque no están resueltos. No se presume interés cero ni se convierte incertidumbre en importe cero. Los antecedentes de vida contable, fiscal y residual sobre costo original de equipos nuevos permanecen contrastes, no vida restante de un usado. Garantía tampoco mide vida económica.

Fuentes primarias públicas, sin solicitudes comerciales, aplicaciones de crédito, formularios de acceso, identidades enviadas ni búsquedas de historiales privados XBF. No FX adicional. No se infiere una mediana de dos unidades no comparables.

## Datos por activo

| Ficha | Importe anunciado | Identificación observada | Lo que NO determina |
| --- | --- | --- | --- |
| MX tracto usado | 1,198,275.86 MXN + IVA | RODAL Cascadia 2021, DD15, manual 18, 694,920 km, Nuevo León | Compra ejecutada, IVA recuperable, entrega/preparación, vida restante, residual, tasa |
| US tracto usado | $45,000; USD inferido del contexto, no explícito | Schneider stock 20753, Cascadia 126 2021, DD15, 6×4/tándem, sleeper 48 pulgadas, 531,334 millas, Carlisle PA | Disponibilidad confirmada, valor entregado en frontera, moneda explícita, compra ejecutada, vida restante, residual, interés |

RODAL muestra 1,198,276 en encabezado y 1,198,275.86 en descripción de contado: diferencia de redondeo 0.14 MXN, no cambio de precio. Los términos están sujetos a confirmación. [Ficha RODAL](https://rodaltruckfinancials.com/catalogo/freightliner-cascadia-2021--vhc-f8668c8f02).

La nueva unidad estadounidense complementa la referencia histórica Houston febrero 2026 stock 501320, no la sustituye ni prueba depreciación o reducción de mercado: unidad, kilometraje, región y sleeper difieren. Se leyó la ficha pública vía texto web; la descarga HTML directa falló, por lo que el registro no declara snapshot local ni hash. [Schneider 20753](https://schneider.com/used-equipment/semi-trucks-for-sale/20753). Su página de financiamiento remite a evaluación externa, sin tasa numérica obtenida. [Financiamiento Schneider](https://schneider.com/used-equipment/financing).

### Adquisición capitalizable y costo mensual

La frontera metodológica IAS 16 incluye precio de compra después de descuentos, impuestos no recuperables y costos directamente atribuibles a colocar el activo en ubicación/condición operativa; obligaciones iniciales aplicables también deben identificarse. No se afirma que cada transportista aplique IFRS ni se decide tratamiento fiscal local. [IAS 16, resumen oficial](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/).

En las dos fichas, el anuncio sólo respalda el **precio pedido**. Capitalizable total, descuentos, impuesto no recuperable, entrega/preparación, residual neto, meses restantes e interés siguen `null`, no cero. El puente al contrato existente es:

`Depreciación mensual = (adquisición capitalizable − residual neto al endpoint económico) / meses económicos restantes desde adquisición`.

`Capital mensual propio = depreciación mensual + interés del mismo periodo`.

El principal amortizado es financiamiento de caja, no un costo adicional a la depreciación. Para entrar al CFU falta además presupuesto y exposición compatibles en activo, unidad y periodo. Este documento no ejecuta importes en ese puente.

### Contraste SFI: pago base no es costo de capital completo

SFI publica pago base desde $690/semana, plazo 52 semanas y dinero inicial desde $500. Lectura directa: **0 unidades disponibles**; índice de búsqueda mostraba 1 y no prevalece sobre la página. No es una cotización aprobada para una unidad identificada. Moneda retenida como signo publicado; no se certifica USD. [SFI Cascadia 2021](https://sfitrucks.com/inventory/lease-freightliner/2021-freightliner-cascadia).

La cuenta reproducible es `690 × 52 = 35,880` unidades monetarias de pago base anual; `/12 = 2,990` de promedio mensual. Cuatro semanas dan 2,760: no son el mes promedio anual. Diferencia 230 por mes promedio, sin sumar depósito, mantenimiento, seguros ni compra final. Diferir cuatro semanas no prueba condonación.

El FAQ describe TRAC, saldo restante para adquirir y posibles cargos por pago anticipado. La clasificación y contrato concreto están sin determinar: no se importa ese pago como depreciación, interés ni renta operativa pura. [Condiciones y FAQ SFI](https://sfitrucks.com/requirements-to-lease-semi-truck).

La cuenta administrada de mantenimiento requiere aportaciones semanales no cuantificadas en las fuentes leídas. Soporte, descuentos o recuperación de garantía no prueban reparaciones gratuitas/incluidas. Aportación a reserva y reparación pagada con ella no se cuentan ambas como gasto. El dinero inicial puede tener tratamiento de garantía/anticipo; no se amortiza arbitrariamente $500 en gasto mensual. [Programa de mantenimiento SFI](https://sfitrucks.com/maintenance-program).

### Remolque físico compartido

Un intercambio sin transbordo no implica dos remolques económicos ni inventario 1:1. Propietario, tenencia, responsable de costo y asignación entre líneas siguen desconocidos. El costo no desaparece, pero tampoco se carga completo dos veces. Las ofertas previas de cajas MX/US siguen sólo como contraste; no determinan quién soporta el mismo activo del servicio.

## Validación y límites

- **135/135 pruebas locales** en seis archivos: capital, usados, nómina/capital, familias públicas, perfil/exposición y 11 pruebas nuevas de este expediente. No son pruebas de compra, Auth o cotización operativa.
- **12 comprobaciones analíticas PASS**, notebook ejecutado con Python estándar y outputs persistidos; no ejecución con kernel Jupyter. Inspección del notebook renderizado pendiente.
- Typecheck API y diff-check PASS. No build ni release general ejecutado en este corte.
- Auditor de inventario: 135/135 documentadas, 3 candidatos / 47 contrastes / 85 faltantes, cero adoptadas y sin incidencias. Plantilla económica, ledger y perfil previo mantienen hashes originales. Registro canónico SHA `a31864f52ce5cd3d9f111056ec4dc58181587e99258614f1e2636e61ff992f0a`; requisitos `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`.
- La suite ampliada del corte anterior tenía **315/316**, por snapshot de metadatos fronterizos desactualizado. Este corte verifica seis archivos pertinentes; no afirma release general PASS ni corrige ese snapshot ajeno.

## Decisión y siguiente salida

B1/E1 abiertos, B2 parcial, **0/4 gates de negocio**. No CFU/CVU numérico ni compra/venta estimada completa. El precio anunciado ya no es el pendiente principal: detener búsquedas genéricas de precios de tractos y consolidar **escenarios de vida restante/residual** con supuestos de planificación explícitos y evidencia pública de incertidumbre, sin presentar escenarios como una cohorte calibrada. Resolver responsable/asignación del remolque antes de combinar capital D2D. Donde las fuentes no determinen el importe, conservar intervalo documentado o faltante, nunca cero implícito.

Modelo recomendado único para extracción, conciliación y validación de este corte y el siguiente: **GPT‑6.1 Sol · alto**. No cambia automáticamente el selector ni requiere Astra.

## Evidencia técnica y rollback

Trabajo en `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD base `4f5fc2de0c3d178dace917231e1092040dec21fd`. Cambios anteriores conservados; sin commit, stage ni alteraciones a producción.

Rollback selectivo: retirar sólo los tres archivos `B2_CAPITAL_ACQUISITION_BRIDGE_2026-09-29.*`, la nueva prueba `benchmark-capital-acquisition-evidence.test.ts` y las notas encabezadas «Corte B2 adquisición/financiamiento» añadidas al plan/estado. Las capturas públicas están en `tmp/capital-evidence-20260929`; no son configuraciones de aplicación. No revertir archivos completos del worktree sucio. No DB/Neon/Auth/usuarios/infra/deploy/UI/negocio ni consumo de IA de aplicación.
