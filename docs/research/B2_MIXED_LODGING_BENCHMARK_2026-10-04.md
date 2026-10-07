# B2 · Alojamiento y pensión: benchmark de inputs

**Actualización posterior del mismo día:** la integración a `prepare-b2-closeout.ts` descrita abajo fue retirada selectivamente al detectar deriva del productor/snapshot histórico en la regresión ampliada. No se regeneró el snapshot ni se descartaron fuentes. El benchmark vigente y las cantidades derivadas se conectan únicamente al reporte económico de septiembre; cierre histórico vuelve a83 pins. Ver [conciliación y reparación](B2_LODGING_CYCLE_RECONCILIATION_2026-10-04.md). La evidencia de ejecuciones de este documento corresponde al corte anterior, no certifica el estado posterior a esta corrección.

## Objetivo y comparación previa

Completar evidencia pública del costo variable de alojamiento mixto MX/US confirmado por el usuario, sin inventar mezcla, noches, impuestos o disponibilidad. Separar habitación del operador y estacionamiento del conjunto; no asumir que uno incluye al otro.

| Enfoque | Ajuste / costo / límites | Decisión |
| --- | --- | --- |
| Publicaciones del hotel y operador/marketplace de pensiones | Unidad y precio trazables; sin compra/API pagada; impuestos, disponibilidad y vigencia pueden faltar | Fuente candidata preferida |
| GSA / viáticos oficiales | Referencia histórica fechada y gratuita, pero techo de reembolso federal, no costo observado del carrier | Sólo contraste, nunca precio automático |
| Promedio de blogs/OTA o cifra genérica | Puede mezclar habitaciones, parking, impuestos, fechas y vehículos; no ofrece representatividad demostrada | No adoptar |

Se inspeccionaron `b2-operating-profile.ts`, `reference-pilot-trip-supplements.ts`, `reference-us-driver-planning.ts`, el compositor público y `prepare-b2-closeout.ts`. El perfil humano ya exige ambos países y mantiene mezcla/noches null. El adapter ya abre el remanente US sin borrar salarios/M&IE. No reconstruir esa regla ni sumar otros USD80. La CLI y el register JSON existentes son suficientes: no nueva arquitectura, paquete, servicio, datos maestros ni UI. Las referencias de stack del 3 de octubre se reutilizan para esta decisión; no se cambia el stack.

## Evidencia consultada el 4 de octubre de 2026

| Input | Publicación observada | Alcance / aplicación |
| --- | --- | --- |
| Pensión MX | 260 MXN por 24 horas | Un tracto y remolque o remolque >9 m; no 260 por cada activo. Precio actual, impuestos y septiembre no acreditados. [Operador KM40.5](https://pensiondetrailers40-5.com/) |
| Hotel MX | Tarifa anunciada desde 94 USD | Real Inn Nuevo Laredo. No convertir anuncio inicial en tarifa final por noche, oferta histórica, hotel económico representativo ni parking de caja 53′ incluido. [Hotel](https://www.grupocaminoreal.com/real-inn-nuevo-laredo) |
| Hotel sobre corredor MX | Sin importe publicado en página consultada | Hotel San Pedro Express, Federal57 km108 Matehuala–Saltillo. Publica estacionamiento privado, no inclusión de tractor+caja/importe. [Hotel](https://hotelsanpedroexpress.com/hotel/) |
| Parking US, Fort Smith | 10 USD por día publicado | 5103 Towson Ave; tarifa de lista, no factura/reserva; unidad de cobro diaria no demostrada como bloque móvil24h. [Marketplace](https://truckparkingclub.com/us/arkansas/fort-smith) |
| Parking US, Fort Smith | 12 USD por día publicado | 1600 N4thSt; mismo límite. [Marketplace](https://truckparkingclub.com/us/arkansas/fort-smith) |
| Parking US, Fort Smith | 12.50 USD por día publicado | 1400 S6thSt; mismo límite. Tres listados, no muestra aleatoria ni promedio del mercado. [Marketplace](https://truckparkingclub.com/us/arkansas/fort-smith) |
| Hospedaje US oficial | Estándar CONUS110 USD | FY2026, 1oct2025–30sep2026: techo federal sin impuestos, no tarifa comercial de hotel ni lookup confirmado del ZIP72916. [GSA FTR26-01](https://www.gsa.gov/policy-regulations/regulations/federal-travel-regulation/ftr-and-related-files/gsa-per-diem-bulletin-ftr-2601) |

Captura: lectura de texto público, no originales HTML/PDF archivados ni screenshots. JSON local fija observaciones resumidas, no autentica el sitio ni congela inventario. Algunas fichas individuales de Truck Parking Club devolvieron texto vacío; el listado por ciudad sí mostró precios. Una ficha agregada en búsqueda reportó15USD en Rogers Ave, pero su lectura directa no confirmó el detalle: no se incorporó. La lista actual cambió precio/inventario de un sitio VanBuren respecto al índice de búsqueda; se conservaron sólo tres filas FortSmith de la lectura actual, sin trasladar disponibilidad ni usar VanBuren.

Se descartó Hotel ElTorito: está en Mexicali, fuera del caso y de este corredor; su cifra no calibra la habitación MX. No se reservaron cuartos/espacios, consultaron cuentas ni solicitaron cotizaciones a terceros. Observado ahora no equivale a válido en septiembre; GSA histórico tampoco subsana un precio comercial faltante.

## Contrato económico y siguiente aplicación

```text
CVU_alojamiento_pais = noches_habitación × tarifa_habitación_aplicable
                    + unidades_pensión_no_incluidas × tarifa_pensión_aplicable
                    + impuestos/comisiones aplicables no incluidos
```

Habitación = operador / room-night cuando lo confirme la fuente. Pensión = una plaza para el conjunto, no dos activos. Un día de parking US no se convierte en24h por convención. Descansos, días de alimentos y bloques M&IE no son noches facturadas de hotel. La pensión puede ser necesaria también en noches de hotel si no está incluida. Conservar derechos de uso del patio fijo en CFU; no multiplicarlo como pensión de viaje. Ninguna fórmula de CFU/CVU existente cambia en este corte.

Targets actuales: `MX_TRAVEL_EXPENSES` recibe sólo el incremento desagregado de alojamiento MX; `US_DRIVER_TOTAL` conserva salario/prestaciones/M&IE y recibe sólo el incremento de alojamiento US. No cerrar todo el remanente mediante el adapter de resolución por haber hallado una tarifa: todavía puede incluir obligaciones o extras distintos.

Flujo elegido: `prepareB2Closeout` añade un reporte de benchmark cuando aplica el perfil confirmado. Muestra candidatos, unidades, fórmula y faltantes; no selecciona tarifas ni monetiza referencias. La fecha de referencia procede del perfil, no de la fecha del equipo. Fuera de ese perfil el nuevo reporte es null. No UI modificada: siguen vigentes los wireframes de evidencia y traza; no corresponde inventar otro wireframe para una CLI de investigación.

## Criterios de cierre / presupuesto

Cerrar este corte = precios públicos y límites registrados, reporte unido a la CLI existente, política hash-pinned, tests de referencias/periodos/no duplicación/no adopción y salida CLI real local. **No equivale a cerrar alojamiento, calibrar todos los210 inputs ni cerrar B2.**

Responsable único: Codex. OpenAI/gpt-6.1-sol/high recomendado y elección previa conservada; nativo/versión/esfuerzo efectivos desconocidos. Claude también podría investigar y revisar, pero transferir contexto para esta capacidad pequeña y verificable añade costo sin ahorro probado; no se invoca ni cambia escritor. No política global activada, ni Astra/Fable/Luna. Tiempo orientativo45min, cero inferencias auxiliares, cero servicios facturables y hasta dos reparaciones diagnosticadas por causa. Cuota/tokens/cargos atribuibles desconocidos, no consumo cero inferido de errores. Guías `data:validate-data` y `engineering:testing-strategy`: fuentes, denominadores, fechas y aritmética se verifican por separado de la aceptación económica.

Respuesta humana durante el corte: **“el estándar”**. Se interpreta como solicitud de una recomendación operativa basada en evidencia, no aceptación de50/50 ni de un número de noches. Recomendación de planeación: pensión/parking sólo cuando existan condiciones de descanso adecuadas verificadas; hotel por excepción documentada o falta de esas condiciones. Si no se acredita litera/instalación/sitio, conservar pendiente, no inferir alojamiento cero. No se demostró una mezcla porcentual universal en las fuentes consultadas. [FMCSA](https://www.fmcsa.dot.gov/regulations/under-sleeper-berth-provisions-driver-takes-7-hours-sleeper-berth-later-takes-duty) reconoce hotel como ubicación posible de descanso off-duty; no prescribe gastos ni ratios de compra. Su regla regulatoria no se trasplanta a MX: la recomendación económica de condiciones de descanso es binacional, no certificación HOS/NOM. Se consultó también el resumen oficial HOS, sin cambiar el reloj existente.

No se necesita que el usuario proporcione precios. Faltan noches/eventos efectivos por ciclo, bundle de parking, impuesto/comisión y tarifa comercial histórica septiembre o una alternativa prospectiva expresamente elegida. La respuesta orienta la regla, pero no convierte estos datos desconocidos en cantidades. No bloquear otros componentes por este faltante ni volver a investigar cada caseta.

## Evidencia de cierre y rollback

Implementado localmente: register JSON hash-pinned, lector/validador de candidatos y reporte adjunto a la CLI existente. Perfil confirmado y resolución de remanentes existentes no modificados. Fuera del perfil confirmado no se carga el register de alojamiento. Se conserva el inventario de210 parámetros y el costo conocido de los escenarios; ninguna tarifa se inserta en el motor. El número de pins pasa de83 a84 sólo con ese perfil.

Ejecuciones finales tras la última edición de código/tests:

- `npm exec --workspace apps/api -- vitest run tests/benchmark-b2-mixed-lodging.test.ts tests/benchmark-b2-operating-profile.test.ts tests/benchmark-public-pilot-cost.test.ts tests/benchmark-model-inventory-reconciliation.test.ts`: **114/114**, cuatro archivos; 15 pruebas nuevas de alojamiento. Incluye proceso CLI real con argumentos JSON, no sólo invocación directa de la función. Simulaciones negativas de schema/hash no son evidencia de tarifas contratadas.
- `npm run typecheck --workspace apps/api`: salida0; cubre el source API configurado, no scripts/tests por sí solo.
- `npm exec -- tsc --noEmit --module ESNext --moduleResolution Bundler --target ES2022 --strict --skipLibCheck apps/api/scripts/lib/b2-mixed-lodging-benchmark.ts apps/api/scripts/prepare-b2-closeout.ts`: salida0; comprobación adicional de los scripts afectados y sus imports.
- CLI real: salida JSON `CONFIRMED_PROFILE_REVALUATION_PENDING`,84 pins,210 inputs,7 candidatos; ambos escenarios siguen con13 issues y `productiveCostUsd:null`. Proceso CLI hijo terminó **2**, código previsto de no aceptación económica; el wrapper PowerShell de inspección propagó ese estado como1. La prueba final invoca directamente el proceso y comprueba2 y stderr vacío. No presentar ese código como una cotización completada ni como fallo de intercambio Auth.
- `git diff --check`: salida0 para archivos rastreados; whitespace/marcadores de conflicto comprobados además sobre los seis archivos de este corte, incluidos no rastreados: sin hallazgos. Avisos LF/CRLF del árbol existente no son errores funcionales ni cambios aplicados.

JSON SHA256: `f75042c9dfa1c8d77651946f5efdf8b6c90dd00fc3a427d880998813b0428706`. `engine.outputs.ts` conserva el hash previo `3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b`. Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; checkout físico D:. Sin commit nuevo. Hash local controla cambio accidental, no autentica consentimiento ni precio real.

Archivos del corte: `apps/api/scripts/lib/b2-mixed-lodging-benchmark.ts`, dos documentos de investigación con este nombre/fecha y `apps/api/tests/benchmark-b2-mixed-lodging.test.ts`, nuevos; `apps/api/scripts/prepare-b2-closeout.ts` recibe únicamente import/reporte/pin; `apps/api/tests/benchmark-b2-operating-profile.test.ts` ajusta únicamente el contador de pins83→84. Estos dos últimos ya existían no rastreados y no deben eliminarse como parte del rollback.

Checkpoint previo de `prepare-b2-closeout.ts` en `tmp/b2-mixed-lodging-checkpoint/`, SHA256 `d24b0727d67465ac6ee73f2b3c6f11b43463431b73ddc7e82aa039561ccfe1b9`. Revertir sólo import, reporte y sourcePin de este corte y el contador84→83, no restaurar el archivo completo sobre cambios ajenos. Retirar los cuatro archivos nuevos sólo si no tienen cambios posteriores. Sin DB/Auth/producción/despliegue/operación de negocio.

Resultado: **corte de evidencia/reporte completado; alojamiento no calibrado, B2 no cerrado**. El contraste público demuestra precios y límites, no una muestra representativa o factura de septiembre. El siguiente avance debe conciliar cantidades y componentes adicionales con los dos ciclos existentes, sin exigir registros privados de XBF, duplicar viáticos o convertir cada tarifa carretera en otro proyecto. Para evitar expansión automática, una alternativa prospectiva de fechas/precios requiere decisión explícita; no fue adoptada aquí.
