# B2 — integración local de peajes y cruces

## Elección y presupuesto, antes de implementar

2026-10-02 16:02:14 UTC (10:02:14 México). El usuario eligió explícitamente «codex». Codex es el único escritor, integrador y verificador. Recomendación: GPT-6.1-Sol, esfuerzo alto, por continuidad del contexto y contratos económicos verificables. El modelo/esfuerzo efectivo del principal no es observable ni se cambió el selector; no se registra una selección efectiva ficticia en el kit. Claude es candidato válido pero no elegido: una sesión nueva exigiría contexto y evidencia de cuota/plan que actualmente no están disponibles. No hubo invocación auxiliar ni delegación.

Presupuesto: 15 minutos, hasta 16:17:14 UTC; una reparación por fallo diagnosticado, últimos cinco minutos reservados a correcciones y cierre. Tokens, caché, costo real y equivalencia de cuota: desconocidos; no se afirma ahorro cuantificado. Fuente automática Codex a las 16:02:14 UTC: ventana semanal 100% utilizada, reposición 2026-10-06 13:08 México; ventana de cinco horas no disponible; continuación con créditos existentes, sin compras ni activaciones. Claude Max x5, cinco horas, semanal, Fable, inclusión, uso extra OFF y reposición: desconocidos, sin ejecución.

## Benchmark y alcance

Se reutiliza investigación fechada y sus archivos/hash, no se reinventa un proveedor: tarifas oficiales SICT y concesionarios para los movimientos mexicanos, ordenanza archivada de Laredo para movimientos hacia México. Sumar el total original SAKBE sin conciliación duplicaría cobertura; prorratear C5 por kilómetros bobtail no demuestra una tarifa C3; añadir un precio comercial de cruce completo podría duplicar servicios. La opción mínima es seleccionar una alternativa documental por movimiento y mantener explícitos los faltantes.

Resultado buscado de este corte: proyección de componentes, no costo D2D completo ni tarifa negociada. Flujo: documentos sellados → selección por cobertura → cruces físicos MX con/sin caja → conversión FX una vez → subtotal parcial por alternativa. Sin UI nueva, datos maestros, Auth, bases de datos, despliegue, proveedor activado ni llamadas de negocio.

## Qué funciona ahora

Antes los peajes/cruces estaban en anexos sin participar en la composición prospectiva. Ahora `supportingPilotRoadBorderEconomics` integra 13 selecciones únicas por cobertura con los dos escenarios del piloto, verificando los JSON, archivos originales, solicitud C5 y vínculo al mismo caso/detalle. Hay 59 documentos sellados en el consolidado. La cifra original SAKBE de 4,770 MXN se conserva. La selección prospectiva suma 4,751 MXN de componentes conocidos de ida: Matehuala 125 frente a 144 del proveedor. La Carbonera no se vuelve cero ni se agrega otra vez el tramo completo que solapa Los Chorros.

| Escenario de referencia, no seleccionado | Componentes carreteros MX conocidos | Puentes conocidos, USD | Sumatoria parcial A / B, USD |
| --- | ---: | ---: | ---: |
| Red con proxy de vacío | 4,751 MXN | 22.08937982 | 6,821.98456582 / 6,843.55743437 |
| Retorno vacío dedicado, misma caja | 9,502 MXN | 49.37798876 | 12,715.23387364 / 12,753.23331090 |

Estas sumatorias NO son costo total, mínimo, CVU, CFU, precio de compra/venta, ni cotización. Mantienen las hipótesis anteriores del pool administrativo, capacidad, cohortes y fiscalidad; aquí no se calibran ni se aprueban. La alternativa de patio en EE. UU. tampoco selecciona una instalación real.

Cruces del tractor MX: ida con caja C5 (144 MXN), regreso bobtail C3 (14.25 USD); el retorno dedicado añade ida bobtail C3 (65 MXN) y regreso con caja C5 (23.75 USD). MXN se convierte una vez con FIX determinación 2026-10-01, 18.3688 MXN/USD; las tarifas USD no se reconvierten. La empresa binacional conserva dos tractores propios y una sola caja; no se añade un tercer tractor ni un segundo cargo de caja/admin.

La aplicación de las tarifas norte SICT es una transferencia hipotética: dirección, fecha efectiva e impuestos no están acreditados. La tarifa sur usa la ordenanza archivada de Laredo, antes del ajuste anunciado 2027-01-01; no demuestra ausencia de enmiendas posteriores. Los movimientos C5 de vuelta repiten los de ida por hipótesis, no por ruta inversa observada. El helper rechaza usar esta política fechada como escenario de 2027.

## Validación local, 2026-10-02 16:12:03 UTC

- Primera ejecución: 296 pruebas en seis archivos, PASS. Después de ligar también solicitud/caso/detalle y añadir su prueba de alteración: **324 pruebas en siete archivos, PASS**, 15.85 segundos; incluye 17 pruebas nuevas de peajes/cruce y 210 del consolidado.
- TSC estricto para helper, consolidado y nueva prueba: PASS después de la última modificación de código (7.87 segundos).
- Readback final ejecutó el consolidado, confirmó 59 pins, importes de la tabla y las seis salidas finales `null`; `priorCycleRecalculationRequired=true` en ambos escenarios. Repetición determinista y fuentes sin modificación comprobadas en pruebas.
- Casos negativos: duplicados, cobertura solapada, movimientos mal ordenados, importes negativos/NaN, fuente C3 ajena, período futuro, selección silenciosa de cotización, JSON/archivos PDF y solicitud alterados.
- Un intento de readback falló por un paréntesis extra en el comando inline, antes de ejecutar el cálculo. Una reparación del comando y readback PASS; no se repitieron llamadas a proveedores. Advertencia Vite CJS existente, sin fallo de pruebas.

Son pruebas locales con evidencia pública archivada y escenarios hipotéticos; no hubo recorrido SaaS autenticado, persistencia nueva, publicación ni aceptación operacional. No se hizo un build de frontend porque no se cambió UI. Se usó `engineering:testing-strategy` para cubrir contratos económicos, integridad e idempotencia; `claude-review` para delimitar la elección, no ejecutar auxiliares sin evidencia ni registrar un modelo efectivo ficticio.

## Qué falta y siguiente entrega B2

Recomponer exposición física para incluir viajes bobtail fronterizos, tiempo de cruce/relevo y espera: distancia/tiempo/combustible/conductor adicionales siguen `null`, no cero. Después resolver La Carbonera, cobertura adicional Jorobas, itinerario US/peajes, servicios incrementales de intercambio, mantenimiento bobtail, ralentí/DEF/cargas patronales y paquetes económicos pendientes; completar caja financiada y consistencia fiscal/temporal antes del costo D2D íntegro. La recomposición debe mostrar el efecto por recurso y volver a calcular capacidad, CFU/CVU sin duplicar caja/admin. No se requiere una decisión adicional para este corte ya elegido; una nueva asignación/modelo o expansión externa sí se consulta.

B2 permanece abierto. B3 es después: flujo SaaS con wireframes MARKSMAN, selección/cálculo/guardado/reapertura del costo completo, sin presentar esta proyección como base calibrada. No añadir otro sprint genérico por cada prueba.

## Evidencia y rollback selectivo

Workspace físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, revalidados. Se conserva todo cambio ajeno; no commit/reset/rebase. El checkpoint anterior de las 15:45 UTC permanece histórico.

Archivos de este corte: política JSON y helper preparados antes del checkpoint; ahora integrados mediante una importación, tres pins, verificaciones de archivos/vínculos y un campo de resultado en el consolidado; nueva prueba y esta ficha, entradas iniciales en los dos tableros. Rollback: retirar únicamente esas adiciones y los nuevos archivos de este corte, después de comparar el estado actual. **No restaurar el consolidado completo ni los tableros completos**, que contienen trabajo previo. No hay rollback externo porque no se modificó Auth/DB/Neon/usuarios/infra/producción ni se desplegó.

Fuentes originales y matices: `B2_MX_TOLL_FOLLOWUP_2026-09-30.json`, `B2_BINATIONAL_BORDER_2026-09-30.json`, `B2_PILOT_ROAD_BORDER_SCENARIOS_2026-10-02.json`, solicitud/vínculo/detalle SAKBE y archivos originales con hashes. Revisión pública anterior reutilizada (2026-10-02), no anunciada como nueva investigación ni certificación de vigencia actual.
