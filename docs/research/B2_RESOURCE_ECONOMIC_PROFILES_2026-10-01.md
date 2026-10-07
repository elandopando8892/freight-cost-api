# B2 · fichas económicas por recurso y capital/utilización coherentes

## Qué cambió

Antes las piezas de capital US usaban millaje ATRI y la referencia reciente de utilización usaba PAMT, sin una comparación conjunta. Ahora el consolidado existente relaciona **tres perfiles públicos propuestos** con sus activos, moneda, ambos modos de pago y las diez partidas originales. También calcula cinco contrastes US con **el mismo millaje para pérdida de valor y divisor de distancia**, incluyendo historial público de un VIN.

Es investigación integrada y aritmética local probada. **No se completó todavía el presupuesto fijo MX/US/caja, B2 ni el piloto SaaS.** Ningún perfil propuesto se transfirió al presupuesto gobernado, ningún faltante pasó a cero y no hubo DB/Auth/producción/deploy.

Se conserva el caso elegido: México, DF → Fort Smith AR 72916 vía Puente III, caja seca 53′, tractores propios distintos MX/US y misma caja, contado y financiado. Un activo de normalización no equivale a flota de un tractor; mismo grupo no demuestra propietario/registrante/asegurado legal.

## Benchmark previo y recomendación

| Alternativa | Capacidad concreta | Decisión |
|---|---|---|
| Mantener capital ATRI y dividirlo entre utilización PAMT | Fácil, pero el millaje que afecta residual no cambia con el que asigna el costo | Conservar antecedentes como contraste, no usar mezcla silenciosa |
| Modelo ANL + precio Ryder + cada proxy de uso explícito | Sensibilidad reproducible con millaje coherente; fuentes de años/poblaciones diferentes, sin pronóstico certificado | Adaptar dentro del consolidado existente; sólo componente condicionado |
| Usar historial del tractor Ryder como productividad del piloto | Denominador de un VIN conocido; no población incierta, pero ventana irregular y uso/condición futuros no establecidos | Contraste adicional, no selección automática |

No motor, biblioteca, infraestructura o proveedor nuevos. Cálculo de propiedad/depreciación y MAX son estándar; la capacidad propia del FCM consiste en mantener frontera, evidencia y responsabilidad por recurso sin duplicar caja o gastos. Se reutilizan ADR-007/008/009 y módulos actuales; no se declara innovación para justificar otro desarrollo.

## Las tres fichas conectadas

| Recurso | Ancla documental | Moneda | Qué falta para capital completo |
|---|---|---|---|
| Tractor MX | Cascadia 2021 manual DD15, anuncio RODAL | MXN | Compra capitalizable, horizonte planificado y modelo de residual usado MX, interés/comisiones pertinentes |
| Tractor US | Cascadia sleeper 2021 VEH-526505, Ryder | USD | Corrección de adquisición/impuestos/preparación, disposición neta, validación del modelo futuro y financiación/comisiones |
| Una caja compartida | Utility 4000 D-X 2021 53′, anuncio | MXN | Compra/venta fiscalmente comparables, residual y horizonte planificados, financiación, propietario/cobertura/registro y exposición propia |

El JSON del mismo nombre fija las referencias; cada ficha devuelve las filas de capital, seguro, permisos y el fondo administrativo que le corresponden. Se conserva un solo fondo, sin reparto en tercios, y una sola caja. Ninguna ficha adopta tamaño de flota, fecha de viaje o periodo de presupuesto.

## Evidencia nueva de uso histórico por activo

[Ryder VEH-526505](https://www.ryder.com/en-us/used-trucks/inventory/oklahoma/oklahoma-city/tractor/tandem-axle-sleeper-tractor/2021/freightliner-mercedes/new-cascadia-px12664/526505) publica precio USD 40,495, siete lecturas fechadas y la advertencia de que sólo muestra preventivos, no historial completo ni certificación actual. El anuncio excluye impuestos/cargos y su odómetro de cabecera es anterior al último registro. Se releyó la fuente y el HTML original ya archivado: no se deducen conductor, vacíos, territorio, condición o días operativos.

| Fecha | Odómetro publicado, millas |
|---|---:|
| 2024-09-03 | 553,292 |
| 2024-11-18 | 601,570 |
| 2025-01-27 | 658,257 |
| 2025-04-23 | 720,575 |
| 2025-06-19 | 760,042 |
| 2025-10-20 | 842,610 |
| 2026-03-30 | 868,507 |

Extremos: **315,215 millas en 573 días calendario transcurridos**; tasa normalizada `delta_millas × 1.609344 / días × 365/12 = 26,928.54 km/mes promedio anualizado`. Último intervalo: 25,897 millas en 161 días, 7,873.79 km/mes equivalente. Se normalizan ambos con la misma convención explícita, no con meses calendario observados ni días productivos. El total usa suma de millas/suma de días; nunca promedio no ponderado de los seis ritmos.

La diferencia entre ventanas es importante: no prueba avería, baja, conductores en equipo o fin de vida. No es distribución estadística representativa ni pronóstico. No se extrapola a MX ni a la caja.

## Capital y utilización unidos en el mismo supuesto

Se cotejó visualmente la tabla 3.11, p60 impresa/PDF91, del [ANL/ESD-21/4](https://publications.anl.gov/anlpubs/2021/05/167399.pdf): coeficientes sleeper 0.9071 por año y 0.9990 por mil millas. Muestra de anuncios estadounidense de 2019, no regresión específica del VIN ni vida útil restante. La copia local y el método histórico se conservan por hash; la precisión publicada no aporta intervalo predictivo.

```text
h = 36 meses (ventana analítica ya documentada, no vida restante)
delta_millas = q_km_mes / 1.609344 × h
retención = 0.9071^(h/12) × 0.9990^(delta_millas/1000)
valor_final_bruto_de_referencia = 40495 × retención
pieza_pérdida_de_valor_mes = 40495 × (1-retención) / h
pieza_por_km = pieza_pérdida_de_valor_mes / q_km_mes
```

No sumar el odómetro actual al exponente incremental. Cada proxy de q afecta **tanto** el residual modelado como el divisor: mayor uso eleva pérdida mensual aunque baje su equivalente/km.

| Contraste | q km/mes condicionado | Pieza de pérdida de valor USD/mes |
|---|---:|---:|
| PAMT FY2025 | 10,483.59 | 460.86 |
| PAMT H1 2026 | 11,307.27 | 472.99 |
| PAMT Q2 2026 | 11,720.88 | 479.00 |
| Historial VIN completo | 26,928.54 | 665.32 |
| Último intervalo VIN | 7,873.79 | 420.93 |

Los datos de PAMT y su población condicionada siguen en el [expediente de denominador](B2_DRYVAN_DENOMINATOR_RECONCILIATION_2026-10-01.md). Ni su superposición ni el VIN se suman entre sí. Se trata de combinar fuentes explícitamente como sensibilidad, **no convertirlas en una muestra conjunta**.

Puente de capital US completo:

```text
pieza_pérdida_de_valor_mes
+ (compra_capitalizable_USD - 40495 + disposición_USD)/36
+ interés_del_escenario_USD + comisión_asignada_sustentada_USD
```

Las correcciones no son cero por falta de datos. Contado sólo fija interés de deuda cero como escenario; financiado conserva interés real pendiente, APR no transformada a nominal y no suma cuota completa con depreciación. Seguros/permisos/overhead no entran en la pieza de capital. No se añade aquí el promedio Progressive 926 para aparentar presupuesto completo.

## Qué falta y cómo cerrar sin más validadores

Los perfiles están relacionados, **no económicamente completos**. Hay diez montos originales nulos. Su siguiente cierre debe reunir:

1. Términos de capital y supuestos revisables de residual/horizonte por recurso, sin trasferir vida nueva a usados ni coeficientes US a MX/caja.
2. Seguro y permisos del perfil modelado, incluyendo caja/territorio y responsable; prima general no acredita cobertura y el evento de autoridad no es mensual recurrente.
3. Fondo completo de empresa/empleador con cantidades, inclusión de prestaciones, jurisdicción, ámbito y reparto respaldados. Ningún gasto faltante se considera cero ni se reparte un agregado nacional en 23 precios arbitrarios.
4. Capacidad compatible de los tres recursos y ciclo serial del caso: días productivos no se deducen de odómetro, DRIVE, ingresos o semanas legales; la caja no hereda retornos de ambos tractores.

Después: CVU/peajes/cruce vigentes y una estimación extremo a extremo local en SaaS, con wireframe MARKSMAN antes de UI. No nuevos sprints por cada condición técnica ni solicitud de documentos privados XBF. No hace falta una decisión nueva del usuario para esta comparación; si el cierre requiere cambiar método, alcance o adoptar hipótesis económicas en una base, se propondrá el objeto y autorización específicos.

## Modelos y consumo · 2026-10-01

Recomendación: OpenAI **GPT-6.1 Sol high** para comparabilidad/capital, **medium** para captura y aritmética/QA. Riesgo de costo mal asignado y periodos desiguales justifica la revisión económica; cálculos deterministas después permiten bajar esfuerzo. Codex actual suficiente, sin ventaja demostrada de repetir en Claude.

Observación directa read-only de este corte: Codex CLI **0.159.2**; Claude Code **2.1.286**, autenticado vía claude.ai/firstParty, subscriptionType max. Catálogo Desktop anuncia gpt-6.1-sol y sus esfuerzos, pero catálogo/CLI instalada/login no prueban inferencia con cada modelo, ID/esfuerzo principal exacto o cuota. Versiones concretas Sonnet/Fable/Haiku, esfuerzos por modelo y excedentes no verificados; **ninguna llamada Claude**, agente o selector principal cambiado. Se reutiliza el [registro anterior](B2_DRYVAN_DENOMINATOR_RECONCILIATION_2026-10-01.md), sin tratar la declaración Fable del usuario como nueva verificación oficial ni decidir usarlo.

Consumo monetario/tokens/cuota/cache desconocidos, no estimable. Reutilizar fuentes y reporte evita entrada duplicada de un auxiliar; no se promete ahorro total cuantificado. Presupuesto desde conciliación acotada: 20 minutos implementación/QA, dos accesos por fuente inaccesible como máximo, una reparación de tipos/pruebas. Se hizo una reparación TypeScript y se repitió lo afectado. No escalar por falta de fuente/datos/permisos. Revaluar ante nueva contradicción metodológica o ampliación material, no por rutina.

## Validación y recuperación

**108/108 pruebas PASS** tras la última edición ejecutable: 43 consolidación, 35 exposición, 30 presupuesto. Typecheck estricto PASS. `testing-strategy` orientó casos de conservación/unidades/fronteras, no un build completo repetido. CLI readback PASS: 16 pins, tres perfiles, siete registros/seis intervalos, cinco contrastes, exit 2 intencional por incompletitud; presupuesto 15 condiciones/exposición 41 incidencias, 0 filas completas, 0 adopciones y outputs nulos. PDF skill exigió cotejo visual de tabla/cohortes; no se editó ni exportó PDF.

Integridad: pin de este JSON; además se verifica HTML Ryder original y método JSON ANL reutilizado. Todos los pins anteriores intactos. Fechas UTC/tiempo transcurrido, no horas laborales; prueba de extremos/suma evita promedio erróneo. Fichas fuente y salidas son locales, no guardado en DB, flujo autenticado, despliegue o utilización del SaaS.

Rollback selectivo: retirar pin `economicProfiles`, bloques `publicModelResourceProfiles`/`supportingJointUsCapitalExposure` y cálculos nuevos de historial/capital conjunto; quitar sólo cinco tests de este corte y sus encabezados de estado/plan. Conservar tests/pins previos, expedientes originales y trabajo ajeno; no reset/checkout/limpieza general. Los PDF/renders previos se reutilizaron, no se borraron.
