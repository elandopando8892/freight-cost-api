# B2 · caja compartida y componentes públicos de overhead

Fecha: 2026-10-01. Entrega local de investigación y consolidación; no calibración aprobada ni presupuesto completo.

## Resultado y benchmark previo

Antes, el contraste de dos cajas publicadas no distinguía todas las alternativas de IVA y el overhead conservaba conceptos sin componentes unitarios verificables. Ahora, el reporte existente presenta cuatro contrastes fiscales explícitos y relaciona cuatro conceptos administrativos con dos servicios públicos, conservando los 23 conceptos canónicos.

Se reutilizaron el inventario, los expedientes anteriores y la consolidación existente. La comparación proporcional al cambio fue:

| Enfoque | Ajuste y decisión |
| --- | --- |
| Precio unitario público × cantidad explícita, por servicio y ámbito | Adoptado para documentar componentes; cantidades y tratamiento económico siguen pendientes. No implica contratar servicios. |
| Repartir agregados INEGI/ATRI como overhead fijo por unidad | Rechazado: no identifican una oficina/flota equivalente ni el reparto del grupo; «otros costos» no equivale a overhead fijo. |
| Convertir precios de otras cajas o vidas contables en residual futuro | Rechazado: otro anuncio actual no acredita valor neto de disposición, condición futura o vida restante del activo modelado. |

No hay otra arquitectura, infraestructura o motor. El núcleo diferencial sigue siendo el costo gobernado por base operativa, exposición y ciclo; telefonía y TMS son capacidades estándar disponibles, no desarrollos propios.

## Caja: compra y venta no comparten automáticamente el tratamiento de IVA

Referencias previamente archivadas: Utility 2021 por MXN 630,000 **más IVA**, y Utility 2019 por MXN 540,000 con inclusión de IVA no establecida. Ambos son precios pedidos de unidades diferentes, no transacciones ni residual previsto.

La [Ley del IVA, fuente oficial](https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf) establece una tasa general de referencia de 16% y requisitos para acreditamiento. Su excepción para bienes muebles usados no se extiende automáticamente a ventas empresariales. Aquí se declara una venta empresarial gravada para el contraste; no se establece elegibilidad fiscal real, incentivo fronterizo ni tasa aplicable al contribuyente del piloto.

Compra con la referencia general: desembolso MXN 730,800, de los cuales MXN 100,800 son IVA de entrada. El costo proxy de compra depende de la fracción no acreditable. El IVA trasladado en venta se separa por su propia hipótesis; no se conserva como ingreso económico porque el IVA de compra fuera no acreditable.

| Base del anuncio 2019 | IVA de compra acreditable, supuesto | Proxy económico de compra MXN | Precio anterior sin IVA MXN | Contraste / 24 meses MXN |
| --- | --- | ---: | ---: | ---: |
| 540,000 antes de IVA | 100% | 630,000.00 | 540,000.00 | 3,750.00 |
| 540,000 antes de IVA | 0% | 730,800.00 | 540,000.00 | 7,950.00 |
| 540,000 incluye IVA | 100% | 630,000.00 | 465,517.24 | 6,853.45 |
| 540,000 incluye IVA | 0% | 730,800.00 | 465,517.24 | 11,053.45 |

**Los cuatro resultados son contrastes aritméticos de anuncios y supuestos fiscales, no depreciación, costo mensual de capital, residual ni intervalo de confianza.** Los 24 meses representan dos años-modelo para la analogía; no son una vida útil u horizonte de posesión seleccionado. Faltan condición comparable, disposición futura, costos de compra/venta, recuperación temporal de IVA, elegibilidad fiscal y términos económicos completos. Residual previsto, vida restante y capital mensual siguen `null`.

Se conserva una sola caja para el relevo propio MX/US; no se agrega otra depreciación íntegra por tramo. Las alternativas contado/financiado anteriores permanecen separadas y no heredan términos de un tractor a la caja.

## Overhead: dos componentes, no cuatro gastos

| Servicio público | Precio publicado y unidad | Relación canónica | Límites |
| --- | --- | --- | --- |
| Telmex paquete comercial | MXN 399 con impuestos por línea/mes; documento publica MXN 336.90 antes de impuestos | `Telefonia Fija` e `Internet`: el mismo gasto | Cantidad, costo económico y total sin seleccionar. No reconstruir el precio neto dividiendo 399/1.16. Instalación de línea nueva MXN 1,600 por una vez; activación de paquete sin cargo no la elimina. |
| AscendTMS | BASIC USD 69, PREMIUM USD 119 o PRO USD 149 por usuario licenciado/mes | Software y suscripciones: el mismo gasto | Planes alternativos, no sumables. Usuarios, impuestos y total sin seleccionar. No es precio por camión; suscripciones externas de load boards pueden costar aparte. |

[Condiciones comerciales Telmex](https://downloads.telmex.com/pdf/infoRelevante_Paqueteconectesnegocio.pdf): documento V1-020125, paquete de 80 Mbps. La [página comercial archivada](https://telmex.com/web/negocios/home_sb_v) mostraba promociones y velocidades distintas con vigencia hasta 2026-09-30: **no acredita una oferta vigente el 1 de octubre**. Una duración contractual indefinida no garantiza una tarifa comercial futura. Llamadas a celulares no constituyen suscripciones móviles o roaming para operadores.

[AscendTMS, precios del proveedor](https://www.thefreetms.com/pricing): la página específica de precios gobierna este componente; mensajes de inicio gratuito no equivalen a una licencia recurrente universal de cero. No se ha contratado ni seleccionado un plan, y no se acredita todavía ajuste de la oferta al ámbito legal del piloto.

Los 23 pares cantidad/precio unitario permanecen inventariados. Cuatro campos están parcialmente relacionados con **dos identificadores únicos de gasto**; los otros 19 se declaran pendientes, no cero. Ninguna partida mensual está completa. No se suman USD y MXN, no se aplica FX, y oficina/patio, nómina administrativa y reparto del grupo siguen pendientes.

## Evidencia y trazabilidad

Dossier legible por máquina: `B2_TRAILER_OVERHEAD_COMPONENTS_2026-10-01.json`, SHA-256 `6330b2b0a83e907b0ae26ed6c7863ba1b01d53a8b370fede1231264b0e31109d`.

Cuatro originales nuevos en `sources/`, comprobados por hash:

| Archivo | SHA-256 |
| --- | --- |
| LIVA_TRAILER_TAX_20261001.pdf | f2b5b1770441a6a4e48f3ade408f9ff7a3e9c81bd5d529e52484f49e4a8e91a6 |
| TELMEX_COMMERCIAL_BUNDLE_TERMS_20261001.pdf | 75453cffdd20b0352c9398b4fc842fb143344b3c4402113889f474e1b520c03e |
| TELMEX_BUSINESS_OFFERS_20261001.html | 7dd224a58a568f5cf993d11f3bd566139354e53fb6473a198cc3b4f3b50af507 |
| ASCENDTMS_PRICING_20261001.html | b5f8a2f056dce186b195a0a1fe70890c55a21f43896d41cac82000400b03bd11 |

Dos vistas derivadas, renderizadas e inspeccionadas visualmente: `LIVA_TRAILER_TAX_20261001_PAGE1.png` y `TELMEX_COMMERCIAL_BUNDLE_TERMS_20261001_PAGE1.png`. No sustituyen los PDF originales. Se revisaron además las páginas pertinentes de la ley y las cuatro páginas de las condiciones comerciales.

La consolidación fija diez JSON de evidencia. Los expedientes anteriores de usados, overhead y contado/financiado no se reescribieron. La revisión externa de este corte está fechada en el dossier; el CLI sólo lee archivos locales y no afirma haber actualizado fuentes en vivo.

## Validación y límites de cierre

La estrategia de pruebas priorizó las transformaciones económicas y sus fronteras, no un build de UI sin cambios:

- 25 pruebas nuevas: cuatro escenarios, tratamiento independiente compra/venta, entradas incompatibles, integridad binaria PDF y límites del directorio documental, inventario completo y prevención de duplicados.
- 142/142 pruebas dirigidas en seis suites, incluyendo consolidación, contado/financiado, usados, overhead y lector de tarjetas.
- Typecheck estricto de archivos y suites afectados: PASS.
- Lectura real del resultado CLI: diez fuentes fijadas, 23 pares, cuatro relaciones parciales, dos gastos únicos, diez importes completos nulos, 15 condiciones, cero adopciones. Código de salida **2 esperado por presupuesto incompleto**, no fallo de ejecución.

CFU, CVU, costo de compra y precio de venta continúan `null`; B2 y el MVP siguen abiertos. Desarrollado y probado localmente con evidencia pública y pruebas simuladas de límites; no validación autenticada, persistencia SaaS, despliegue o uso operativo. No cambios de Auth, DB, motor activo, infraestructura, contratos ni operaciones de negocio. Sin cambios de UI: no se añadió otro wireframe; el piloto posterior mantiene la exigencia de wireframe MARKSMAN.

## Recuperación y siguiente resultado

Worktree físico: `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, sin cambios de rama/commit. Había trabajo ajeno y previo sin commit, conservado.

Rollback local por revisión selectiva: retirar sólo el nuevo dossier, sus cuatro originales/dos vistas, helper y suite de este corte; quitar sus bloques añadidos en consolidación y cronología. Revertir únicamente la adaptación de lectura binaria en el lector, preservando el código anterior y otros cambios. No usar reset, borrado amplio de `docs/research` ni checkout completo de archivos compartidos. No se ejecutó rollback ni hay cambio externo que revertir.

Siguiente entrega agrupada: **componentes públicos de oficina/patio y dotación administrativa con cantidades explícitas del escenario de referencia**, sin pedir históricos privados ni presentar esas cantidades como datos observados. Después, cerrar presupuesto/exposición compatible y ciclo/variables del caso para el piloto SaaS, sin otra ronda genérica de FX, Auth o tasas. Las vigencias se deberán contrastar con la fecha de servicio aún pendiente.

Modelo recomendado: GPT-6.1 Sol, esfuerzo alto para comparabilidad económica y medio para empaquetado/QA. No se ha comprobado ni cambiado el selector; consumo de tokens y costo por actividad no medidos. Sin contratación, consumo de API de negocio o aplicación de IA.
