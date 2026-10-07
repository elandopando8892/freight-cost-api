# B2 · mantenimiento y llantas: referencias MX/US y frontera de CVU

Fecha: 2026-09-30. Estado: **corte de investigación completado; familia económica sin calibrar**. B2 parcial, cero adopciones y 0/4 gates de negocio cerrados. El entregable es una referencia trazable por vehículo-km, no un costo observado, tarifa de compra ni precio de venta XBF.

## Resultado y decisión para el MVP
Se reutilizaron la investigación de llantas existente, el ciclo económico de recape y el contrato público de familias. Dos fichas conservan seis costos publicados, sus unidades y exclusiones. Se implementó un revisor offline para evitar mezcla de fuentes/periodos, doble conteo y reparto arbitrario; no otro motor de precios.

La guía de análisis obligó a distinguir modelo técnico, estimación agregada y formulario metodológico. La guía PDF llevó a revisar visualmente las tablas originales y sus notas, no sólo sus extractos. La apertura MX es más detallada; la estadounidense no certifica un desglose de lubricantes o DEF. **Ausencia de desglose no es costo cero.**

El piloto continúa siendo D2D caja seca entre dos transportistas terceros con intercambio y sin transbordo. Las referencias tracto/remolque compuestas no se pueden sumar como dos bases nacionales ni transformarse en tractor-only sin evidencia de reparto.

**Próximo corte único: consolidar fijo, exposición y remolque.** Salida esperada: reunir los expedientes existentes por país, explicitar método de asignación y responsabilidad del remolque y emitir una ficha modelada aplicable o un faltante económico acotado. No otra investigación genérica de llantas, salarios o FX. Después: caso D2D E1/E2 → recorrido SaaS E3 con wireframes → release E4 autorizado. No se agregan nuevos sprints.

## Fuentes revisadas y alcance
1. [IMT PT881, 2025](https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf): tabla 4.2, página impresa 51 / física PDF 61, T3-S2 INTERNATIONAL 9200i, Cummins ISX 450 HP, caja de aluminio 40 pies, llantas 1100-20. Modelo económico interurbano; no costo de una flota usada 2021 ni curva del corredor. Las salidas monetarias se interpretan por 1,000 vehículo-km conforme a la tabla. Las cantidades/coeficientes impresos son redondeados; se mantienen los costos publicados.
2. [TTI Urban Mobility Report 2025, Appendix C](https://static.tti.tamu.edu/tti.tamu.edu/documents/mobility-report-2025-appx-c.pdf): Exhibit C-3, impresa 5 / física PDF 7; método impresa 5–6 / física PDF 7–8. R&M 0.212 y llantas 0.048 USD/vehículo-milla son **estimaciones TTI para 2024**, no observaciones ATRI 2024 ni 2025 y no precios 2026. El modelo de valor de demora contempla camiones comerciales generales y supuestos de tipos de vehículo; no cohorte dry-van del piloto.
3. [ATRI formulario motor carriers 2026](https://truckingresearch.org/wp-content/uploads/2026/02/2026-Ops-Cost-Motor-Carrier-Form.pdf): pregunta 3, página 2 de 8. Recoge costos 2025 de combinaciones tractor-trailer, con millaje total que soporta los costos; excluye OO/IC del denominador si sus costos no se reportan. R&M incluye labor/reparaciones de camino, excluye llantas y remolques de auxilio; llantas incluye compra/mantenimiento/recape/reemplazo. **Formulario sin respuestas: no evidencia de precio ni garantía de idéntica frontera TTI.** No se llenó ni envió.

La actualización ATRI 2026 se localizó en su índice oficial, pero las páginas del informe devolvieron 403 y no se obtuvo tabla actual directamente. No se importaron cifras 0.198/0.047 de resúmenes comerciales ni se actualizaron valores TTI con porcentajes de otro periodo. El archivo público de metodología ATRI sí se descargó y revisó directamente.

Tres originales con hash en el [JSON](B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json); IMT reutilizado sin alterar, TTI/ATRI archivados nuevos. Lectura completa relevante de las páginas: tabla IMT 61, TTI 7–8 y ATRI 2; notas y encabezados preservados. No se editó o reexportó un PDF.

## Fichas de contraste por vehículo-km
No son comparables entre países sin moneda, periodo, población y método alineados. Los subtotales sólo agrupan las líneas seleccionadas de la misma fuente; **no CVU completo**.

| Ficha | Año de costo | Mantenimiento publicado sin llantas | Lubricantes separados | Llantas | Subtotal seleccionado |
| --- | --- | ---: | ---: | ---: | ---: |
| MX · modelo IMT T3-S2 | 2025 | 5.61754 MXN/km (labor + refacciones) | 0.27967 MXN/km | 0.96996 MXN/km | 6.86717 MXN/km |
| US · estimación TTI | 2024 | 0.131730693 USD/km (agregado R&M) | No establecido, no cero | 0.029825817 USD/km | 0.161556510 USD/km |

MX: labor 2,010.02 + refacciones 3,607.52 + lubricantes 279.67 + llantas 969.96 MXN por 1,000 vehículo-km. US: (0.212 + 0.048) USD/vehículo-milla ÷ 1.609344 km/milla internacional. No se elige FX ni se convierte este contraste mexicano a un input USD/km.

**Precisión**: 0.33 × 2,926.73 = 965.8209, no 969.96. 0.27% × 1,321,263 = 3,567.4101, no 3,607.52. 30.48 × 65.95 = 2,010.156, no 2,010.02. La tabla imprime entradas redondeadas; no se “corrige” su resultado monetario ni se obtiene vida/precio instalado desde él. La discrepancia no prueba una falla del motor FCM. Equivalentes de llantas VOC no son posiciones físicas ni conteo entero de recapes.

## Puente al inventario existente, no expansión de valores
El revisor concilia contra las dependencias reales de benchmark-rates y el catálogo:
- **COST_MAINT: 31 keys** = PM 10k (8 Qty/PU), PM 100k (10), PM 250k (8), reservas (5).
- **COST_TIRES: 12 keys** = cuatro tripletas Qty/PU/Life: Dirección, Tracción, Remolque y fila heredada Recapeadas.

| Grupo de inputs | Lo que aporta la fuente | Lo que NO permite inferir |
| --- | --- | --- |
| PM 10k: aceite motor, filtros aceite/diésel y labor | Lubricantes/labor/refacciones MX separados; R&M US agregado | Cantidad de litros, piezas o eventos de un vehículo objetivo, frecuencia 10k, tarifa instalada o mano de obra por servicio |
| PM 100k: aceites caja/transmisión/hidráulico y filtros/aire | Misma apertura de familias, no desglose por sistema | Qty/PU particulares ni intervalo 100k universal |
| PM 250k: baterías, inyectores, clutch y frenos | Refacciones/labor del modelo, no estas compras identificadas | Eventos a 250k, precio de pieza, tasa de falla o que frenos incluya tracto/remolque |
| Reservas DEF, lubricantes, refrigerante, DPF y no programado | Lubricantes MX explícitos; US apertura pendiente | Reservas USD/km o refrigerante USD/100000km; no copiar defaults ni agregar lube si el bloque ya lo cubre |
| Dirección/tracción/remolque: Qty/PU/Life | Costo agregado de llantas y configuración del modelo | Identidad/fitment, precio entregado/instalado, vida por posición, cantidad en flota objetivo |
| Recapeadas | Familia tires incluye recape en metodología; ciclo local ya existe | Ruedas nuevas adicionales, etapas/probabilidades o crédito del casco no observados |

Fórmula de mantenimiento existente: Σ(Qty × PU / intervalo km) + reservas exclusivas, normalizando refrigerante por 100,000 km. No se usa el subtotal público para poblar los 31 insumos.

Para llantas se reutiliza tire-lifecycle-economics: costo esperado del neumático nuevo + recapes ponderados − crédito terminal, dividido entre vida esperada, multiplicado por posiciones físicas. Los recapes son etapas secuenciales de la carcasa. La fila Recapeadas heredada y la permutación PU del workbook no se reinterpretan como calibración ni se editan en este corte. La prueba numérica de ciclo es sintética, no evidencia económica.

El contrato benchmark-public-reference-components ya verifica exclusión de familias y solapes con renta; se reutiliza su frontera, no se inventa una ruta de adopción. Si una renta cubre mantenimiento o llantas, no se añaden como bloque aparte. El costo del remolque físico se calcula una vez por ciclo y sólo después se asigna con sustento; sin 50/50 tácito ni suma de dos tasas compuestas.

## Faltantes económicos y condición de reapertura
MX: aplicabilidad del perfil/edad/ruta; periodo vigente, tratamiento de precio/impuestos/FX; instalación/vida/casco/recape por posición o modelo agregado compatible; responsable y reparto tracto/remolque.
US: hipótesis pública compatible con la cohorte y fecha, frontera lubricantes/DEF/tows y denominador que corresponda al costo; split de activos y ciclo/asignación.
Ambos: tasas maintenanceUsdPerKm, tiresUsdPerKm, tractor-only, trailer-only, shares y CVU piloto permanecen null. La investigación se cierra como contraste; **COST_MAINT/COST_TIRES no se declaran calibradas**. Reabrir sólo con un modelo público específico sustentado o evidencia de la frontera/asignación necesaria, no pedir historiales privados como requisito universal.

## Validación y límites
- **335/335 pruebas focalizadas, 13 archivos; 34 nuevas**. La primera ampliación no permitió recuperar el resultado global del proceso; se repitió y se capturó PASS completo. No certificación de suite general, producción ni sesión autenticada.
- Typecheck API y del script estricto: PASS; comprobación de diferencias sin errores de formato.
- CLI offline: salida 2 esperada por NO-GO; **10 hashes coincidentes** (3 PDF + 7 expedientes previos). Auditor canónico: salida 0, sin incidencias documentales; 135/135, 3 candidatos / 47 contrastes / 85 faltantes / cero adoptadas.
- Conversión por vehículo-km, suma exclusiva, scope/periodo, fuente metodológica usada como precio, duplicados, unidades inválidas, no ceros por ausencia, fronteras de recape y granularidad: comprobados localmente.
- [Notebook](B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.ipynb): cuerpos de celdas ejecutados como archivo con Python 3.12; cálculo independiente y diez hashes PASS. Validación básica de estructura y binding de salida PASS; **sin kernel Jupyter ni inspección renderizada certificados**. Se corrigió el binding de stdout antes de la validación final. Tabla exacta de dos fichas; no gráfica monetaria inválida.
- Script: apps/api/scripts/review-maintenance-tires-reference.ts; test: apps/api/tests/benchmark-maintenance-tires-evidence.test.ts. Sólo lectura local, sin API externa ni llamadas a negocio.

## Entorno, modelo y rollback
D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd, verificados antes de editar. AGENTS en D: vacío y sin política adicional API/docs localizada. Worktrees verificados; árbol ya sucio preservado. No commit/staging ni cambio del motor activo.

Recomendación por actividad: GPT-6.1 Sol · alto para investigación, fronteras económicas, implementación y validación; medio para empaquetado documental. No cambio automático del selector ni necesidad de Astra.

Sin cambios de DB/Neon/Auth/usuarios/infraestructura/despliegue/producción/operaciones de negocio/IA de aplicación. No UI nueva ni wireframe requerido en este corte de evidencia; el desarrollo SaaS conservará wireframes UI/UX y marca MARKSMAN.

Rollback: retirar sólo JSON/MD/ipynb, script y prueba nuevos de este corte, los dos PDF nuevos TTI/ATRI y los párrafos nuevos de plan/estado. **Conservar el PDF IMT**, expedientes, código y cambios ajenos anteriores. No restaurar archivos enteros. Los originales TTI/ATRI son recuperables desde los enlaces y hashes. No se ejecutó eliminación ni rollback.

