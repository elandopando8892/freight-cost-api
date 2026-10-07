# B1 — Contrastes públicos de nómina y depreciación para MX/US

**Corte:** 2026-09-29
**Uso:** investigación comparativa para el piloto tercero D2D de caja seca T3-S2
**Estado:** contraste público; no calibrado, no adoptado, no listo para cotizar
**Límite:** salarios por ocupación y políticas contables/fiscales no equivalen a costo completo del transportista por FTE, mes o km.

## Resultado ejecutivo

Hay referencias recientes útiles para encuadrar salarios y ciclos de activos, pero no un expediente público compatible que permita llenar estos campos del piloto:

- El salario mexicano publicado para conductores es una categoría amplia y de baja precisión estadística; no aísla tractocamión, carga general de larga distancia, empleo formal/for-hire ni pago por milla/km. El BLS de EE. UU. ofrece mejor desglose ocupacional, pero sus salarios nacionales son de trabajador, no costo patronal por milla y tampoco describen al transportista específico.
- Para EE. UU., empresas transportistas públicas revelan vidas útiles y residuales contables separados por activo; sus propios informes advierten sensibilidad al mercado usado, perfil operativo y segmento. Son escenarios de comparación, no un promedio universal. Para México se encontró una tasa fiscal de deducción, no una vida económica ni residual de mercado.
- No aparecieron precios de adquisición comparables por tracto/remolque, configuración/año/condición y mercado; faltan además cantidades FTE y regla de asignación del overhead del transportista a tractos o viajes. No se adoptan salarios, tasas de carga social, precio de activo, horizonte ni valor residual.

## 1. Nómina: evidencia y cobertura

### Datos observados en las fuentes

| Mercado / referencia | Observación publicada | Aporta | No aporta / decisión |
|---|---|---|---|
| México — Data México / ENOE, ocupación 8341, T1 2026 | Salario promedio mensual publicado: **MXN 9.71 mil** para conductores de camiones, camionetas y automóviles de carga; la página advierte baja precisión para salarios | Control de realidad de una ocupación amplia y reciente | Mezcla clase/tipo de conductor, actividad, formalidad y tipo de pago; no identifica sueldo de operador T3-S2, compensación de larga distancia, prestaciones ni km de producción. **Sólo contraste; no `Sueldo Base Operador MX` ni USD/km.** |
| EE. UU. — BLS OEWS/OOH, SOC 53-3032, mayo 2025 | Mediana anual **USD 58,640** para heavy/tractor-trailer drivers; la página da **USD 60,320** de mediana en la industria Truck Transportation | Referencia actual por ocupación y una vista de industria para sueldo del conductor | No es costo patronal completo, pago por milla ni cohorte cross-border/dry van. BLS dice que la remuneración suele ser por millas más bonos y que la tarifa varía por empleador, carga y experiencia. **No convertir salario anual en `USD/mile` sin denominador y esquema de pago comparables.** |
| EE. UU. — BLS OEWS nacional, mayo 2025 | Existen ocupaciones aproximadas para los siete roles administrativos; tabla y crosswalk abajo | Mapea títulos del catálogo a códigos/ocupaciones observables y permite construir contrastes | Es nacional y multi-industria; las correspondencias funcionales no certifican sueldos de un carrier de tamaño/operación desconocidos. Ningún importe se incorpora al costo por tracto. |
| EE. UU. — BLS ECEC, junio 2026 | Media privada general: **USD 32.82/h** salarios y **USD 14.07/h** prestaciones; su publicación desglosa vacaciones, seguro, retiro y prestaciones legalmente requeridas | Prueba que BLS separa salario y carga de prestaciones y ofrece una canasta de componentes | El promedio es de toda la industria privada, no sólo autotransporte ni operadores. No es una tasa de carga utilizable para MX o US en el piloto. |
| México — IMSS/SUA y salario base de cotización | El IMSS señala que salario base de cotización puede diferir del salario real; el cálculo patronal depende de salario integrado y determinaciones aplicables (incluida clase/prima de riesgo) | Marco para diseñar una fórmula/hoja de costo patronal basada en remuneración y cotización | No respalda un recargo universal de 30%. Falta reproducir el costo patronal para salario, prestaciones, días, clase/prima y estado aplicables al transportista. |

### Crosswalk del catálogo `COST_PAYROLL`

El catálogo actual tiene siete roles, cada uno con cantidad en FTE y precio mensual por FTE (14 claves en total). Los pares de conteo/precio permanecen faltantes; BLS sirve sólo para contraste en EE. UU.:

| Rol en la base | Referencia candidata BLS (US) | Límite de equivalencia |
|---|---|---|
| Despachador | Dispatchers, except police, fire, and ambulance | Incluye despachadores no carreteros. |
| Jefe de tráfico | Transportation, storage, and distribution managers | Categoría gerencial que incluye almacenaje/distribución; no es necesariamente jefe de despacho. |
| Gerente de operaciones | General and operations managers | Todas las industrias; responsabilidades no uniformes. |
| Gerente comercial | Sales managers | No separa freight brokerage, ventas de carrier, comisión ni cartera. |
| Safety Manager | Occupational health and safety specialists | Especialista, no equivalente automático a gerente de seguridad de una flota federal. |
| Tracking CS | Customer service representatives | Servicio al cliente amplio; no aísla rastreo/track & trace ni guardias 24/7. |
| Billing Admin | Billing and posting clerks | No mide FTE, transacciones ni outsourcing del carrier. |

No se encontró para estos siete roles un cruce ENOE MX, vigente y validado que sea a la vez equivalente en función y compatible con la cohorte. No se llenan los salarios MX con el promedio de conductores ni con un rol BLS traducido.

### Hallazgo metodológico de nómina

`LABOR__Carga Social` es una sola clave compartida MX/US en el inventario actual, mientras que el costo patronal, bases salariales y obligaciones difieren por país y por la remuneración específica. BLS ECEC mide compensación/prestaciones como costo por hora; su porcentaje de beneficios sobre compensación **no** equivale sin transformación a un “% adicional a salario”, y menos aún a una tasa mexicana. Antes de calibrar, separar: (a) remuneración directa del conductor por modalidad de pago; (b) costo patronal legal/beneficios por país; (c) nómina administrativa por rol; y (d) cantidades/FTE y regla de asignación de overhead por flota/productividad.

## 2. Depreciación: vidas contables, fiscalidad y huecos

| Fuente | Tracto | Remolque caja seca / otros | Uso correcto |
|---|---|---|---|
| Covenant Logistics Group, reporte anual 2025, política contable | Vida estimada de tractores nuevos de 5 años; residuales de 0%–35% según segmento | Caja seca: 10 años y residual ~25%; refrigerado: 7 años y ~20% | Contraste por política contable de un carrier US con perfiles/segmentos propios. La propia fuente liga vida/residual a uso, mercado usado y segmento y registra cambios/ajustes. No promediar ni asignar a XBF. |
| Marten Transport, reporte anual 2025 | Vida contable de 5 años; residual 20% para tractores puestos en servicio desde 2024; reemplazo promedio a 4.2 años | Vida contable de trailers 7 años y residual 35%; reemplazo promedio a 8.1 años. Flota incluye 2,244 dry vans y 2,863 reefers, por lo que la política no es una cifra pura de caja seca | Contraste de otra empresa, escala y mix; no combinar con Covenant como si compartieran cohortes/equipos. |
| EE. UU. — IRS, Pub. 946 (2025) | Clasifica tractor units over-the-road bajo reglas fiscales MACRS; período GDS 3 años en esa clase | Otras clases de trucks/equipo tienen reglas fiscales distintas | Sólo recuperación fiscal; **no** vida de uso económica, política contable ni valor de venta del equipo. |
| México — LISR (última reforma indicada por Cámara de Diputados al 01-abr-2024) | Tasa máxima fiscal de deducción anual de 25% | La fracción VI lista automóviles, camiones, tractocamiones y remolques | Regla tributaria, no evidencia de vida útil económica, método lineal real ni residual de mercado. No traducir a “cuatro años de vida”. |

**No hay benchmark de precios unitarios compatible** en esta revisión: los 10-K presentan costo agregado, métodos y valor residual estimado, pero no una transacción pública T3-S2 nueva/used que case con moneda, año-modelo, motor, caja seca, condición, impuestos, financiamiento, fecha y mercado MX/US. Los valores `PU Tracto`, `PU Remolque` y “rescue” continúan sin evidencia comparable/adopción. Tampoco se halló evidencia mexicana comparable para vida económica/residual por equipo.

### Reconciliación con el esquema que el motor consume

El registro canónico actual marca las 11 claves `COST_CAPITAL` sin respaldo comparable. En el catálogo hay cantidades/precios de tracto, remolque, dolly y unidades llamadas “rescue”; un solo `Periodo Depreciacion`; LTV y tasa anual. La fórmula de `benchmark-rates` resta del activo los importes de “rescue” para construir residual, y divide por un solo horizonte. En cambio, `benchmark-capital-scenarios` conserva costo de adquisición, país/fecha/condición y pide para cada escenario horizonte con base (nuevo/usado) y residual, con evidencia asociada. Son contratos distintos que deben conciliarse antes de convertir este benchmark en el motor. Este corte **no** cambia fórmulas ni claves.

La diferencia de fuentes confirma por qué se requiere especificar equipo y escenario: un tracto, remolque caja seca, reefer, activo propio, usado y arrendado no comparten automáticamente precio, vida, residual o tratamiento financiero. Aún faltan precio de adquisición verificable, reventa residual para la cohorte piloto, condición/antigüedad, método de asignación mensual y evitar doble conteo con financiamiento, arrendamiento, mantenimiento y llantas.

## Decisión de B1 y siguiente paso

- Mantener como `MISSING` las siete cantidades FTE y sus siete precios mensuales, sueldo/rate operador MX/US, carga social y las variables de activo, valor residual, horizonte, LTV y tasa hasta que la fuente y el denominador correspondan al país/equipo/cohorte.
- Mantener DataMéxico/ENOE, BLS OEWS/ECEC, SEC, IRS y LISR como **contrastes o taxonomía**, no como valores de cotización. No sumar costes de prestaciones de una fuente a salario de otra población.
- Próximo corte recomendado (todavía B1): decidir el contrato metodológico mínimo por país/rol y activo/tenencia y reconciliarlo con las dos rutas del motor; en paralelo buscar fuentes públicas trazables de precios por año-modelo/configuración y denominadores MX de nómina formal. La salida debe ser propuesta y matriz de evidencia; implementación/adopción va después de suficiencia y revisión de GPT-6.1 Sol.

## Fuentes consultadas

- Data México/ENOE: [Conductores de camiones, camionetas y automóviles de carga](https://www.economia.gob.mx/datamexico/es/profile/occupation/conductores-de-camiones-camionetas-y-automoviles-de-carga).
- BLS: [May 2025 OEWS national wage table](https://www.bls.gov/news.release/ocwage.t01.htm) y [ocupational outlook para tractor-trailer drivers](https://www.bls.gov/ooh/transportation-and-material-moving/heavy-and-tractor-trailer-truck-drivers.htm).
- BLS: [Employer Costs for Employee Compensation](https://www.bls.gov/news.release/ecec.nr0.htm) y [definición/categorías de prestaciones](https://www.bls.gov/ecec/).
- IMSS: [integración y determinación del salario base](https://www.imss.gob.mx/node/96496), [determinación de prima de riesgo](https://www.imss.gob.mx/preguntas-frecuentes/sistemas/determinacion-prima), [SUA y actualización](https://www.imss.gob.mx/node/101777).
- SEC: [Covenant Logistics Group 2025 annual report](https://www.sec.gov/Archives/edgar/data/928658/000100888626000092/ars.pdf), políticas de equipo en p.57; [Marten Transport 2025 Form 10-K](https://www.sec.gov/Archives/edgar/data/799167/000143774926005971/mrtn20251231_10k.htm), equipos en pp.3–4 y vidas/residuales en p.42.
- IRS: [Publication 946 (2025)](https://www.irs.gov/publications/p946).
- México, Cámara de Diputados: [Ley del Impuesto sobre la Renta](https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf), art. 34, fracción VI; el propio PDF indica última reforma 01-abr-2024.

## Verificación, modelo y rollback

Se concilió el alcance contra el registro canónico `C1_B1_PARAMETER_SOURCE_REGISTER_2026-09-29.md`, el inventario ejecutable y las fórmulas actuales `benchmark-rates.ts` / `benchmark-capital-scenarios.ts`. En las fuentes BLS se conservan categorías y unidad; los importes que aparecen como contrastes no se transformaron a USD/month/FTE o USD/mile. El JSON replica sólo observaciones y estados sin adopción.

Modelo solicitado/recomendado para extracción: **GPT-6 Luna · alto** (esfuerzo bajo-medio); conciliación posterior de reglas/fórmulas: **GPT-6.1 Sol · alto** (esfuerzo medio). Astra no requerido. Esta sesión no puede modificar el selector del modelo; no afirmo que Luna haya ejecutado el corte. No se cambiaron fórmulas, parámetros, DB, Auth, usuarios, infraestructura o despliegues. Rollback: retirar sólo este informe/JSON y sus referencias al plan/estado.
