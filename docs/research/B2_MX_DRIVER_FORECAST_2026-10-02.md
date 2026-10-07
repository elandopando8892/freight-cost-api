# B2 — proyección pública de compensación MX conectada al piloto

## Resultado y alcance

Antes: cuatro interpretaciones del pago por km/descanso estaban conectadas al piloto, pero los calculadores de prestaciones y cuotas no recibían una proyección económica del caso.

Ahora: proyección financiera explícita de operador principal y relevo, conectada a los dos ciclos conocidos México DF → Fort Smith por World Trade Bridge, tractores propios MX/US y la misma caja seca 53′. Las ocho combinaciones de ciclo, interpretación del descanso y tratamiento IVA del capital de contado reúnen componentes fijos, variables y carretera/frontera. No se suman alternativas entre sí. Caja, administración y pago original del operador MX se cargan una sola vez.

**No es nómina fiscal, una media de mercado calibrada, un costo D2D completo, un piso de costo ni una tarifa comercial.** Las seis salidas finales del consolidado siguen `null`. B2 sigue abierto; B3 no iniciado.

## Revisión previa y decisión

| Alternativa | Ajuste al caso | Decisión |
| --- | --- | --- |
| Añadir un porcentaje patronal al pago por km o aplicar el factor de salario fijo | No conserva bases/días por persona, vacaciones/relevo ni cuota fija | Rechazada |
| Adoptar salario semanal anunciado o reconstruir un bimestre ficticio | La oferta no acredita garantía, bruto/neto, descanso o percepciones reales; duplicaría el pago km o inventaría historia | Rechazada |
| Presupuesto prospectivo público separado de nómina real | Reutiliza reglas, Zod, calendarios UTC, componentes y consolidado existentes; hace explícitos calendario, elegibilidad, personal y límites | Implementado localmente |

No nueva tecnología, proveedor, infraestructura o integración. El núcleo diferencial continúa siendo el costo por recurso/ciclo, con una caja compartida y alternativas de vacío, no la reconstrucción de un sistema de nómina.

## Fuentes, vigencia e hipótesis

- [LFT oficial](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf), reforma 14 mayo 2026: páginas físicas 22, 23 y 454 extraídas completas, renderizadas e inspeccionadas el 2 oct. Calendario de descanso/artículos 69-74; transición de jornada: en 2026 todavía 48 horas semanales y 9 de tiempo extraordinario, no aplicar inmediatamente 40 horas ni considerar que un bloque de 10 horas de conducción pruebe cumplimiento laboral. Prestaciones/autotransporte de páginas 24-25/71-72 y reglas LSS reutilizadas del corte anterior; no nueva inspección LSS en este corte.
- Archivo LFT existente, intacto: `docs/research/sources/LFT_COVERAGE_REVIEW_20261001.pdf`; SHA256 `12f09393a1951a91c3f57f579bf611b034edf1a5f78cdbfb828e23ff3a9acbf7`.
- [Resolución CONASAMI publicada el 9 dic 2025](https://sidof.segob.gob.mx/notas/docFuente/5775534), vigente desde 1 ene 2026: fila 16, chofer de camión de carga en general; 370.90 MXN/día área general y 440.87 frontera norte, distintos. Lectura primaria actual, no HTML archivado. Sólo diagnóstico de medias; no certificación del mínimo diario ni garantía inventada.
- [Ley de Hacienda NL, artículo 157](https://www.hcnl.gob.mx/trabajo_legislativo/leyes/leyes/ley_de_hacienda_del_estado_de_nuevo_leon/): lector directo agotó tiempo una vez; índice oficial actual corroboró 3%, junto con expediente local de continuidad 2026. Propuesta 4% no se trata como promulgación. **NL es hipótesis de jurisdicción patronal**, no domicilio real heredado de la ruta, la oferta Querétaro o la administración. Sin declaración fiscal, presentación o contacto.
- Oferta pública Trayecto 2.10 MXN/km, cargado/vacío, y sus dos interpretaciones de descanso se reutilizan de `B2_MX_VARIABLE_DRIVER_PUBLIC_MODEL_2026-10-02.json`. Bruto/neto y paquete superior no confirmados; salario semanal publicado no se añade ni se usa para inferir capacidad.
- Reglas patronales/UMA/LSS/INFONAVIT/riesgo y fuentes ya revisadas se reutilizan de los expedientes MX existentes. UMA 117.31 desde febrero de 2026; sólo tramo CEAV 4.01 UMA en adelante, cap 25 UMA por persona. Riesgo clase V 7.58875% es sensibilidad de registro inicial, no prima real de una empresa existente. Perfil fuera del tramo soportado se rechaza.
- Política nueva fijada: `B2_MX_DRIVER_FORECAST_2026-10-02.json`, SHA256 `01e73bb21c19dbdd929d9cbdb35b6bf5ac3da45c3c6599fe0d8645128e5189c4`; consolidado pasa de 62 a 63 pins. No se actualizan los demás benchmarks históricos a 2026 por inferencia.

## Fórmulas conectadas y límites

1. Calendario 2026: 365 días, 52 domingos y siete feriados nacionales no solapados. Contraste prospectivo de seis días semanales y sin trabajo en feriados: 306 días viales, repartidos 294 principal + 12 relevo. Vacaciones primer aniversario 12 días; relevo de dos semanas no festivas/14 días de cobertura. Días electorales locales y fecha real de servicio pendientes.
2. Ciclos mensuales compatibles: mínimo entre km/capacidad MX y US y 24 días de disponibilidad de cada reloj conocido MX/US/caja. Los 24 días son disponibilidad del activo, **no días laborales de una persona**. Resultado condicional: red 7.831596415; retorno dedicado 4.446118473, este último limitado por km MX. Bobtail adicional y roster íntegro siguen incompletos; el relevo mantiene capacidad como hipótesis, no prueba de despacho.
3. Pool anual vial = pago bruto trabajo+descanso por ciclo × ciclos/mes × 12. Ingreso medio por día vial = pool/306. Partición 294/12: el relevo **ya participa en los km pagados**, no añadir otro salario km completo. Ingreso por feriados/vacaciones, prima vacacional y aguinaldo se provisiona aparte. Beneficios del relevo se prorratean por 14/365, incluida reserva por vacaciones al término del contrato, no otro paquete anual completo.
4. Base financiera principal = efectivo elegible anual medio/365; relevo = su efectivo elegible anual/14. **No son un bimestre LSS observado, SBC fiscal ni los últimos 30 días trabajados reales**. Se preserva el calculador variable/mixto real-declarado aparte. El ingreso estable usado para vacaciones/aguinaldo es convención de planificación, no equivalencia legal probada.
5. Cuotas individuales: principal 31 días del octubre de referencia; relevo 14 días de cobertura anual y gasto normalizado /12. No agrupar trabajadores antes del tope. Es una referencia de mes octubre + provisiones medias, no nómina mensual idéntica todo el año ni calendario efectivo de pago. Impuesto NL 3% sobre remuneraciones modeladas, no sobre SBC/cuotas; provisión no es impuesto declarado.
6. **CFU conocido**: cuota fija EM = 20.4% × UMA × días cubiertos, distribuida por ciclos compatibles. **CVU conocido**: pago por km + provisiones/cuotas ligadas a ingreso e impuesto. Sustituir `MX_DRIVER_PAY` una vez, no sumar SBC como gasto ni mantener el pago viejo. La conservación CFU+CVU coincide con el total de componentes, no convierte una base incompleta en íntegra.

## Readback local real de la proyección (sin ejecución de negocio)

Importes MXN/mes y USD/ciclo con FIX fechado 18.3688, sin nueva llamada FX. Son resultados del modelo público condicionado, no facturas, nómina o cotizaciones.

| Ciclo | 2.10/km interpreta descanso | Pago y componentes patronales conocidos MXN/mes | Cuota fija EM USD/ciclo | Pago y componentes ligados al ingreso USD/ciclo |
| --- | --- | ---: | ---: | ---: |
| Red/vacío esperado | Excluye | 35,108.71 | 5.35 | 238.70 |
| Red/vacío esperado | Incluye | 30,187.05 | 5.35 | 204.49 |
| Dedicado, misma caja retorna | Excluye | 36,798.27 | 9.43 | 441.15 |
| Dedicado, misma caja retorna | Incluye | 31,635.32 | 9.43 | 377.93 |

Las dos composiciones siguientes son **capital de contado**, distintas por hipótesis IVA de caja, no extremos estadísticos. Financiación permanece pendiente de conexión íntegra.

| Ciclo/descanso | Capital | CFU componentes conocidos USD | CVU componentes conocidos USD | Suma parcial USD, NO costo íntegro |
| --- | --- | ---: | ---: | ---: |
| Red/excluye | Neto + IVA | 775.79 | 3,208.64 | 3,984.42 |
| Red/excluye | Bruto incluye IVA | 797.36 | 3,208.64 | 4,005.99 |
| Red/incluye | Neto + IVA | 775.79 | 3,174.42 | 3,950.21 |
| Red/incluye | Bruto incluye IVA | 797.36 | 3,174.42 | 3,971.78 |
| Dedicado/excluye | Neto + IVA | 1,430.69 | 6,040.91 | 7,471.60 |
| Dedicado/excluye | Bruto incluye IVA | 1,468.69 | 6,040.91 | 7,509.60 |
| Dedicado/incluye | Neto + IVA | 1,430.69 | 5,977.69 | 7,408.38 |
| Dedicado/incluye | Bruto incluye IVA | 1,468.69 | 5,977.69 | 7,446.38 |

No sumar filas. Road/bridge conserva faltantes, reversa como hipótesis y cobertura anterior; `allInputsShareKnownCycleScope=true` sólo acredita identidad del ámbito conocido, no todas las distancias/restricciones físicas. Compensación US reutilizada conserva su alcance ATRI; no añadir FICA/prestaciones que podrían ya estar incluidas.

## Verificación y recuperación

- **310 pruebas PASS, seis archivos, última ejecución después de los últimos cambios de código**: forecast (28), MX variable (21), consolidado (222), variables piloto (13), ciclo físico (9), carretera/frontera (17). Conservación por trabajador/recurso, cap, calendarios, rechazo de perfiles inconsistentes, ocho alternativas únicas y ausencia de doble cargo; datos locales/referencias y pruebas sintéticas, no autenticación/persistencia SaaS.
- TSC estricto de helpers/consolidado/tests: **PASS, exit0** después de la última modificación. Un intento de comando omitió `--strict` y produjo inferencias incompatibles Zod en archivos existentes; diagnosticado y corregido el comando, sin alterar código ajeno. No se omite ese intento como consumo cero.
- Readback real: 63 pins, cuatro proyecciones de operador y ocho composiciones, seis outputs finales `null`; todos los flags DB/Auth/users/infra/deploy/business/applicationAI false. `git diff --check` **PASS, exit0** (avisos CRLF previos, no errores); no build web innecesario, sin cambio UI ni wireframe nuevo en este corte.
- Git: worktree físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Sin commit, push, ramas, previews, producción o cambios de datos; cambios ajenos preservados.
- Rollback **selectivo, no reset/checkout global**: quitar sólo import/pin/cálculos/propiedades forecast y payroll-components añadidos al consolidado; expectativa de pins 63→62; retirar los dos nuevos archivos helper/test y JSON/MD de este corte y sus dos párrafos de estado. En helper variable retirar únicamente primitive compartido y restaurar el bloque de cuotas equivalente previo. Snapshots previos: helper variable `172310808f9fe6a9189565e92a1f88da5361f07de5cbb2a7909db822ea2f9c23`, consolidado `b60fa4fdbb5384b08272ce8b793df013cc791f765f0d22e2d8d340446f2cd8b2`, test consolidado `2345e46ef0f997dd4220db3802d3cd0fd5d1f157bb4c59821ff1273c4080c71f`. Hashes son evidencia de identidad, no un backup recuperable por sí solos; conservar los bloques previos hasta revisar rollback. Test MX variable anterior no modificado.
- Identidad posterior de código: helper variable `0857d5c6ba0313457306c6ef4ee07a928252b7e6a344fdcfd12d4121ec2261ad`, forecast `dc65a4cf150f38a52021910e0e64c029828b62dd7f86ae9892b0d33140cf515d`, consolidado `d9065c125551d8bdf015fa7bc6ceec912ca04050f5a9971de0659032de91c55c`, test forecast `6d015dfea4f0bc6d7f0cbe0da536b3b32a91548a9aadd03dc507611290cb0d09`, test consolidado `cbc494297c1a48ca9f2fb134ee8e2d481d870787186e52ca74db1361d013086e`. Revalidar diferencias si otro corte los cambia; no aplicar instrucciones de rollback a ciegas.

## Ejecutor, presupuesto y consumo

- Máximo **240 horas autorizado**, no obligación de consumir, ejecución 24/7, programación automática ni aprobación de cargos. Corte acotado 18:41:52–19:26:52 UTC, 45 min incluidos investigación/implementación, reserva final de 10 min para validación. Cero reintentos automáticos; una reparación por diagnóstico, reevaluar ante dos fallos distintos o expansión material.
- **Codex gpt-6.1-sol / high**, elección humana existente 2 oct 16:46:22 UTC conservada para investigación/integración/verificación; metadata runtime no observable, ningún cambio de selector por CLI. Único escritor/integrador/verificador. Claude se consideró como alternativa con traspaso de contexto, no invocado; Fable no justificado por fallo de razonamiento. Sin agentes ni llamadas auxiliares.
- Skill `claude-review`: mismo responsable/elección, contrato y lease explícitos; no otro consentimiento trivial. Skill `pdf`: comprobación normativa completa y visual, sin creación/edición PDF ni coste de procesamiento externo.
- Cuota Codex: lectura soportada previa aproximadamente 18:20 UTC del 2 oct, **no observación fresca de este corte**: semanal 100% utilizado, reposición 6 oct 13:08 México; cinco horas no devuelta, `ordinaryUsageAllowed=false`. Host siguió operando; no inferir saldo incluido ni costo cero. No resets, créditos, pagos o rutas API activados.
- Claude Max x5/semana/cinco horas/Fable/uso extra: desconocidos y no usados. Reserva cuantitativa, tokens, caché, razonamiento, cuota/cargo atribuibles y ahorro relativo no observables; límite por alcance/tiempo/reintentos, no porcentaje inventado. Valores cero del contrato de reserva significan no cuantificado.
- Contrato: `D:/andre/apps/codex-home/integrations/claude-review/data/handoffs/freight-cost-model/b2-closure-240h-20261002/mx-driver-forecast.json`, lease `f8ecd70ea8e942399183e90025ea3d7f`; receipt de cierre libera el escritor. `paused` en el kit sólo es checkpoint de ese contrato, no solicitud del usuario de pausar el objetivo B2.

## Próximo resultado pendiente, no otro sprint de validadores

Cerrar jornada/espera y dotación compatible del operador, costo territorial/custodia/compañía, DEF/ralentí/bobtail adicional y carretera/frontera completos; incorporar financiado sobre idéntica exposición hasta un **costo D2D íntegro reproducible**. No convertir faltantes en cero ni en un precio con margen. Después B3: seleccionar base → calcular → guardar → reabrir, con wireframes MARKSMAN y validación real de permisos/persistencia.

No se requiere decisión menor del usuario para continuar el alcance autorizado. Si aparece gasto, autoridad externa o cambio metodológico material adicional, solicitar autorización puntual.
