# B2 · método de aproximaciones fronterizas

## Resultado del corte

Un waypoint con el nombre World Trade Bridge **no demuestra tránsito por ese puente**. La consulta pública de Maps entre los patios de referencia, pasando por ese waypoint, llegó a la zona del puente comercial pero continuó por I-35/Convent Avenue y Portal a las Américas. Se rechaza esa ruta para el piloto Puente III. No se adoptan su distancia, duración o peajes en combustible, conductor, CFU/CVU ni exposición de activos.

La revisión del código encontró que esta adopción ya está impedida: `google-basic-route.client.ts` devuelve únicamente un candidato DRIVE con `truckRouteValidated=false`, `quoteReady=false`, cero valores adoptados y cuatro entradas de viaje null. `google-route-review.routes.ts` limita la revisión habilitada a desarrollo y, cuando se configura `allowedRequest`, exige el tramo autorizado sin intermedios. No se reimplementa un motor ni se amplía ese contrato. Se añaden dos regresiones sintéticas para conservar estas garantías incluso si un proveedor devuelve campos de aprobación no solicitados.

## Benchmark y decisión de reutilización

| Capacidad | Evidencia / ajuste | Decisión |
| --- | --- | --- |
| Cliente Google básico existente | DRIVE, máscara mínima, candidato transitorio; no certifica carga ni cruce comercial | Reutilizar para contraste, sin adopción automática |
| Maps público, itinerario transfronterizo con waypoint | Observación directa: visita la zona solicitada, pero cruza por otro puente | Rechazar como distancia del piloto |
| Aproximaciones nacionales por separado | Observadas SIMACO → Puente III y patio Metropolitan → domicilio estadounidense del recinto; son candidatos automóvil, no carriles certificados | Investigar ajuste a accesos de carga; no sumar todavía |
| Demo OSRM | [Política del servidor](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server): uso razonable no comercial, sin garantía de servicio/actualización | Rechazar para integración comercial; ninguna consulta de rutas al demo |
| Instalar otro router / contratar servicio truck | No necesario para descubrir esta incompatibilidad; añadiría operación/costo, sin resolver por sí solo entradas del recinto | No introducir en este corte |

La diferencia propia de FCM sigue siendo la asignación económica por tractor MX, tractor US y la misma caja, no reconstruir cartografía común. Un acceso candidato puede fundamentar una hipótesis prospectiva sólo después de explicar su alcance y transferencia; nunca se presenta como ruta operacional validada.

## Fuentes y límites de evidencia

Investigación pública 2oct2026, aproximadamente23:30–23:48UTC; fecha real de servicio aún no indicada.

- [Texas Comptroller: puertos de Laredo](https://comptroller.texas.gov/economy/economic-data/ports/2016/laredo.php), tabla histórica Crossing Types: World Trade para camiones comerciales; Gateway to the Americas para vehículos no comerciales/peatones. Releída en este corte. Se usa para identidad/tipo, no horarios o tarifas actuales.
- [Programa territorial oficial Nuevo Laredo2025](https://www.tamaulipas.gob.mx/seduma/wp-content/uploads/sites/8/2025/11/pmotdu-nld-poe.pdf): índice/extracto público identifica Puente III como exclusivo para carga. Extracto, no PDF íntegro archivado/verificado en este corte.
- [FHWA World Trade Bridge report2002](https://ops.fhwa.dot.gov/freight/documents/wrld_trade_br_sitrpt.pdf): observaciones2001, tabla16 incluye vacíos y bobtail conjuntamente. Su tiempo se mide entre puntos de exportación/inspección inicial; **no reemplaza** la media2019 de cruce completo existente ni acredita tiempos actuales patio–patio. No mezclar cohortes ni fronteras de medición.
- [SIMACO](https://pensionsimaco.com/) y [Outpost Metropolitan](https://outpost.us/locations/laredo-metropolitan/): domicilios públicos de referencia; no elección/contrato de transportista o patios del piloto. Los originales previamente archivados permanecen intactos.
- [Guía oficial USDA/APHIS de contactos CBP2022](https://direct.aphis.usda.gov/sites/default/files/cbp.pdf): extracto público sitúa World Trade en715Bob Bullock Loop. Es domicilio de oficina, no identificación del carril comercial o entrada de tractores. Consulta directa CBP devolvió403; no se superó esa restricción.
- [TxDOT, cruces Texas–México](https://www.txdot.gov/projects/projects-studies/statewide/texas-mexico-border-crossings.html): índice primario revisado; su PDF de inventario no pudo recuperarse por timeout. No atribuirle una longitud leída ni usar el proyecto de ampliación como puente existente.
- Consultas públicas de navegador: [ruta transfronteriza rechazada](https://www.google.com/maps/dir/?api=1&origin=18702+Metropolitan+Rd,+Laredo,+TX&destination=Pension+Simaco,+Nuevo+Laredo&waypoints=World+Trade+Bridge&travelmode=driving), [aproximación MX](https://www.google.com/maps/dir/?api=1&origin=Pension+Simaco,+Nuevo+Laredo&destination=Nuevo+Laredo+International+Bridge+III&travelmode=driving), [aproximación US](https://www.google.com/maps/dir/?api=1&origin=18702+Metropolitan+Rd,+Laredo,+TX&destination=715+Bob+Bullock+Loop,+Laredo,+TX&travelmode=driving). Observación directa, resultados dinámicos; sin claves, Maps Platform API, login ni modificación de cuentas. No se retienen polilíneas, instrucciones copiadas, distancias, tiempos de tráfico ni identidad de cuenta.

## Siguiente puente económico, sin duplicación

1. Definir puntos compatibles de entrada/salida de **carga**, no sólo nombre de puente/domicilio de oficina, y distinguir sentido norte/sur.
2. Separar las aproximaciones nacionales del tránsito internacional. No invertir una ruta de un solo sentido ni agregar longitud de puente a un recorrido que ya lo incluye.
3. En red: un regreso bobtail del tractor MX. En dedicado: regreso bobtail sur y recuperación bobtail norte mientras la caja sigue con el tractor US. No imputar kilómetros bobtail a la caja ni agregar sus relojes en serie a la caja.
4. Reconciliar extremos: SAKBE termina en punto mexicano de referencia; Laredo→Fort Smith es otra referencia urbana. Unirlos a los patios requiere restar solapes antes de sumar accesos.
5. Una vez sustentado el recorrido de referencia, recalcular capacidad, jornada, km remunerados, combustible/DEF y exposición de activos. Desgaste tractor/caja requiere alcance compatible: no dividir una tasa compuesta arbitrariamente. La reserva de ralentí existente no vuelve a cobrarse como combustible de cola.

No se solicita otro dato privado para estos pasos: la base es pública. Tampoco se declara que todo quedó calibrado por observar un mapa. Los74pins,272comparaciones económicas y salidas completas null del consolidado permanecen sin modificaciones; esta revisión no añade otra etapa económica vacía.

## Ejecución, pruebas y rollback

Elección humana registrada Codex `gpt-6.1-sol/high` de16:46:22UTC; continuidad dentro del máximo240h. Modelo/esfuerzo efectivos del principal, cuota5h/semanal y consumo atribuible desconocidos; no se afirma cambio automático de selector. Codex escribe y verifica; no Claude/Fable/agentes/IA auxiliar. Se usó la skill `claude-review` sólo para registro de elección/lease de escritor único, no inferencia ni acceso a credenciales. Fable/Sonnet no aportan resolver el acceso comercial que el modo DRIVE no certifica; no se asigna otro ejecutor.

Workspace físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd. Cambios ajenos preservados. No Auth/DB/usuarios/Neon/migraciones/infra/producción/publicación/negocio/contrataciones.

Verificación final23:47UTC: **75 pruebas/2 archivos PASS**,51 del cliente y24 de las rutas HTTP de revisión; incluye las dos nuevas regresiones. TSC estricto ESNext/Bundler PASS después de la última edición del test; `git diff --check`PASS con avisos CRLF existentes. Sólo llamadas simuladas al proveedor; no prueba de circulación/autorización comercial ni aceptación de operación. Reintentos automáticos0; máximo dos reparaciones antes de reevaluar. Errores de lectura de nombres antiguos de archivos,403CBP y timeoutTxDOT conservados como fallos de investigación, no consumo cero. Ningún fallo de implementación/reparación. Las pruebas de economía del corte anterior no se vuelven a contar como ejecutadas aquí.

Readback por hashes: consolidado `33c2ce9610d5c4e39e34b961de37c7380ba03fff28cd969bc4b747f44d7fa74a` y test económico `d5dcc6922e13ab956e7d03e2a7c79b039b09123007dd5d0269536bf37eda3b2b` idénticos al corte previo; test Google actualizado `4d3093a45369b499a226c67e1ad2814ec8175d9da03eb253df8d5a59ea24036e`. No se invocó el motor económico, no se añadieron pins, no se cambiaron entradas ni subtotales. No hay procesos de prueba pendientes. Lease cooperante `79864421fa974f92a0db31bca9342966` sólo sobre este documento y test, release APP chat-20261002T232232Z. El resultado de la actividad es comprobado localmente; B2 sigue activo y no queda certificado completo.

Rollback selectivo: retirar exclusivamente los dos nuevos casos `a named commercial bridge waypoint...` y `provider-added crossing...` de `google-basic-route-client.test.ts`, conservando el resto; retirar este documento si no tiene ediciones posteriores. No restaurar archivos completos, borrar investigación previa ni usar reset/checkout. El snapshot previo de los dos archivos queda en el job `border-map-method.json` del kit; la aplicación y sus importes no se modificaron.
