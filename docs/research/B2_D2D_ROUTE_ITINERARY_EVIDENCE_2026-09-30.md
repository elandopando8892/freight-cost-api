# B2 - Ruta, distancia y casetas: evidencia y siguiente integración API

## Resultado de negocio del corte

Corredor del usuario: **Mexico, DF -> Fort Smith, AR 72916 vía Nuevo Laredo/Laredo**. Se obtuvo una alternativa pública mexicana y se contrastaron sus casetas con operadores, sin escribir inputs del viaje ni importar valores a bases gobernadas. **No es una ruta de tractocamión aprobada ni un costo D2D calculable.** La prioridad aclarada por el usuario durante el corte es usar APIs para ruta/distancia/casetas; no prolongar la captura manual como funcionamiento del SaaS.

Entrega local: [manifiesto estructurado](B2_D2D_ROUTE_ITINERARY_EVIDENCE_2026-09-30.json), transcripción de 37 segmentos/12 plazas, tres archivos primarios conservados por hash y un revisor offline. Se fija el caso D2D anterior por hash sin alterarlo. Los cuatro contrastes numéricos y ocho pendientes son observaciones de este itinerario, no parámetros calibrados ni nuevas tareas/sprints.

## Lo observado, separado de lo adoptado

Consulta en la UI pública de [SICT Rutas Punto a Punto](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=cmdEscogeRuta): Distrito Federal / Cd. De México (Zócalo), Tamaulipas / Puente Nuevo Laredo III (Laredo), **Camión 5 ejes**, solución detallada, sin cálculo de combustible. La salida se muestra en `action=cmdSolRutas`; depende de sesión/formulario, no es una API ni un permalink reproducible por sí solo. El manifiesto transcribe la tabla visible, no afirma archivar el HTML completo del resultado.

Zócalo es un punto representativo de investigación seleccionado por el agente, **no el domicilio de carga confirmado**. Puente III y cinco ejes son hipótesis de consulta, no decisiones del usuario ni del transportista. La herramienta no acredita que la geometría sea compatible con las dimensiones, peso, restricciones urbanas, hazmat o permisos. El sentido nominal es hacia EE. UU.; no se confirma que cada fila de peaje represente el movimiento correcto.

| Medida de la alternativa MX | Total mostrado por SICT | Suma de filas transcritas | Uso permitido |
| --- | ---: | ---: | --- |
| Distancia | 1,119.170 km | 1,119.163 km | Contraste aproximado; diferencia de 0.007 km expuesta, no reparada ni adoptada |
| Tiempo | 11:08 | 10:52 | Tiempo informativo para automóvil sin paradas según advertencia SICT; diferencia de 16 minutos expuesta, no ciclo operativo |
| Peajes | 2,770 MXN | 2,770 MXN | Reconciliación de pantalla solamente; contiene ceros/precios sin validar |

La suma en minutos no vuelve exacto un tiempo originalmente mostrado con resolución limitada. No se presume la causa de la diferencia. El total monetario coincide aritméticamente pero **no es un peaje contemporáneo aprobado**. Sin fecha de servicio, domicilio, equipo, ruta elegida, retorno/vacío ni itinerario US; no se convierte MXN a USD ni se llena `cycleDays` con horas/24. No se emplean pesos/km aproximados ni distancias en línea recta.

## Hallazgos que la automatización debe respetar

1. **CAPUFE:** páginas 1 y 4 completas del [PDF oficial 2026](https://iave.capufe.gob.mx/assets/Doc/Tarifas-vigentes-2026.pdf) fueron renderizadas e inspeccionadas visualmente, conservando encabezado C5, MXN con IVA y vigencia 13 abr 2026. Jorobas 278, Palmillas 482, Chichimequillas 121 y tramo completo La Carbonera-Puerto México 306 coinciden numéricamente con la pantalla. No certifican selección/sentido/cobertura del viaje. México-Querétaro 999 es agregado alternativo a sus plazas; no sumarlo de nuevo. Palmillas BIS, Huachichil parcial y plaza/tramo completo no se suman como cargos independientes. Ojo Caliente no tiene importe en C5: una celda vacía no respalda el cero que muestra el planificador.
2. **CEM:** [tabla del operador](https://www.circuitoexterior.mx/rutas-y-tarifas/) muestra Tultepec 454/538 para camión 5-6 según origen, frente al 112 del planificador. No se elige uno sin resolver movimiento. T0 Jorobas-Zumpango, Carga 5, muestra 642 con vigencia 22 mar 2026, frente a 245; no reemplazar y sumar CAPUFE Jorobas 278 sin conciliar cobertura compartida. No extrapolar la vigencia de T0 a todas las tablas ni adoptar un descuento de regreso de otro tipo de vehículo.
3. **Lincoln:** [REANL](https://reanl.com.mx/nosotros/tarifas/) publica camiones 5-6: principal 595, auxiliar 364 y entronque 238, vigencia 8 feb 2026. La pantalla SICT muestra cero. Movimiento/operador exactos por validar; no se escoge tarifa ni se confunde la fila de autobús 1,078 con camión. Moneda, impuestos y medio de pago necesitan preservarse antes de una adopción; el snapshot REANL no certifica por sí solo la factura del viaje.
4. **Frontera:** [SICT Puente Nuevo Laredo III](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=cmdDatosOperRepDet&idVia=86) muestra C5 144 sin fecha efectiva, igual que su planificador: no son dos confirmaciones independientes de vigencia. Identifica concesionario/operador en una página cuya actualidad operativa no se certifica. [CBP puerto 2304](https://www.cbp.gov/about/contact/ports/laredo-texas-2304) tiene clasificación comercial indexada; acceso directo 403, horarios/colas no adoptados. [Ordenanza Laredo 2026-O-114](https://cityoflaredo.legistar.com/LegislationDetail.aspx?FullText=1&GUID=EE67763C-5ACA-4570-9E93-1A4EC3A3FD28&ID=8067932&Options=&Search=) consta aprobada 15 jun 2026; su antecedente 4.75 USD/eje es **southbound e histórico**, no tarifa vigente northbound. Exhibit A no fue recuperado. Peaje de puente no equivale a intercambio/patio/maniobras/espera.

San Nicolás de los Jassos, Matehuala y Sabinas mantienen precios observados de la pantalla y sin tabla contemporánea del operador conciliada. Ninguna plaza pendiente se considera gratuita. Peajes US permanecen desconocidos, no cero.

## APIs: decisión pragmática antes de más captura manual

Revisión actual en `apps/api/src` y `apps/web/app`, `components`, `lib`: no se encontró conector SAKBÉ/HERE/Google Routes ni llamada de cálculo de rutas; `apps/api/src/config/env.ts` tampoco declara credenciales de esos proveedores. Esto verifica **el código de este worktree**, no todas las variables remotas ni todas las apps de Rateware. No se imprimieron secretos ni se modificaron variables. Las notas de B1 ya mencionaban proveedores, pero no son implementación.

| Proveedor | Adoptar / adaptar / descartar para este MVP | Capacidad verificada y límite |
| --- | --- | --- |
| [INEGI SAKBÉ](https://www.inegi.org.mx/servicios/Ruteo/Default.html) | **Evaluar primero para MX**; adaptar al contrato existente de viaje | POST `buscadestino`, `optima/cuota/libre`, `detalle_o/c/l`; devuelve geometría, longitud, tiempo, detalle y casetas. Tabla de vehículo: `v=8` significa camión 5 ejes, **no el selector 12 de la UI SICT**. Token propio y prueba del corredor pendientes. Documentación advierte retrasos de tarifas/tiempo en condiciones ideales; no prueba disponibilidad ni respuesta vigente. |
| [HERE Routing v8](https://docs.here.com/routing/docs/routing-v8-truck-routing-coverage) | **Candidato de carga para US o corredor completo** si cobertura/costo quedan aprobados | Documenta restricciones de camión en México y EE. UU. [Tolls](https://docs.here.com/routing/docs/routing-v8-tolls-for-route) puede devolver nombres, métodos/importes; cuenta como transacción adicional. Cobertura exacta de sistemas de peaje debe confirmarse. No cuenta configurada, llamada ni precio de contrato verificados. |
| [Google Routes LVR](https://developers.google.com/maps/documentation/routes/lvr) | **Descartar como proveedor único D2D de camión+peajes** | Documenta acceso limitado, cobertura camión en EE. UU. continental/Japón y peajes de camión no soportados. Ruta DRIVE/peaje de automóvil no sustituye tractocamión mexicano. Puede servir como contraste, no justifica otra integración ahora. |
| UI SICT + tablas de operador | **Conservar como contraste y fallback etiquetado** | No convertir pantalla en endpoint API supuesto; mantener fuente por plaza y discrepancias. La captura manual no es el flujo principal futuro. |

**Siguiente entrega única: validar acceso y respuesta de API para ruta/casetas antes de continuar extracción manual.** Empezar por token propio SAKBÉ y consulta mexicana acotada, sin usar claves de ejemplo publicadas ni inventar IDs/coordenadas. El token debe ir en configuración server-only local, nunca al chat, repositorio ni frontend. No registrar al usuario ni aceptar términos/activar facturación por este corte. Verificar condiciones de atribución INEGI y licencia/retención del proveedor antes de persistir respuestas.

Si se requiere HERE, revisar cuenta/plan/cuota/costo y solicitar autorización puntual antes de cualquier consulta facturable. No prometer costo cero por existir un tier gratuito o presupuesto configurado. Elegir un proveedor principal con una respuesta de prueba real, no abrir otros catálogos o tres desarrollos paralelos. Después conectar el resultado normalizado al preflight existente: ruta/país/equipo/sentido/fecha, distancia, tiempo de conducción distinto del ciclo, plazas/moneda/IVA/pago/cobertura, advertencias. Si faltan peajes, conservar `INCOMPLETE`; no reparar con ceros. Persistencia/UI posterior con wireframes MARKSMAN y autorización de entorno. No afirmar que ya hay APIs integradas por tener esta tabla.

## Validación local y límites

`apps/api/scripts/review-d2d-route-evidence.ts` revisa esquema, linaje, hashes de archivos y coherencia de referencias; reproduce sumas sin invocar Prisma, redes, compositor ni IA. Cálculos sólo de transcripción, no CFU/CVU. Los importes observados no fluyen al caso anterior: los doce campos de handoff permanecen nulos. Estado `INCOMPLETE`, cero adopciones, B1/E1 abiertos, B2 parcial, 0/4 gates.

CLI desde D: con el Node configurado y `node_modules/tsx/dist/cli.mjs`:

```text
apps/api/scripts/review-d2d-route-evidence.ts docs/research/B2_D2D_ROUTE_ITINERARY_EVIDENCE_2026-09-30.json
```

Exit 2 es el resultado incompleto esperado (lanzar a través de PowerShell puede reportar código envolvente 1; el test verifica el proceso Node directamente); exit 1 de Node indica error de esquema/integridad. No es una comprobación de release productivo ni parseo automático certificado de HTML/PDF: la extracción de tarifas es manual documentada. Un hash verifica bytes, no vigencia del precio. La CLI no prueba disponibilidad SAKBÉ/HERE, sesión, persistencia, truck-route ni cotización autenticada.

Pruebas nuevas cubren 25 casos incluyendo sumas/diferencias, hashes alterados, fecha inválida/futura, referencias incompletas, doble plaza, match falso, acceso sólo indexado y prohibición de rellenar inputs o promover aprobación. **106/106 pruebas focalizadas en tres archivos PASS**: 25 nuevas, 26 del preflight y 55 del compositor D2D; typecheck API y script PASS, `git diff --check` PASS, hash del caso anterior intacto. Suite general e inventario canónico no reejecutados en este corte. Pruebas locales no acreditan una respuesta real de API ni aceptación operativa.

## Entorno y rollback

Worktree D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, verificados. Políticas leídas, cambios previos conservados. Sin cambios de motor activo, DB/Neon, usuarios/Auth, infraestructura, deploy, negocio, UI ni consumo de IA de aplicación. Sin commit/push.

Rollback **no ejecutado**: retirar sólo este documento, su JSON, el script/test nuevos, PDF CAPUFE y los dos HTML con nombres exactos registrados en `sources`; quitar sólo las referencias de este corte en plan/estado. No restaurar esos documentos completos ni retirar investigación previa o el caso fijado por hash. No hay efecto remoto que revertir. Modelo recomendado único: **GPT-6.1 Sol · alto**, tanto conciliación actual como integración API acotada; selector no cambiado ni agentes delegados.
