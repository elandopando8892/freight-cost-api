# B2 · activo usado, residual condicionado y remolque de ciclo único

Fecha: 2026-09-29. Modelo recomendado para investigación metodológica, análisis y verificación: **GPT-6.1 Sol · alto**. No se cambió el selector del chat. Corte local de investigación, no calibración ni release.

## Resultado para el negocio

El capital del tracto usado ya tiene una sensibilidad explícita de edad y uso, sin trasladar la vida contable de un tracto nuevo. El remolque físico compartido se calcula una sola vez antes de cualquier reparto. Esto reduce dos riesgos: presentar un horizonte de tenencia como vida restante comprobada y sumar asignaciones nacionales que sobrecargan el mismo activo.

El corte entrega análisis y pruebas; **B2 permanece parcial**, B1/E1 abiertos, cero valores adoptados y **0/4 gates de negocio**. No produce todavía un CFU/CVU completo del piloto ni una tarifa de compra o venta. La siguiente familia es remuneración/cargas laborales MX/US en los mismos perfiles; los faltantes de capital viajan con el resultado parcial. No se prolonga otra búsqueda genérica de anuncios o vidas contables.

Artefactos: [datos y límites](B2_USED_RESIDUAL_SHARED_CYCLE_2026-09-29.json), [notebook con ejecución guardada](B2_USED_RESIDUAL_SHARED_CYCLE_2026-09-29.ipynb) y [20 pruebas nuevas](../../apps/api/tests/benchmark-used-residual-shared-cycle.test.ts).

## Evidencia pública y alcance

| Fuente | Qué aporta | Qué no establece |
| --- | --- | --- |
| [Argonne ANL/ESD-21/4, 2021](https://publications.anl.gov/anlpubs/2021/05/167399.pdf), §3.2.5.2, pp.58–60 impresas / 89–91 PDF, ecuación 3.8 y tabla 3.11 | Relación histórica de anuncios de septiembre de 2019 para tracto Class 8 sleeper: retención anual 0.9071 y por mil millas adicionales 0.9990. | Transacciones futuras, valor neto de venta, supervivencia, vida restante del activo usado, intervalos de predicción o coeficientes de tracto mexicano/remolque. |
| Argonne, p.170 impresa / 201 PDF | Escenario analítico de primer propietario a tres años. | No demuestra que el usado seleccionado pueda operar otros 36 meses; se adapta únicamente como ventana de estrés de tenencia condicionada. |
| [ATRI 2025, operación 2024](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf), reutilizado del expediente de exposición | 82,677 millas/año como ancla histórica nacional all-sectors. | Exposición observada del tracto anunciado, pronóstico futuro o cohorte conjunta con la regresión de 2019. |
| [Heartland, FY2025, Nota 1](https://www.sec.gov/Archives/edgar/data/799233/000079923326000006/htld-20251231.htm) | Equipos de adquisiciones empresariales con uso previo se revalúan y deprecian según uso restante esperado. Contraste de método. | Un plazo numérico transferible a nuestra compra directa usada. No se adoptan vidas/residuales de activos nuevos. |

Se leyó texto y se inspeccionaron visualmente las cuatro páginas relevantes de Argonne. La descarga canónica no funcionó; se obtuvo el [espejo gubernamental regulations.gov](https://downloads.regulations.gov/EPA-HQ-OAR-2022-0985-1644/attachment_11.pdf). Su texto relevante coincide con la lectura web canónica; no se afirma identidad binaria del original canónico no descargado. PDF de 227 páginas, SHA-256 `c49755ae06436d51fda2c629d9b3ab8595279713f7e852d825e9a90e400d4425`.

## Puente de residual, no depreciación neta calibrada

La relación publicada es `RV(a,m) = C × exp(A×a + M×m)`, con edad en años y kilometraje **en miles de millas**. Para la misma hipótesis proporcional, la razón futura/actual es:

`q(h, Δmillas) = 0.9071^h × 0.9990^(Δmillas / 1000)`.

El intercepto y la edad/kilometraje iniciales se cancelan en la razón. No se descuenta dos veces el odómetro actual de la oferta. Anclarla a un precio pedido actual supone que el efecto proporcional histórico sigue siendo aplicable y que ese precio representa el mercado: hipótesis explícitas, no ajuste validado del VIN ni precio de transacción.

| Escenario condicionado a 36 meses | Millas/año | Millas adicionales | Retención bruta relativa |
| --- | ---: | ---: | ---: |
| Menor uso, estrés analítico 0.8× | 66,141.6 | 198,424.8 | 61.20% |
| Exposición histórica ATRI | 82,677 | 248,031 | 58.24% |
| Mayor uso, estrés analítico 1.2× | 99,212.4 | 297,637.2 | 55.42% |

El ±20% es sensibilidad elegida, **no intervalo publicado ni banda de confianza**. El notebook conserva precisión completa. El ancla anunciada 45,000 mantiene moneda sin certificar; su valor bruto condicionado no se publica como USD ni residual neto. No se seleccionó escenario ni se cargó a una base.

Para llegar a depreciación del costo capitalizable faltan `A` (adquisición capitalizable efectiva) y `K` (costos de disposición): `R_neto = V_actual × q − K`; `D_mensual = (A − V_actual × q + K) / N`. Estos faltantes son desconocidos, no cero. `N=36` es ventana condicionada, no vida restante validada. Capital mensual MX/US, remolque, CFU/CVU y precios siguen null.

La referencia US no se transfiere a México ni a un remolque. Tampoco se aplica a caja seca un modelo IMT histórico refrigerado. El residual y la vida restante MX permanecen desconocidos.

## Remolque: un ciclo físico, después reparto

Se reutiliza `benchmark-shared-trailer.ts::calculateSharedTrailer`, integrado en el cálculo D2D existente; no se crea otro motor ni se modifica código activo.

Con presupuesto mensual `C` y exposición propios del remolque: `CFU_ciclo = max(C × km_ciclo / km_mes_remolque, C × días_ciclo / días_mes_remolque)`. El ciclo debe incluir su recorrido físico y permanencias aplicables. No se sustituyen sus denominadores por los del tracto ni se asume que todo vacío del tracto corresponde al mismo remolque.

**Prueba exclusivamente sintética:** C=1,000, 10,000 km/mes, 20 días/mes; MX 80 km/2 días y US 920 km/0.5 días. El ciclo único resulta 125; sumar máximos por tramo produce 192, sobreasignando 67. Un reparto ilustrativo posterior 40/60 produce 50+75=125. Ninguna de estas cifras es benchmark público, regla contractual o input adoptado.

Opciones de responsabilidad: aporta línea MX, aporta línea US o pool acordado. Todas quedan **sin seleccionar**. Propietario económico, responsable del costo, país de base y participaciones permanecen null; titularidad y responsabilidad de pago no son equivalentes. No se impone 50/50, reparto por distancia ni propietario ficticio para desbloquear el piloto.

## Verificación y límites

- **210/210 pruebas locales** en ocho archivos, incluidas 20 nuevas de evidencia, unidades y asignación sobre el cálculo existente.
- Notebook ejecutado de principio a fin con Python estándar: **15 comprobaciones de retención y 10 de ciclo**, más verificaciones iniciales de no adopción y hashes. Salidas guardadas; no es ejecución de kernel Jupyter ni inspección de notebook renderizado. Esa inspección queda pendiente.
- Revisión de tipos API y auditor canónico aprobados: **135/135 documentadas, 3 candidatos, 47 contrastes, 85 faltantes, cero adoptados**, sin diferencias documentales.
- Plantilla, ledger, perfil y puente de adquisición anteriores conservan los cuatro hashes registrados en el JSON. Registro de fuentes y requerimientos conservan sus hashes del auditor.
- No se certifica suite general: continúa la incidencia anterior de snapshot de metadatos de `benchmark-route.test.ts` (315/316 en el corte anterior). No se alteró para hacer pasar este corte.
- No se realizó login/validación autenticada, adopción económica, despliegue ni operación de negocio. Sin cambios UI, por lo que no hay wireframes nuevos.

## Entorno y rollback

Worktree verificado en `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Se revisaron política y worktrees antes de editar. Se preservaron las modificaciones previas del usuario; no se hizo commit ni stage.

Rollback local selectivo: retirar únicamente este MD/JSON/notebook y el nuevo test, y los párrafos identificados «Corte B2 residual/ciclo único» añadidos al plan y estado. Revisar el diff antes de retirarlos; no restaurar los archivos completos porque contienen trabajo anterior. El PDF de evidencia y el recibo de fuentes están fuera del repositorio y no cambian runtime. Sin migraciones ni modificaciones de Neon, bases, usuarios, Auth, infraestructura, producción o IA de aplicación.

## Próximo corte finito

Remuneración del operador y cargas del empleador MX/US: recuperar observaciones públicas comparables, separar salario/compensación total/beneficios y nómina administrativa, relacionar periodicidad/exposición con LABOR/COST_PAYROLL, y devolver dos fichas parciales con inclusiones/faltantes. Usar referencias públicas, no exigir historial privado XBF. Mantener estos faltantes de capital visibles antes de combinar el costo D2D; no detener todas las demás familias buscando un residual certificado inexistente.
