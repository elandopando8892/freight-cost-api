# B2 · remuneración y cargas laborales MX/US

Corte de fuentes: 2026-09-29. Verificación local: 2026-09-30. Modelo recomendado para investigación, conciliación y verificación: **GPT-6.1 Sol · alto**; no se cambió el selector. Piloto: costo productivo estimado de dos transportistas terceros, caja seca D2D con intercambio, sin transbordo.

## Resultado del corte

Se entregan dos fichas laborales parciales y el cruce completo de **siete roles / catorce claves COST_PAYROLL**, separando conductor, administración, prestaciones y cargas. La ficha MX ya tiene una lectura directa de oferta del empleador con pago por km y vales de periodicidad explícita; US incorpora un desglose oficial sectorial y reglas federales. No se fabrica un factor patronal común ni se divide salario de una población entre exposición de otra.

El corte es de la rama de **operador empleado propuesta**, no una clasificación real de los carriers ni una base de owner-operator. Si el operador es propietario/contratista, hay que modelar su responsabilidad y compensación económica aparte; no convertir la ausencia de nómina en costo cero.

Artefactos: [JSON de fichas y límites](B2_LABOR_COMPENSATION_BRIDGE_2026-09-29.json), [notebook con salidas guardadas](B2_LABOR_COMPENSATION_BRIDGE_2026-09-29.ipynb), [22 pruebas nuevas](../../apps/api/tests/benchmark-labor-compensation-evidence.test.ts). No hay motor nuevo, endpoint ni cambios UI; no corresponden wireframes nuevos.

**B2 sigue parcial**, B1/E1 abiertos, cero adopciones y **0/4 gates** cerrados. Los importes completos de operador, administración, CFU/CVU y compra/venta permanecen desconocidos. El siguiente corte ensambla las dos fichas económicas por familia y subtotales elegibles; no otra ronda genérica de índices salariales.

## Ficha MX: observación específica y paquete incompleto

Fuente: [Grupo Trayecto, operador quinta rueda, Ciénega de Flores](https://careers.trayecto.com/operador-5ta-rueda-GKZvj9NRHO9o/). Se obtuvo texto desde la URL directa mediante lector web, no sólo resultado de búsqueda; no se afirma una descarga HTML archivada ni confirmación del empleador.

| Concepto observado | Dato | Tratamiento |
| --- | ---: | --- |
| Pago anunciado por km cargado o vacío | 2.10 | MXN inferidos del contexto monetario explícito de la misma ficha; no costo patronal ni USD. |
| Vales de despensa | 3,430 mensuales | Periodicidad explícita; falta confirmar adicionalidad, elegibilidad y costo efectivo del empleador. |
| Encabezado salarial | 22,000–24,000, etiquetado anual | Conflicto de periodicidad; no se corrige a mensual ni se suma como sueldo fijo. |
| Modalidad | Quinta rueda sencilla, caja seca | Coincide a nivel amplio; no prueba cohorte D2D, configuración exacta ni intercambio. |

La etiqueta relativa de antigüedad indica «hace 1 año»; no hay fecha absoluta de publicación verificada ni disponibilidad actual confirmada. Bruto/neto y mínimo/garantía siguen desconocidos. La otra oferta Trayecto del expediente previo no es una empresa independiente ni un sueldo adicional.

Transformación de sueldo anunciado: `2.10 × 1.60934 = 3.379614 MXN/milla pagada`. No es tarifa `USD/mile` adoptable.

Puentes analíticos, no nuevas fórmulas activas:

```text
W_periodo = 2.10 × (km_pagados_cargados + km_pagados_vacíos)
Paquete_parcial = W_periodo + 3430 × meses_operador_elegible
C_empleador = W_atribuible + prestaciones_no_incluidas
            + cuotas_patronales + vivienda + ISN_aplicable + otros_atribuibles
Operador_USD_km = C_empleador_MXN / km_vehículo_mismo_período / FX_aplicable
```

El subtotal de vales exige adicionalidad y elegibilidad explícitas. Km pagados, km físicos del vehículo y cantidad de operadores no son equivalentes. No se descuentan del numerador retenciones para simular costo bruto ni se agregan automáticamente como nuevos costos.

Se reutiliza el [dossier MX de cuotas por componente](B1_MX_DRIVER_EMPLOYER_COST_RULES_2026-09-29.md), intacto: SBC fijo/variable/mixto, ramas y días, riesgo, vivienda e ISN según jurisdicción. No se revalidó su legislación ni ejecutó SUA en este corte. No se traslada el factor de un operador a nómina administrativa ni se adopta 30%.

## Ficha US: tres referencias distintas, sin mezclar sus denominadores

| Rama pública | Alcance y período | Uso permitido en este expediente |
| --- | --- | --- |
| [BLS OEWS/OOH](https://www.bls.gov/ooh/transportation-and-material-moving/heavy-and-tractor-trailer-truck-drivers.htm) | Mediana salarial anual de conductor pesado en truck transportation, mayo 2025: USD 60,320 | Contraste salarial; no convertir con millas nacionales ATRI ni con ratio sectorial ECEC. |
| [ATRI histórico reutilizado](B1_PILOT_ASSET_LABOR_EVIDENCE_2026-09-29.json) | Truckload 2024, cinco grupos de tamaño; sueldo + beneficios USD 0.790–1.058/milla | Referencia histórica entre grupos: 0.490884–0.657412 USD/km con factor actual del motor. No banda de confianza, grupo seleccionado ni costo patronal completo certificado. |
| [BLS ECEC, tabla 4](https://www.bls.gov/news.release/ecec.t04.htm) | Junio 2026, transporte/almacenaje **todas las ocupaciones**, publicado 9 sep | Alcance patronal de beneficios y contraste sectorial; no factor específico del piloto. |

ECEC: sueldo **32.95**, beneficios **16.90** y total publicado **49.86 USD/hora trabajada**. Beneficios/sueldo = **51.29%**; beneficios/total = **33.89%** (tabla redondeada 33.9%). La diferencia de denominador importa: 33.9% no es recargo salarial. Sueldo + beneficios redondeados da 49.85; se conserva la diferencia de 0.01 frente al total publicado.

Los cinco rubros de beneficios son 3.35 permisos pagados, 1.70 pagos suplementarios, 5.31 seguros, 2.72 retiro/ahorro y 3.82 obligaciones legales; suman 16.90. Las [definiciones BLS](https://www.bls.gov/ecec/questions-and-answers.htm) incluyen cargas legales en beneficios: no sumar impuestos patronales otra vez a un total que ya los contiene. Las inclusiones de ATRI no se certifican equivalentes a ECEC. Owner-operators/self-employed tampoco representan esta población ECEC.

No se adoptó el porcentaje sectorial, se agregaron beneficios ECEC a ATRI ni se construyó una estimación híbrida con mediana salarial/horas/millas de cohortes diferentes. El informe ATRI más reciente completo no fue obtenido; la fila histórica mantiene 2024.

### Reglas federales US, no factor efectivo de nómina

Se revisó [IRS Publication 15, 2026](https://www.irs.gov/publications/p15), novedades y secciones 9/14. Parte patronal: Social Security 6.2% hasta USD 184,500 anuales cubiertos; Medicare 1.45% sin tope. Additional Medicare no tiene parte patronal. FUTA bruto 6% sobre primeros USD 7,000; 0.6% sólo si procede crédito máximo, no asumido. SUI, workers compensation, créditos y bases gravables reales siguen pendientes.

Puente incremental por persona y año:

```text
SS_patronal_periodo = 0.062 × min(sueldo_cubierto_periodo,
                               max(184500 − sueldo_cubierto_YTD_previo, 0))
Medicare_patronal_periodo = 0.0145 × sueldo_Medicare_cubierto_periodo
FUTA_periodo = tasa_efectiva × min(sueldo_FUTA_periodo,
                                 max(7000 − sueldo_FUTA_YTD_previo, 0))
```

Tasas normativas no son costos observados ni clasificación laboral. No se ejecutó determinación fiscal o nómina. No se suman retenciones obreras ni cargas ya incluidas. La rama US permanece sin costo patronal/km completo.

## Administración: inventario y frontera CFU/CVU

| Rol canónico | Proxy ocupacional US ya investigado | Faltante para referencia del carrier |
| --- | --- | --- |
| Despachador | Dispatchers, except police/fire/ambulance | Función, FTE, sueldo/cargas y atribución. |
| Jefe Tráfico | Transportation/storage/distribution managers | Proxy funcional, no cargo idéntico. |
| Gerente Operaciones | General and operations managers | Universo amplio, sin dotación atribuible. |
| Gerente Comercial | Sales managers | Función y costos separados de venta XBF. |
| Safety Manager | Occupational health and safety specialists | Especialista no equivale a gerente; no relabelar salario. |
| Tracking CS | Customer service representatives | Alcance de tracking/servicio, plantilla y carga. |
| Billing Admin | Billing and posting clerks | Facturación, funciones y asignación. |

Los siete pares Qty/PU están vinculados a sus catorce keys en JSON y pruebas; MX/US FTE y costo patronal mensual quedan null. Las cifras ocupacionales nacionales anteriores son proxies, no se copian a la ficha de un carrier ni se crea un organigrama ficticio.

Modelo por rol: `Σ FTE × (salario_mensual + beneficios_patronales_no_incluidos)`. Alternativa: bloque combinado ADMIN_PAYROLL + COMPANY revisado, **no ambas sumas**. No duplicar nómina ya contenida en overhead ni trabajo de taller dentro de mantenimiento.

Puente verificado en código existente:

- `Tarifa Operador país / 1.60934 → driverUsdPerKm → km físicos cargados+vacíos del tramo`.
- `Carga Social → COST_PAYROLL fijo administrativo`; no es dependencia de operador/km.
- `WAGES_ONLY` exige beneficios separados; `EMPLOYER_TOTAL` impide agregarlos otra vez.
- Beneficios mensuales del conductor requieren amortización coherente por exposición y asignación; no cargarlos íntegros en cada tramo ni repetirlos como administración.

## Validación, estado y rollback

**222/222 pruebas** pertinentes en siete archivos, incluidas **22 nuevas**; typecheck API y auditor canónico aprobados. El primer intento de la nueva prueba falló por una ruta dependiente del directorio de ejecución; se corrigió a ubicación relativa al archivo y el conjunto se ejecutó de nuevo completo. No se cambió el motor.

Notebook ejecutado de principio a fin con Python estándar: **21 comprobaciones analíticas**, más checks de contexto y cuatro hashes. Salidas guardadas; **no kernel Jupyter ni inspección renderizada**, todavía pendientes. Para inspección, abrir el notebook guardado en un visor compatible; para kernel, disponer de Jupyter/nbconvert y ejecutar desde raíz del worktree:

```text
python -m jupyter nbconvert --execute --to notebook --inplace docs/research/B2_LABOR_COMPENSATION_BRIDGE_2026-09-29.ipynb
```

No se certifica suite general ni release: la incidencia de snapshot de metadatos registrada en el corte anterior permanece fuera de esta verificación. Sin validación autenticada nueva ni adopción económica.

Inventario sin deriva: **135/135 documentadas; 3 candidatos, 47 contrastes, 85 faltantes; cero adoptadas**. Los cuatro expedientes previos conservan hashes del JSON; registro/dependencias también intactos. B2 parcial, 0/4 gates: cerrar este entregable no cierra el sprint económico.

Worktree: `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`; HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Reglas, rama, HEAD, worktrees y cambios previos revisados antes de editar. Política central leída, vacía; no AGENTS aplicable en API/docs. Sin stage/commit.

Rollback selectivo: retirar únicamente este MD/JSON/notebook y nuevo test, y los párrafos «Corte B2 remuneración/cargas» añadidos a plan/estado. Revisar diff; no restaurar documentos completos que contienen trabajo ajeno. Recibo de fuentes fuera del repo, sin efecto runtime. No cambios de bases, DB/Neon, usuarios, Auth, infraestructura, UI, despliegues, negocio o IA de aplicación.

## Próxima salida orientada al MVP

**Ensambla dos fichas económicas MX/US**, con fila por familia: dato público, hipótesis explícita pendiente de seleccionar, período/cohorte, exclusiones, faltantes y permiso de subtotal. Llevar capital/remolque/labor no resueltos; priorizar las familias operativas faltantes a partir de esa vista. Ninguna suma final se publica como costo completo mientras dependa de unknowns. La guía de análisis mantuvo separados el costo observado, contraste y escenario modelado; no impuso disponibilidad de datos privados XBF.
