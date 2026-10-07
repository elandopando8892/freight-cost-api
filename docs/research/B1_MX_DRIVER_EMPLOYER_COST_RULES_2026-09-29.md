# B1 — Operador MX: remuneración y costo patronal trazables

Corte: 2026-09-29. Piloto D2D de terceros, caja seca sencilla T3-S2, tramo MX e intercambio con transportista US. Trabajo local en D:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`.

## Resultado del corte

El faltante de operador MX ya tiene un **contraste específico por kilómetro** y un **mapa de componentes legales** con tasas, bases y vigencias. Se entrega [registro JSON](B1_MX_DRIVER_EMPLOYER_COST_RULES_2026-09-29.json) para continuar la derivación reproducible; no un nuevo importe de cotización. Es una mejora sobre el salario ocupacional amplio ENOE: identifica pago cargado/vacío y separa sueldo, prestaciones, SBC y costo patronal.

No hay todavía remuneración total comparable del piloto: faltan bruto/neto, periodicidad e inclusiones de beneficios, SBC aplicable, prima de riesgo, jurisdicción de nómina, cantidad/asignación de operadores y exposición del mismo período. **B1/E1 abiertos; 3 candidatos / 47 contrastes / 85 faltantes; cero adopciones y 0/4 gates completos.** La lectura de normas no resuelve esas variables empresariales. No se modificaron fórmulas activas ni se cargaron bases.

## 1. Oferta de remuneración y calidad de la observación

Fuente primaria editorial: [Grupo Trayecto, Operador sencillo caja seca](https://careers.trayecto.com/operador-sencillo-caja-seca-xI1ywOf9L4-o/). El lector de búsqueda devuelve una vacante de carretera, base Querétaro, rutas nacionales Irapuato–Chihuahua/Hermosillo. Publica **$2.10 por km cargado/vacío**; la ficha salarial expresa MXN. Se conserva MXN/km como inferencia del contexto monetario de la misma ficha, pendiente confirmación directa.

La tarjeta muestra MXN 5,500–8,000 semanales, mientras el cuerpo estima 6,000–8,000. No son dos fuentes independientes ni un rango estadístico del mercado. No se promedian, ni se infieren kilómetros semanales dividiendo sueldo entre tarifa. Se mencionan IMSS, prestaciones anuales, contratación, vales y ahorro, pero no un costo patronal completo ni periodicidad inequívoca de todos los beneficios. Bruto/neto y relación entre tarifa y paquete quedan sin confirmar.

**Límite de acceso/frescura:** se obtuvo texto indexado del dominio del empleador; la página directa presentó protección de acceso y el lector web no logró abrirla. No se eludió esa protección ni se contactó al empleador. No hay fecha de publicación absoluta verificada ni disponibilidad actual confirmada. Se trata de un contraste con verificación directa pendiente, no una oferta vigente certificada. La vacante similar Larmex del mismo grupo no se cuenta como otra empresa/muestra.

Puente de unidades, únicamente documental:

`2.10 MXN/km × 1.60934 km/milla = 3.379614 MXN/milla`.

Para una futura entrada `USD/mile`, dividir por `FX_MXN_PER_USD` de fecha/regla compatible; **FX no se fija en este corte**. Esa transformación conserva sólo la remuneración anunciada, no agrega ni certifica prestaciones/cargas, peajes, combustible, viáticos o compra/venta. La configuración exacta T3-S2 e intercambio D2D no están confirmados por la vacante.

## 2. Fuentes normativas: base y año antes de porcentaje

Se revisó la [LSS vigente, reforma 15-01-2026](https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf), especialmente arts. 25, 27–31, 36, 72–74, 106–107, 147, 168 y 211–212; transitorios de 1995 y del decreto 16-12-2020. El [anexo oficial IMSS 2024–2025, cuadro A.3](https://www.imss.gob.mx/sites/all/statics/pdf/informes/20242025/15-anexos.pdf), p.232 impresa / PDF6, sirve para comprobar componentes, sujetos obligados y desindexación a UMA; sus promedios/CEAV de 2024 **no se trasladan a 2026**.

La [UMA INEGI 2026](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf), vigente desde **1 febrero 2026**, es MXN **117.31 diarios**. Su valor mensual no reemplaza los días realmente cotizados ni los días productivos del vehículo. Para enero hace falta la UMA anterior. El límite superior de referencia SBC es 25 UMA = **MXN 2,932.75 diarios**; no es sueldo del operador. El umbral de cuota excedente es 3 UMA = **MXN 351.93 diarios**. El mínimo aplicable requiere zona/fecha y las reglas pertinentes; no se sustituye por UMA.

### Esqueleto de cuotas patronales, no un factor universal

Definiciones: `U` = UMA diaria aplicable; `S` = SBC diario integrado/cotizable validado; `d_i` = días sujetos a cada ramo; `r_RT` = prima patronal de riesgo respaldada; `r_CV` = cuota CEAV correspondiente a año/rango. Todos los porcentajes de la tabla son **patronales**, no la suma patrón/trabajador/gobierno.

| Componente | Expresión documental en MXN | Fuente / condición |
|---|---|---|
| Enfermedad/maternidad, cuota fija | `0.204 × U × d_EM` | Art.106-I + transitorio decimonoveno; se concilia 13.9 + 10×0.65 = 20.4%; IMSS A.3 |
| Excedente de 3 UMA | `0.011 × max(S − 3×U, 0) × d_EM` | Art.106-II + mismo transitorio: 6 − 10×0.49 = 1.1%; no sobre SBC íntegro |
| Prestaciones en dinero EM | `0.007 × S × d_EM_dinero` | Art.107: 70% de una cuota de 1% |
| Gastos médicos pensionados | `0.0105 × S × d_GMP` | Art.25 |
| Invalidez/vida | `0.0175 × S × d_IV` | Art.147 |
| Guarderías/prestaciones sociales | `0.01 × S × d_GPS` | Arts.211–212 |
| Retiro | `0.02 × S × d_R` | Art.168-I; no duplicar como RCV total + retiro separado |
| Cesantía/vejez | `r_CV × S × d_CV` | Columna **2026** del segundo transitorio 16-12-2020; no columna final 2030 |
| Riesgos de trabajo | `r_RT × S × d_RT` | Arts.72–74; no adoptar el promedio IMSS ni clase/prima por defecto |
| Vivienda | `0.05 × S × d_VIV` | [Ley INFONAVIT](https://www.diputados.gob.mx/LeyesBiblio/pdf/LIFNVT.pdf), reforma 21-02-2025, art.29-II; distinta de descuentos de crédito al trabajador |

Si el SBC cambia, segmentar y sumar períodos con sus valores/días propios. No imponer un único `d=30`: ausencias e incapacidades tienen reglas por ramo (LSS art.31; vivienda art.29). En salario mínimo, art.36 contempla cuota obrera a cargo del patrón: la tabla sola no agota ese caso. No se ejecutó SUA ni determinación real de obligaciones; la revisión contable/legal de aplicabilidad queda pendiente antes de adoptar.

### CEAV: extracción visual de la columna 2026

LSS p.153, segundo transitorio del decreto 16-12-2020. Se guardan **etiquetas legales**, sin implementar fronteras/rangos por redondeo ni asumir que cualquier operador cae en la última fila:

| Rango publicado de SBC | Patronal 2026 |
|---|---:|
| 1.0 SM | 3.150% |
| 1.01 SM a 1.50 UMA | 3.676% |
| 1.51 a 2.00 UMA | 4.851% |
| 2.01 a 2.50 UMA | 5.556% |
| 2.51 a 3.00 UMA | 6.026% |
| 3.01 a 3.50 UMA | 6.361% |
| 3.51 a 4.00 UMA | 6.613% |
| 4.01 UMA en adelante | 7.513% |

La última fila legal es 11.875% en **2030**, no 2026. La conversión entre SM/UMA y la clasificación de un SBC requieren regla explícita y validación; aquí no se programa una selección automática. El SBC de sueldo variable/mixto se distingue del ingreso efectivo: LSS art.30 usa ingresos variables del bimestre anterior y días de salario devengado; no kilómetros de carretera ni una mediana ENOE.

### CANACAR: hallazgo útil, aplicabilidad no resuelta

La [búsqueda pública del propio emisor](https://canacar.com.mx/?s=salario+base+cotizacion+2026) localiza un recordatorio de SBC referente 2026, relacionado con UMA y circular 249/2025. La [circular completa](https://canacar.com.mx/circulares/recordatorio-del-salario-base-cotizacion-referente-2026-acuerdo-imss-canacar/) y la [constancia 2025](https://canacar.com.mx/circulares/constancia-del-acuerdo-imss-canacar-2025/) requieren socio activo. **No se extrajo el tabulador restringido**, no se asumió elegibilidad del transportista, y no se proyectó un factor 2025 a 2026. Un SBC referente tampoco sería sueldo neto/bruto ni costo total por km. Se conserva como acceso/aplicabilidad pendientes; continuar con fuentes públicas, sin solicitar credenciales.

## 3. Cómo llega al motor y qué debe quedar separado

Se verificaron las fórmulas del checkout actual:

- `benchmark-rates.ts`: operador/km = `Tarifa Operador país / 1.60934`; no consulta `Carga Social` para esa tasa.
- `engine.outputs.ts`: `Carga Social` multiplica los siete roles **administrativos** `COST_PAYROLL` dentro del fijo mensual. El fallback legacy de 0.3 no es evidencia; el enumerador/derivador benchmark exige la key y no adopta ese default.
- [Contrato ADR-008](../architecture/ADR-008-payroll-capital-economic-contract.md): `WAGES_ONLY` exige beneficios separados; `EMPLOYER_TOTAL` prohíbe sumarlos de nuevo. Fuentes `PUBLIC_CONTRAST`/`TAX_RULE` no certifican el contrato como compatible.

Por tanto, **no insertar 2.10/FX como si fuera operador total** ni suponer que el 30% administrativo ya carga prestaciones del conductor. Para B2 se debe construir una rama explícita por esquema salarial, antes de traducirla a la tarifa heredada:

1. Remuneración en el período = parte fija respaldada + `r_cargado×km_pagados_cargado` + `r_vacío×km_pagados_vacío` + pagos adicionales no incluidos. Confirmar cuáles son excluyentes; no sumar salario semanal anunciado si describe el resultado de la misma tarifa.
2. SBC = integración del sueldo fijo/variable/mixto, régimen y exclusiones válidos; **no es el numerador económico de salario**.
3. Costo del empleador = remuneración + prestaciones devengadas no incluidas + cuotas patronales + vivienda + impuestos locales sobre nómina y demás costos atribuibles respaldados. Retenciones obreras/ISR/crédito no son automáticamente costo adicional; excepciones y absorción contractual requieren evidencia. No duplicar vacaciones pagadas ya dentro del salario ni convertir previsiones de SBC en otra prestación pagada.
4. Operador `MXN/km` = costo atribuible de operadores de la cohorte / kilómetros del mismo período/activos. Exposición y asignación a vehículo/tramo explícitas: no asumir un conductor por tracto, ni que kilómetros pagados son todos los del vehículo.
5. Convertir a USD/km con FX compatible; mantener salario y beneficios separados en `WAGES_ONLY`, o total único en `EMPLOYER_TOTAL`. Nómina administrativa sigue por FTE y regla de overhead; no reutilizar factor efectivo del operador para todos los roles.

Estas son transformaciones propuestas, no un cálculo completo. Faltan prestaciones anuales/contrato efectivas, SBC, riesgo, estado/ISN, exposición y asignación. No se suma una prima/costo desconocido como cero. La [plantilla B2 real](B2_PAYROLL_CAPITAL_CONTRACT_TEMPLATE_2026-09-29.json) conserva todos sus nulls.

## 4. Validación, estado y siguiente entrega

Se revisaron visualmente CEAV 2026, UMA y cuadro A.3 con notas; se preservan localizadores/hashes del JSON. Los cuatro PDF descargados están en `tmp/pdfs/b1-mx-labor-20260929/`, con tres renders; son copias de consulta, no archivo documental permanente. La limpieza temporal queda pendiente por la restricción de ejecución ya encontrada en el corte anterior; no se intentó eludirla. No se afirma verificación directa de la oferta protegida ni del contenido CANACAR restringido.

Se comprobaron aritmética, vigencia, tasas patronales versus totales y el linaje del inventario; una regresión local asegura que `Carga Social` pertenece a fijo/admin y no aparece como dependencia de operador/km. Resultado: **39/39 pruebas locales** (19 inventario y 20 contrato económico), JSON y referencias conciliados; `npm run audit:b1:inventory -- --check` terminó con cero incidencias, 135/135 claves documentadas, 3/47/85, `calibrated=false`, `quoteReady=false` y cero adopciones. Hash SHA-256 del registro revisado: `77709817ef721518e8922c2e07b0a637bc638abed3fbe09cc67be758bf0be67c`; dependencias del motor sin cambio: `9c8510de32dbdd8a9a86f99f571f1e41171f683ce005106eeb26fbae1e46001d`.

Validación local no prueba costos, nómina, sesión ni negocio reales. Cambios ajenos preservados; sin DB, Auth, usuarios, infraestructura, operaciones, IA de la aplicación, UI ni despliegues.

**Próximo entregable económico:** escenario trazable de adquisición/vida restante/residual de usados, sin extrapolar políticas de equipos nuevos; completar campos económicos de operador sólo cuando la fuente pública respalde inclusiones/exposición. Si no se obtiene una tarifa patronal comparable, registrar esa insuficiencia y una hipótesis de referencia explícita, no declarar la base calibrada. No abrir más pantallas por este corte.

Modelo único recomendado: **GPT-6.1 Sol · alto**, para conciliación económica y fuentes; no requiere Astra ni se afirma cambiar el selector. La guía de validación mantuvo separados oferta, norma y costo observado, y evitó sustituir parámetros por porcentajes genéricos.

Rollback: retirar sólo este informe/JSON, sus notas nuevas en plan/estado, los dos enlaces/explicaciones nuevos del registro y la prueba de dependencia nueva. No revertir documentos completos ni avances previos; no hay cambios externos que revertir.
