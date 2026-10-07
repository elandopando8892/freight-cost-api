# B2 · capacidad y vacíos de una referencia pública de caja seca

## Resultado del corte

Antes sólo se contaba con exposición IMT histórica y ATRI multisegmento. Ahora el resumen económico incorpora seis periodos de un transportista identificado de caja seca, con millas de flota, factor publicado de vacíos y conteos promedio separados. **Es investigación conectada y comprobada localmente, no productividad calibrada del piloto ni cierre de B2.**

Se conserva México, DF → Fort Smith AR 72916 por Puente III, relevo propio MX/US y una misma caja 53′. No se selecciona PAMT como proveedor ni se cambia esta modalidad por los acuerdos que PAMT tiene con líneas mexicanas. Fecha/ciclo/presupuesto compatibles siguen pendientes.

## Benchmark previo y recomendación

| Alternativa | Capacidad concreta y límites | Decisión |
|---|---|---|
| [Werner One-Way, 10-K 2025](https://www.sec.gov/Archives/edgar/data/793074/000079307426000071/wern-20251231.htm) | Mezcla van, regional, equipos expedidos y refrigerado; la tabla expresa cambio de millaje, no millas absolutas | Contexto; no reconstruir distancia desde ingresos |
| [Schneider, 10-K 2025](https://www.sec.gov/Archives/edgar/data/1692063/000169206326000013/sndr-20251231.htm) | Promedio de tractores disponibles e ingresos por semana; no entrega millas/días productivos y el stock de cajas no es sólo Network | Contexto; no usar ingreso como productividad física |
| [PAMT, 10-K 2025](https://www.sec.gov/Archives/edgar/data/798287/000143774926007960/ptsi20251231_10k.htm) y comunicados | Caja seca con gateways Laredo/El Paso; actividad, vacíos y conteos publicados, pero ámbito del denominador aún por conciliar | Reutilizar como contraste específico, sin adopción |

Todas las consultas fueron públicas y de lectura. Ninguna requiere licencia nueva, compra o activación; no se introduce integración, arquitectura ni dependencia. El diferencial del producto sigue siendo traducir evidencia y supuestos compatibles a costos por recurso del D2D; no reconstruir servicios estándar.

## Inputs recuperados

Fuente de los años completos: [comunicado FY2025, publicado 13 febrero 2026](https://www.sec.gov/Archives/edgar/data/798287/000143774926004695/ex_920725.htm). Fuente de semestres y segundos trimestres: [comunicado Q2 2026, publicado 4 agosto 2026](https://www.sec.gov/Archives/edgar/data/798287/000143774926025703/ex_998666.htm). Sus tablas operativas se identifican como **no auditadas**, aunque estén depositadas ante SEC.

| Periodo | Millas totales publicadas | Factor de vacíos | Tractores company-driver promedio | Owner-operator promedio |
|---|---:|---:|---:|---:|
| FY2024 | 178,640,000 | 9.20% | 1,822 | 467 |
| FY2025 | 163,767,000 | 8.60% | 1,593 | 502 |
| H1 2025 | 81,571,000 | 8.97% | 1,623 | 509 |
| H1 2026 | 84,270,000 | 7.61% | 1,545 | 454 |
| Q2 2025 | 40,355,000 | 8.90% | 1,579 | 505 |
| Q2 2026 | 43,567,000 | 7.35% | 1,540 | 454 |

La nota de millas excluye terceros power-only. No acredita por sí sola qué población de tractores es el divisor compatible. Management denomina los vacíos como no compensados; eso no prueba que sean **todos** los km físicamente vacíos requeridos por el motor. Las series superpuestas no se suman. Tampoco se equipara periodo histórico a vigencia del viaje.

El 10-K identifica al cierre 2,094 tractores, incluidos 493 independientes, y 8,020 cajas. El cociente 3.8300 cajas/tractor es sólo stock al cierre, no stock promedio productivo ni ciclo de la caja del caso. Los 2,365 empleados menos 1,598 operadores dan 767 no operadores: no equivalen a los siete roles administrativos/FTE ni a nómina mensual. Se mantiene separado este contexto de las tablas de actividad.

## Traducción al inventario y fórmulas

- `GENERAL_BASE`: mejor perfil público y distinción promedio/cierre; aún no tamaño o propietario legal del grupo modelado.
- `UTILIZATION`: actividad y vacíos fechados; aún no km/tractor-mes o días productivos compatibles por recurso.
- `COST_PAYROLL`: conteo no operador de contexto, sin repartir personas entre roles arbitrariamente.
- `COST_CAPITAL`: edad de stock no se interpreta como vida restante de los usados anunciados.

El resumen reproduce sólo la normalización de unidad y periodo:

```text
km_flota_publicados = miles_publicadas × 1.609344
km_flota_mes_promedio = km_flota_publicados / meses_del_periodo
```

Por ejemplo FY2025 = 21,963,119.904 km/flota-mes promedio; Q2 2026 = 23,371,430.016. **No son km de un tractor**, ni se dividen por los 2,094 equipos al cierre. Km por tractor y días productivos permanecen nulos.

Para explicar el impacto de vacíos se muestra una hipótesis, no se adopta distancia:

```text
SI e = km físicos vacíos / km físicos totales:
km_total / km_cargado = 1 / (1 − e)
```

Con 8.60% el factor aritmético es 1.094092; con 7.35%, 1.079331. No equivale a `1 + e`, no acredita el retorno de Fort Smith, y no debe añadirse cuando el ciclo ya contiene km vacíos. La igualdad entre esa definición física y el indicador publicado **no está confirmada**. Por ello el factor tiene clasificación condicional y no alimenta CFU/CVU ni sustituye las fases seriales de la caja.

## Desarrollo y verificación

Se amplía el script de consolidación existente con `supportingDryVanCapacity`; no se crea helper, validador, endpoint, motor, pantalla ni esquema persistente adicional. [JSON de extracción](B2_US_DRYVAN_CAPACITY_2026-10-01.json) fijado por SHA-256 `ac224e566b80e51d5ff56675e85d67c2b38c181ce845b0b486130677c9a44e8a`. La CLI tiene ahora 14 pins y no hace solicitudes externas.

Una descarga ordinaria del comunicado SEC devolvió 403. La ficha contiene extracción estructurada de tablas revisadas en el lector web, **no HTML original archivado**; su hash protege esa extracción, no autentica el documento externo. No se intentó evadir controles ni presentar identidad.

Aceptación de este corte: fuentes/periodos/unidades explícitos; aritmética reproducible; ámbito/definiciones desconocidos conservados; ausencia de adopción. **97/97 pruebas**: consolidación 32, exposición por recurso 35 y presupuesto 30. Cuatro pruebas de negocio nuevas más el caso automático del nuevo pin. Typecheck estricto PASS. Lectura CLI: exit 2 esperado, 14 pins, seis observaciones, 15 condiciones del presupuesto y 41 incidencias del puente; diez importes completos/CFU/CVU/precios siguen nulos y cero adopciones. No prueba SaaS, autenticada, persistida o desplegada en este corte.

La guía `engineering:testing-strategy` concentró la verificación en unidad/periodo, integridad y no adopción, evitando repetir builds generales sin un cambio de aplicación.

## Qué falta y siguiente entrega

La ficha no cierra capacidad de los tres recursos. Falta conciliar el divisor del kilometraje público, días productivos y modelo de capacidad MX/caja. No se piden documentos privados XBF. Si un valor necesita una hipótesis de planificación en lugar de un dato público observado, se identificará como tal y se llevará a revisión; no se añadirá como hecho para pasar el gate.

La siguiente entrega debe resolver **el perfil de capacidad del modelo público y su compatibilidad con el presupuesto**, incluyendo las hipótesis que no sean observables públicamente. Después ciclo/variables y un piloto SaaS con wireframe MARKSMAN. No abrir otra serie de validadores ni confundir progreso documental con costo operativo terminado.

Modelo recomendado: GPT-6.1 Sol **alto** para comparabilidad/hipótesis económicas; **medio** para captura, proyección y QA. Selector real y tokens no comprobables desde este trabajo, sin afirmar cambio o ahorro medido.

## Recuperación y límites

Trabajo físico `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, conservados. Cambios locales de esta entrega: este par JSON/MD, adiciones al consolidado/pruebas y encabezados de estado. Para revertir, retirar sólo esas adiciones y el pin/campo `dryVanCapacity`; conservar el consolidado y cambios anteriores. No ejecutar checkout/reset general sobre el árbol sucio. No hubo staging, commit, PR, preview, despliegue, DB, Auth, usuarios, infraestructura, IA de aplicación, contratación u operación de negocio.
