# B1 - Capital de usados: vida restante, residual y alcance por activo

Corte: 2026-09-29. Piloto D2D de terceros, caja seca T3-S2 MX-US con intercambio, sin transbordo. Checkout `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Modelo recomendado único: GPT-6.1 Sol, esfuerzo alto; no requiere Astra ni se afirma cambiar el selector.

## Resultado de negocio

Se entrega el [expediente por activo y escenario](B1_USED_CAPITAL_LIFECYCLE_2026-09-29.json): distingue adquisición del usado, horizonte restante y residual con su base monetaria. La reconstrucción histórica tiene importes reproducibles, **no importes elegidos para el piloto**. Permite revisar el componente de depreciación sin sustituir costo fijo completo, CFU, compra ni venta.

La evidencia pública revisada **no determina aún vida restante ni residual neto de los equipos ofrecidos del piloto**. No se elevan sus parámetros a candidato/adoptado: 135/135 claves documentadas, 3 candidatos / 47 contrastes / 85 faltantes, cero adopciones, B1/E1 abiertos y 0/4 gates completos. La plantilla B2 conserva sus nulls. No se fuerza una calibración con políticas de equipos nuevos, porcentajes fiscales o valores de otro segmento.

## 1. Reconstrucción histórica: qué demuestra y qué excluye

[IMT PT630, 2021](https://www.imt.mx/archivos/Publicaciones/PublicacionTecnica/pt630.pdf), sección 2.2.10, p.19 impresa / PDF35, plantea MXN 3,000,000, pérdida de 20% en el primer año y 7% en los siguientes, con rescate al año 9 de MXN 1,342,996.34. La Figura 2.1 está rotulada **servicio refrigerado**, no caja seca. El conjunto no desagrega tracto y remolque; su endpoint no certifica vida económica ni precio futuro del piloto. No se importa su asignación por viaje.

Reconstrucción local de esa trayectoria, no actualización de mercado:

```text
V(0) = P
V(y) = P * (1 - 0.20) * (1 - 0.07)^(y - 1), y=1..9
V(9) = 1,342,996.343196... MXN
```

El resultado redondeado al centavo concilia con el residual impreso. Para mostrar la diferencia entre horizonte total y restante, se reexpresa **la misma trayectoria modelada**, en cada edad entera de entrada 1 a 8; no se supone una compra real:

| Edad de entrada modelada | Valor modelado de entrada, MXN | Meses hasta endpoint año 9 | Pérdida lineal equivalente, MXN/mes |
|---:|---:|---:|---:|
| 1 | 2,400,000.00 | 96 | 11,010.45 |
| 2 | 2,232,000.00 | 84 | 10,583.38 |
| 3 | 2,075,760.00 | 72 | 10,177.27 |
| 4 | 1,930,456.80 | 60 | 9,791.01 |
| 5 | 1,795,324.82 | 48 | 9,423.51 |
| 6 | 1,669,652.09 | 36 | 9,073.77 |
| 7 | 1,552,776.44 | 24 | 8,740.84 |
| 8 | 1,444,082.09 | 12 | 8,423.81 |

Derivación nuestra: `(V(edad) - V(9)) / (12 * (9 - edad))`. Es un promedio lineal documental; **no reproduce la pérdida anual decreciente, no incluye interés y no es CFU**. Las edades son todos los puntos interiores de la ilustración, no una política seleccionada. Año-modelo y odómetro de un anuncio no prueban edad exacta de puesta en servicio ni vida restante.

El rescate representa 44.7665% del valor original modelado, pero 74.8052% del valor modelado de entrada a edad 5. Aplicar 44.7665% al precio de ese usado cambiaría el endpoint sin justificación. El expediente guarda ambas bases, no una tasa residual universal. No se usa esta curva para proyectar el Cascadia 2021 ni la Utility 2015; moneda USD/FX, preparación y retiro siguen sin determinar.

## 2. Contrastes US: nuevos, flota y valor original no son un usado específico

| Fuente primaria revisada | Dato de su propia política | Límite para el piloto |
|---|---|---|
| [Schneider FY2025](https://www.sec.gov/Archives/edgar/data/1692063/000169206326000013/sndr-20251231.htm), Property and Equipment, p.48 | Tractores 3-8 años; equipo de arrastre 6-20. Rescate general 0-30% y 0-25% del **costo original**, respectivamente; refleja acuerdos para ciertos equipos nuevos | Rango de flota, no caja seca usada/VIN. No elegir punto medio ni restar mecánicamente año-modelo. |
| [Covenant FY2025](https://www.sec.gov/Archives/edgar/data/928658/000143774926006086/cvti20251231_10k.htm), p.61 | Tractores **nuevos**: 5 años, 0-35% según segmento. Remolque **nuevo caja seca**: 10 años, ~25%; reefer separado | Confirma separación por activo/segmento, no el residual neto ni horizonte restante de un usado. Los trade-backs tienen condiciones; no garantizan reventa a XBF. |
| [Ryder Q2 2026](https://www.sec.gov/Archives/edgar/data/85961/000162828026049417/r-20260630.htm), nota 6, p.13, interino no auditado | Tractores 4-7.5 años; remolques y otros 9.5-13. Revisa residuales por clase, uso, mercado y canal de venta; redujo algunos desde enero 2026 | Valores contables no son oferta ni transacción individual. Mezcla de activos; no extrapolar un residual desde totales patrimoniales o variaciones porcentuales del mercado. |

No se promedian rangos de estas empresas ni se trasladan valores nominales US a MX. La lectura revisó las secciones pertinentes, no todos los estados financieros ni cada activo de sus flotas. Los enlaces SEC no tienen captura binaria/hashes locales; el JSON diferencia esa lectura de los PDF IMT descargados.

## 3. Fronteras del costo y ficha mínima por activo

[IMT PT462, 2016](https://www.imt.mx/archivos/Publicaciones/PublicacionTecnica/pt462.pdf), Anexo 1, p.49 / PDF62, distingue precio de adquisición nuevo/seminuevo, vida condicionada por uso/deterioro/obsolescencia, rescate neto de gastos de retiro y comparación secundaria con equipos similares. Su herramienta requiere operación y mantenimiento; no obtiene vida restante desde un anuncio solamente. Es referencia metodológica histórica, no tasación actual.

[IAS 16, resumen público del emisor](https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/) separa precio neto de descuentos, impuestos no recuperables y costos directamente atribuibles para poner el activo en condición de operar. Se usa como frontera documental; no se afirma que todos los carriers estén sujetos a IFRS ni se dispone de la norma completa por esta lectura.

| Observación previa de oferta | Qué conserva este corte | Qué falta para el bloque capital |
|---|---|---|
| MX: tracto usado 2021 RODAL | Identificador y oferta del [registro anterior](B1_PILOT_ASSET_LABOR_EVIDENCE_2026-09-29.json); no revalidación nueva de stock/precio | Condición, puesta en servicio, costo capitalizable/FX, horizonte restante, rescate neto y tenencia |
| MX: Utility caja seca usada 2015 PriceSales | Oferta identificada, no asignación al carrier | Condición/ejes, vida restante, retiro/reventa, moneda/FX, quién aporta/paga el remolque |
| US: tracto usado 2021 SelecTrucks | Oferta histórica de febrero 2026, no precio actual | Oferta vigente/costo instalado, condición, vida restante, residual y financiación documentada |
| US: caja seca nueva modelo 2027 Great Dane | Condición nueva distinta de los tres usados | Fecha real de servicio, costo con impuestos/preparación, horizonte/residual, responsabilidad/asignación |

Las cuatro observaciones no prueban cuatro compras ni dos remolques necesarios. Cada ficha requiere identidad, responsable, cantidad de flota, tenencia y fechas; precio instalado con impuestos recuperables/no recuperables explícitos; vida de uso **desde adquisición**; residual con mercado, edad/condición terminal, base y tratamiento de gastos de disposición; interés o renta sin duplicación; exposición y regla de asignación entre tramos. Unknown no es cero.

Control adicional de inclusiones: Covenant declara llantas originales capitalizadas y reposiciones como gasto. Si el modelo incluye costo completo de esas primeras llantas en capital y en CVU, debe documentar una asignación sin solapamiento. No se descuenta automáticamente un juego ni se cambia la política económica desde una práctica contable externa.

## 4. Puente al motor, comprobaciones y cierre del corte

Se conserva [ADR-008](../architecture/ADR-008-payroll-capital-economic-contract.md): depreciación por activo = `(costo capitalizable - rescate compatible) / meses restantes`; interés/renta separados y asignación por responsabilidad antes de CFU. El período único legacy no debe recibir un promedio de vidas de tracto/remolque. El cálculo `capital-scenarios` sólo acepta USD: este expediente MXN permanece fuera de él, sin inventar FX. La plantilla real no recibe importes del modelo histórico. No se tocaron fórmulas activas.

Validación obtenida: **63/63 pruebas locales** (13 reconstrucción de capital usado, 11 escenarios existentes, 19 inventario y 20 contrato económico), typecheck API y `git diff --check` aprobados. Cálculo independiente con decimales concilia residual y reexpresión a edad 5. Se verificaron hashes de ambos PDF y la plantilla B2 conserva `cabfda00873356406d838306bfa87b912eccd9a6026449c0ebb26046acd8bd85` sin cambios. El auditor canónico terminó con cero incidencias, 135/135, 3/47/85 y cero adopciones; registro `bbe59230cbf21e1d301aaf6504877bb434c8a008592a625c02fc118de7846e66`, dependencias sin cambio `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`.

La revisión es proporcional a las fuentes/unidades/escenarios afectados; no prueba costos reales, suficiencia económica ni operación autenticada. La guía de validación mantuvo la clasificación refrigerado/caja seca, base original/usado, contexto contable/mercado y ausencia de costos netos a la vista. No se cambió UI: este corte no tiene nuevas pantallas ni requiere wireframe nuevo; B3 conserva su entregable de wireframes.

**Siguiente salida hacia el MVP:** seguros: relacionar prima, cobertura/deducible, equipo/responsabilidad y denominador, por país, con fuentes públicas identificables y destino CFU/CVU. Incorporar el resultado a la ficha económica del piloto por familia, antes de continuar overhead/exposición. No repetir búsqueda genérica de activos ni declarar cerrado B1 por tener una curva reproducible. Si no aparece vida/residual comparable, capital continúa pendiente; escenarios exploratorios permanecerán etiquetados y separados de una cotización aceptable.

Sin DB, Auth, usuarios, infraestructura, despliegues, operaciones de negocio o IA de la aplicación. Cambios previos preservados. Dos PDF y tres renders de consulta permanecen en `tmp/pdfs/b1-used-capital-20260929/`; no son archivo permanente. No se reintentó la limpieza rechazada en el corte previo ni se eludieron restricciones de acceso. La lectura pública directa IMT funcionó aunque el lector web no pudo recuperar esos PDF.

Rollback: retirar sólo este MD/JSON, la prueba nueva, las explicaciones añadidas a las tres filas de capital y las notas de este corte en plan/estado; no revertir archivos compartidos completos ni cambiar datos externos.
