# B1 · estructura económica EAT 2024 para carga general (SCIAN 4841)

Fecha: 29 sep 2026 · Resultado: evidencia pública de estructura sectorial; no calibración de un carrier.

## Resultado del corte

El tabulado interactivo oficial de INEGI entrega importes nacionales preliminares de 2024 para `4841 Autotransporte de carga general` por concepto de gasto e ingreso. Se puede usar para ordenar familias e identificar exclusiones con evidencia mexicana directa. No da un costo por tracto, mes, km, viaje o modalidad D2D. El archivo de observaciones conserva filtros, importes, razones de uso y límites en [JSON verificable](B1_INEGI_EAT_2024_4841_COST_OBSERVATIONS_2026-09-29.json).

La unidad publicada es miles de pesos corrientes. El total de gastos por consumo de bienes y servicios es **142,797,153 miles de MXN** (142.797 mil millones). Combustibles y lubricantes son 60,860,623 miles (42.620%); reparaciones/refacciones de terceros, 18,601,610 (13.027%); peajes e infraestructura, 17,190,026 (12.038%); primas de seguro de bienes, 5,841,177 (4.091%). Son importes del universo muestral expandido nacional para la rama, no importes de un carrier observado nominalmente.

## Conciliación y frontera hacia FCM

| Rubro EAT 2024 | Miles de MXN | % del gasto en bienes/servicios | Puente defendible hoy |
| --- | ---: | ---: | --- |
| Combustible y lubricantes | 60,860,623 | 42.620% | CVU; contraste sectorial nacional, sin rendimiento cargado/vacío. |
| Refacciones, partes y mantenimiento corriente contratado a terceros | 18,601,610 | 13.027% | CVU/mantenimiento parcial; no demuestra mano de obra interna ni una frontera excluyente de llantas. |
| Peajes e infraestructura | 17,190,026 | 12.038% | CVU/peaje como contraste agregado; no es una ruta ni una tarifa por km. |
| Renta de equipo de transporte | 12,611,315 | 8.832% | No clasificar aún: puede reflejar arrendamiento/capacidad adquirida y solaparse con compra a terceros o capital. |
| Prima de seguro de bienes | 5,841,177 | 4.091% | CFU parcial; falta cobertura, activo y asignación a tracto/remolque. |
| Otros gastos de bienes/servicios | 17,817,264 | 12.477% | Mantener sin clasificar; no convertir residual en overhead. |

El resto de las partidas numéricas —materiales, electricidad, renta de otros bienes, pagos por personal suministrado, honorarios, publicidad, comunicaciones y placas/licencias— suma con los rubros de la tabla a 142,797,155 miles de MXN: **2 mil por encima** del total publicado. Se preserva la diferencia y no se fuerza el redondeo. El 12.477% de “otros” no prueba gastos corporativos fijos. “ND” permanece como dato no disponible y “NA” se conserva como categoría no aplicable; ninguno se convierte en cero.

Los ingresos totales de bienes/servicios son 265,365,927 miles de MXN, de los cuales el transporte de carga representa 247,289,946 (93.188%). Gastos en bienes/servicios / ingresos totales equivale a 53.811% por cálculo propio; su denominador incluye ingresos ajenos al servicio de carga y **no es margen, utilidad, ni proporción del costo de un viaje**.

## Personal, activos y denominadores

El reporte EAT publica para 4841 un total preliminar de 167,612 personas ocupadas y 414 millones de horas trabajadas. Registra 38,604 millones de MXN de remuneraciones del personal dependiente (6,206 millones para mujeres y 32,398 para hombres). Las remuneraciones cubren personal operativo y administrativo y no separan puestos de conductor, back office o terceros. No dividí remuneraciones entre personal total: numerador y denominador no tienen el mismo alcance contractual. La distribución de activos fijos de transporte (72% en unidades y equipo de transporte) es para el conjunto del sector transportes, no específicamente 4841.

El informe de resultados consultado no expone kilómetros/año por vehículo ni días-vehículo productivos para 4841. Por tanto, estos agregados no alimentan `F_veh_mes`, `CFU/km`, `CFU/día`, salario de conductor ni una tasa de mantenimiento. La EAT recopila información sobre transporte y parque vehicular en sus instrumentos, pero la disponibilidad de una pregunta en el instrumento no equivale a un tabulado público con la misma población y año.

La EAT 2024 usó una muestra nacional de 1,339 empresas/establecimientos y sus cifras todavía son preliminares. El informe indica que los indicadores de precisión por dominio se publican para empleo e ingreso. No atribuyo intervalos de confianza a las partidas de gasto de este corte. La fecha que publica INEGI para resultados definitivos de 2024 es el 10 dic 2026.

## Decisión de uso

Estas familias entran al expediente con estado `PUBLIC_CONTRAST`; ninguna llave canónica cambia de estado y no se asignan importes a una base ni al motor. Para avanzar el camino de negocio, el siguiente corte debe resolver primero exposición de flota comparable (vehículos de servicio, km/año y días o viajes) en una publicación abierta mexicana; luego buscar apertura de remuneraciones por clase de trabajador y activos/depreciación por rama. Si INEGI no publica el mismo cruce, el resultado del piloto permanece `INCOMPLETE`; no se distribuyen agregados en los microdrivers actuales.

### Fuentes primarias

- [Tabulado interactivo EAT, Gastos e ingresos](https://www.inegi.org.mx/app/tabulados/interactivos/?bd=EAT&px=EAT_2) — filtros: `Dato`, SCIAN 4841, año 2024; las observaciones obtenidas se detallan en el JSON enlazado arriba.
- [Reporte INEGI EAT 2024](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/eat/EAT2024_RR.pdf) — muestra/metodología p.2, empleo/remuneraciones pp.4–7, horas y remuneración media pp.10–12, activos fijos pp.14–15.

## Estado de trabajo y rollback

Entrega documental/research únicamente. Se conserva el worktree con cambios previos; el navegador queda en la consulta EAT de gastos como evidencia navegable. Para revertir sólo este corte, retirar este documento y el JSON, y quitar las dos referencias de este corte en `SPRINT_STATUS.md` y el plan de negocio. No hay datos persistidos ni fórmulas, parámetros, Auth, base de datos, usuario, infraestructura o despliegue asociados.

Modelo recomendado para el corte: GPT-6 Luna · alto (extracción); GPT-6.1 Sol · alto (conciliación y revisión económica). El estado del selector no cambia.
