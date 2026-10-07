# B2 · viáticos incluidos y gastos pendientes, sin doble cobro

Checkpoint local 2 octubre 2026, 20:27 UTC. B2 sigue activo: este corte cierra una interpretación de cobertura, no el costo íntegro del piloto.

## Antes y ahora

El presupuesto ya incluía remuneración US de ATRI por milla, pero no exponía que su definición de prestaciones incluye el per diem reportado. Ahora la fuente, el componente de operador y los dos ciclos publican esa inclusión no desglosada. No se agrega una segunda partida diaria. Tampoco se afirma que todos los transportistas paguen viáticos, que el importe individual sea conocido o que cubra todos los gastos del viaje.

MX permanece distinto: la oferta pública utilizada no publica una tarifa de viáticos ni una frecuencia para sus vales. No convertir el importe de vales en costo diario o mensual por inferencia. El tiempo de espera de los activos tampoco demuestra una tarifa adicional de remuneración del operador. Los importes no determinados siguen null, nunca cero.

## Benchmark, alcance y decisión

Se reutilizó el cálculo existente, su definición de remuneración y sus fuentes fijadas. Alternativas: sumar una asignación fiscal diaria (rechazada: posible duplicación y no prueba de gasto); trasladar una vacante de otra modalidad/ubicación o unidad temporal ambigua (rechazada); precisar las inclusiones del mismo benchmark sin alterar importes (implementada). Sin otro motor, librería, proveedor, servicio, infraestructura o pantalla. No corresponde nuevo wireframe porque no se modifica UI; B3 mantiene su requisito de wireframes MARKSMAN.

- Fuente primaria US: [ATRI Operational Costs 2025](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf), operaciones 2024; pregunta 5, nota de prestaciones, página impresa 58/física 61. Incluye aportes médicos del empleador, per diem y otras prestaciones financieras ordinarias; excluye incentivos/bonos. Texto completo de página y render inspeccionados. PDF conservado `sources/ATRI_OPSCOST_2025_REVIEW_20261001.pdf`, SHA256 `581b91b68a76f232102a63f543eff92bb59c9478556b164d84d2be85118902f8`, revalidado en este corte.
- Fuente primaria MX releída: [Trayecto, operador sencillo caja seca](https://careers.trayecto.com/operador-sencillo-caja-seca-xI1ywOf9L4-o/), descripción líneas 66–73. Mantiene 2.10 MXN/km cargado/vacío y prestaciones; no prueba viático diario, sueldo bruto/neto, frecuencia de vales ni costo patronal completo. La etiqueta relativa ahora dice un mes; el texto del corte original de 1 octubre se conserva como histórico. Sin postular candidatos ni contactar al empleador.
- Investigación adicional no adoptada: anuncios agregados con 300 «cuando aplique» sin unidad temporal y 320 diarios en full no equiparable; anuncios replicados no son fuentes independientes. No incorporar datos privados de nómina, límites fiscales como gasto ni una cantidad artificial para completar la suma.

El JSON de evidencia original incorpora un subregistro fechado `travelExpenseReview`; no cambia silenciosamente el año de operación, fecha original ni benchmark. Nuevo SHA `d97fcef52ff5824eb9c1b680613f879e4f19c2fbee6b42088225033118fbf9a8`. El consolidado actualiza ese pin; mantiene 65 fuentes/políticas, sin generar otro módulo de investigación.

## Resultado comprobado

Se conservan nueve partidas variables por ciclo. La remuneración US conocida es 626.0807446693 USD/red y 1156.872 USD/dedicado; el per diem no tiene importe desglosado y no se suma de nuevo. Subtotales variables previos 2828.3553272185 y 5290.2232834594 USD, sin cambio. No son CVU íntegros.

Readback del contraste ordinario conserva, para caja neto+IVA y km excluyendo descanso, sumas parciales contado 4010.8507038507 USD/red y 7862.2175562162 USD/dedicado. La primera alternativa financiada conserva 4120.5981428861 USD/red. No se seleccionan esas alternativas, no son tarifas ni límites inferiores. Los seis outputs finales siguen null.

## Verificación y límites

- 319 pruebas PASS en seis archivos: driver22, variables piloto18, componentes variables20, consolidado224, jornada14, financiación21. Ejecución posterior a la última modificación de código/pin; duración44.87s. Diez pruebas nuevas de inclusión/rechazo; las demás son regresión reutilizada.
- TSC estricto PASS sobre código y pruebas modificadas. `git diff --check` PASS; advertencias CRLF preexistentes sin fallo. Readback confirma importes, 65 pins y outputs finales null.
- Rechazo probado de viático adicional sin evidencia, cobertura universal/completa inventada, frecuencia de vales supuesta, importe desconocido vuelto cero y costo de espera del activo tratado como pago del operador. Fuente nueva requiere definición de inclusión explícita.
- Pruebas locales deterministas, no nómina real, cotización, validación autenticada, persistencia, UI ni despliegue. No nuevas llamadas Google/SAKBE u otras APIs facturables. No cambios a producción, Auth, bases de datos, usuarios, infraestructura o datos de negocio.

## Responsable, modelo y presupuesto

Codex único investigador, escritor, integrador y verificador local D:. Elección humana histórica `gpt-6.1-sol/high`, 16:46:22 UTC, conservada; versión/esfuerzo exactos del runtime actual no observables ni acreditados como iguales por este corte. No selector modificado, asignación o llamada a Claude/Fable, ni agentes. Continuar el contexto ya elegido evita un segundo implementador y transferencia innecesaria; no se afirma ahorro cuantificado.

Skill `claude-review` aplicada al registro de elección y exclusión cooperativa de escritor, no a una consulta Claude. Kit nuevo fijado `releases/chat-20261002T201550Z/app`, job `driver-travel-coverage`, lease `4d8781c7711d45db8f3581229fe16467`. Contrato explícitamente distingue elección histórica de runtime desconocido. Si el cierre de control exige identidad exacta, registrar esa limitación como bloqueo de acreditación del modelo, no inventar observación ni declarar B2 bloqueado/completo por ella.

Investigación desde aproximadamente20:09; implementación desde20:22; validación terminada20:27. Estimación20–30min, sin deadline por defecto ni reintentos de proveedor; máximo240h autorizado no se vuelve una obligación de consumo ni un permiso de gasto. Cuotas actuales Codex5h/semana y Claude5h/semana/Fable desconocidas; ninguna captura histórica restampada. Tokens atribuibles, caché, razonamiento, cargos y cuota consumida desconocidos, no cero. Una búsqueda local inicial usó un nombre de archivo inexistente; corregida a la ruta observada, no fallo de modelo/proveedor. Sin fallos en la ejecución de pruebas o TSC de este corte.

## Qué falta y siguiente trabajo

Faltan importes compatibles de gastos MX/espera, cobertura territorial de caja/cruce, aproximaciones bobtail/casetas y restantes costos monetarios para cerrar la estimación B2 completa contado/financiado. Este hallazgo elimina la duplicación potencial US, no resuelve aquellos valores ni inicia B3. No solicitar historia privada XBF como sustituto de investigación pública. Próxima prioridad: cobertura territorial y partidas monetarias del mismo piloto, conservando separado qué está incluido, qué está valorado y qué sigue sin evidencia.

## Recuperación selectiva

Raíz física D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, revalidado. Worktree sucio previo preservado. Sin commit/branch/worktree/PR/push/deploy.

Rollback: retirar exclusivamente `travelExpenseReview` del JSON y su schema, `DriverTravelExpenseCoverageSchema`/campo nuevo y su propagación a piloto; restaurar id de fuente al schema previo y pin `52f32aeb6c2e7025298ecb7627949d681b4b1ad2c4b1aca49217d773e909b38c`; retirar solamente las diez pruebas y dos entradas de estado nuevas. No restaurar archivos completos ni tocar cambios ajenos. Mantener este documento como evidencia histórica. El kit conserva hashes previos/finales de los nueve archivos declarados. PDF fuente conservado; PNG temporal regenerable eliminado tras revisión.

Verificación de recuperación20:29UTC: reconstrucción sólo en memoria del JSON original y del pin en consolidado coincide con ambos SHA previos (consolidado `c188a31c88eb69d9259e546338a336d3f295747ff4669cf7781e552321160e23`). Sin archivos restaurados ni borrado de datos. No afirma que el resto de hunks haya sido revertido/probado como rollback completo.
