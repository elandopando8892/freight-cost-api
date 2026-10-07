# B2 - operador mexicano variable y presupuesto autorizado

## Resultado de este corte

Antes: el piloto usaba `MX_DRIVER_PAY = 2.10 MXN x km` como componente publicitario, no costo patronal. No distinguía las interpretaciones de descanso semanal. El helper patronal existente era para remuneración fija; trasplantar su factor al operador variable sería incorrecto.

Ahora: dos interpretaciones del descanso conectadas a cada escenario de vacío (cuatro alternativas, ninguna seleccionada). Cada alternativa **reemplaza** la fila original una sola vez; conserva los escenarios previos. Cálculo local de SBC variable/mixto por bimestre concluido, cuotas y prestaciones separado, probado con datos sintéticos; **todavía no recibe una proyección completa del piloto**. No se afirma nómina calibrada, base publicada, cotización operativa ni B2 terminado.

Falta: declarar una proyección pública coherente de días efectivamente trabajados, percepciones/salario devengado, vacaciones y prestaciones para este recurso, para conectar los calculadores patronales. No se exige documentación privada XBF: puede ser un modelo prospectivo explícito, no una observación. Quedan jurisdicción de impuesto sobre nómina, condiciones del pago, espera/alimentos/hospedaje, aproximaciones bobtail y prestaciones adicionales, además de los otros pendientes B2.

## Investigación y decisión

Comparación previa proporcional:

| Camino | Ajuste | Decisión |
| --- | --- | --- |
| Helper de nómina fija ya existente | Reutilizable para administración; su factor no corresponde automáticamente al pago variable/km | Conservar sin alterarlo |
| Convenio IMSS-CANACAR | Convenio especializado; evidencia pública no verifica todas sus condiciones actuales | No adoptar ni solicitar acceso privado |
| Régimen variable/mixto LSS y reglas de autotransporte LFT | Reutiliza Zod, calendarios UTC y el consolidado; expresa bases y condiciones por componente | Implementado sin nueva tecnología |

La [oferta directa de Trayecto](https://careers.trayecto.com/operador-sencillo-caja-seca-xI1ywOf9L4-o/) volvió a consultarse el 2 oct 2026: 2.10 cargado/vacío y prestaciones superiores, pero no bruto/neto ni inclusión de descanso. Cabecera semanal 5,500-8,000 y descripción aproximada 6,000-8,000 no se convierten en productividad ni se suman al pago por km. HTML no archivado; evidencia del lector directo y política JSON fijada, no contacto con el empleador.

LFT actual verificada en URL oficial: reforma 14 mayo 2026. Páginas físicas 24-25 y 71-72 completas extraídas/renderizadas/inspeccionadas, artículos 76/79/80/87/89/257/258/259/263.I. Descanso publicado **16.66%**, no 1/6 redondeado. Vacaciones variables referidas a los últimos 30 días efectivamente trabajados; aguinaldo recibe su propia base declarada, sin presumir equivalencia legal. Vacaciones pagadas no se sustituyen por compensación. El aumento por retraso del artículo 257 tiene el supuesto de salario por viaje; no se aplica automáticamente al pago por km.

LSS actual verificada en URL oficial: reforma 15 enero 2026. Páginas físicas 12/153 completas extraídas/renderizadas/inspeccionadas. Variable: ingresos elegibles/días de salario devengado en bimestre anterior; mixto: agregar elementos fijos integrados declarados. No confundir estos días con los 30 trabajados de vacaciones, ni dividir todo por 30. Cuotas actuales reutilizan tasas del benchmark ya revisado; CEAV 2026 7.513% sólo para 4.01 UMA en adelante, límite 25 UMA. Las provisiones anuales no se convierten automáticamente en ingreso recibido del bimestre. Sólo Mar-Dic 2026, mes cubierto completo/sin ausencias; no nómina fiscal universal.

Los archivos normativos conservados no se editaron. Política: `B2_MX_VARIABLE_DRIVER_PUBLIC_MODEL_2026-10-02.json`, SHA256 `23f5a5d777d47987fe0976d99e4f958c0bb5ad5484ff6213a58dee16bc89e945`. Consolidado ahora verifica 62 políticas/fuentes y estos archivos normativos por hash. No actualizar automáticamente datos históricos a la fecha actual.

## Readback real local (no ejecución operativa)

| Ciclo | Interpretación de 2.10/km | Pago por trabajo+descanso MXN | Subtotal variable conocido USD, NO costo íntegro |
| --- | --- | ---: | ---: |
| Red/vacío esperado | Excluye descanso | 2,981.98 | 2,851.54 |
| Red/vacío esperado | Incluye descanso | 2,556.13 | 2,828.36 |
| Retorno dedicado misma caja | Excluye descanso | 5,510.11 | 5,333.06 |
| Retorno dedicado misma caja | Incluye descanso | 4,723.22 | 5,290.22 |

FIX fechado 18.3688 MXN/USD reutilizado; no nuevo FX ni servicio facturable. Importes condicionales sobre kilómetros conocidos anteriores: aproximaciones adicionales sin cerrar, no distancias completas certificadas. Totales integrales CFU/CVU/costo/precio continúan `null`; impuesto/riesgo desconocido/beneficios adicionales no se declaran cero. Beneficios y SBC del caso siguen `null`, no usar los datos sintéticos de prueba como benchmark.

## Ejecutor, tiempo y consumo

- Usuario: `autorizo 240 horas`. Máximo B2 autorizado; reemplaza bloque agotado de 60 min, no obligación de consumir, servicio 24/7, automatización programada ni autorización de gasto adicional.
- Elección existente: Codex `gpt-6.1-sol` / `high`, confirmación humana del 2 oct 16:46:22 UTC. Este corte conserva esa elección, no la restampa como observación automática del selector. Principal no cambiado desde CLI/JSON; metadata runtime no observable.
- Codex único escritor/integrador/verificador. Claude Sonnet considerado como alternativa con traspaso, no invocado; Fable no justificado por fallo de razonamiento. Sin agentes/delegación. Skill `claude-review`: nuevo contrato/corte y lease, no segundo consentimiento ni instalación. Skill `pdf`: lectura completa e inspección visual, no edición de PDFs.
- Primer corte retomado: 18:18:31 UTC, 30 min máximo, 10 min reservados para validación; 240 h no se reinician por cada continuación. Sin reintentos automáticos; una reparación diagnosticada, reevaluar ante dos fallos distintos o ampliación de autoridad.
- Lectura automática soportada Codex del 2 oct aproximadamente 18:20 UTC: ventana semanal 100% utilizado, reposición 6 oct 13:08 México; cinco horas no devuelta, `ordinaryUsageAllowed=false`. Esto no acredita saldo de inferencia de este corte ni autoriza comprar/habilitar créditos, pagos, resets o ruta API. El host siguió operando; no inferir costo cero. Claude Max/semana/5h/Fable/ruta extra desconocidos y no usados. Reservas porcentuales no cuantificables; campos 0 del contrato significan desconocido, no capacidad nula/libre.
- Tokens, caché, razonamiento y cargo/cuota atribuibles a esta actividad no observables. Tiempo medido del corte no es estimación de ahorro ni cargo. No nuevas consultas auxiliares/modelos ni servicios facturables.
- Contrato kit: `D:/andre/apps/codex-home/integrations/claude-review/data/handoffs/freight-cost-model/b2-closure-240h-20261002/mx-variable-driver.json`; lease `e4c239c432fd4d3b9f048a9848c84c1e`, se libera al cierre con receipt. Lease cooperante, no garantía de escritor en otros dispositivos.

## Validación y rollback

- Última ejecución tras cambios: **255 pruebas PASS / 3 archivos**: variable MX (21), consolidado (221), variables piloto (13). Sin mocks externos ni autenticación; pruebas económicas locales/sintéticas y lectura real de archivos, no aceptación de un flujo SaaS.
- TSC estricto de helper/consolidado/tests: **PASS, exit0**, última ejecución después de la modificación final de código/pruebas/política. No build web reiterado ni UI modificada. No wireframe nuevo requerido en este corte sin UI; B3 sí requiere wireframes MARKSMAN y recorrido seleccionar-calcular-guardar-reabrir.
- Readback local confirma 62 pins, cuatro alternativas, seis outputs null y todos los flags de efectos externos false. `git diff --check` PASS (advertencias CRLF de archivos previos no son fallos).
- Git verificado: rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, worktree físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`. Trabajo ajeno conservado, sin commit/push/publicación/producción ni cambios DB/Auth/users/infra.
- Rollback selectivo: quitar sólo import/pin/bucle hash/propiedad `supportingMxVariableDriver` añadidos al consolidado; regresar expectativa de pins 62 a 61; retirar los nuevos helper/test/política/checkpoint y los dos párrafos de estado de este corte. **No git reset/checkout global**: el consolidado/tests ya tenían cambios previos ajenos. Snapshot pre-corte consolidado `dc5cb3972ad3bfcb01de32e67318729d6ed8edb1e53cb030d6db03f97f083599`, test consolidado `3da472177db2f4087a57852ffc89529ee4cbd1fb1a8773323397a187d377f7f0`.

Siguiente resultado B2: proyección pública de nómina por recurso y calendario que conecte estas fórmulas al piloto; completar seguros/peajes/compañía/DEF/ralentí y capacidad física compatibles. No iniciar otro sprint de pantallas ni declarar subtotal como objetivo alcanzado. No se necesita decisión menor del usuario para continuar el alcance ya autorizado.
