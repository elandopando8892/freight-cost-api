# B2 — comunicaciones de operadores y servicios de seguimiento

2oct2026. **Corte desarrollado y probado localmente; B2 sigue activo.** Antes sólo estaban las líneas administrativas. Ahora cuatro suscripciones públicas se llevan al CFU del piloto por tractor y exposición, conservando una caja y una administración. No se afirma que el costo completo o la seguridad binacional estén resueltos.

## Benchmark, alcance y decisión

| Enfoque | Evaluación y decisión |
|---|---|
| Reusar las dos líneas administrativas para todos los operadores | Descartado como supuesto implícito: acceso de administración no acredita un teléfono disponible con cada tractor. |
| Una línea por tractor y servicios especializados por país | Adaptar como hipótesis pública de costo. Reutiliza exposición MAX, FX fechado y consolidado existente. No contratar ni construir telecomunicaciones, GPS o ELD propios. |
| Otra nómina completa de monitores o una plataforma integral sin precio | No sumar. El pool administrativo ya contiene tracking/CS y las cotizaciones sin tarifa no se convierten en cifras. El modelo interno de asiento continuo permanece como alternativa, no otro cargo automático. |

No cambia arquitectura, stack, UI ni persistencia. Flujo de cálculo: precios públicos → período/moneda → partidas por recurso → exposición física existente → CFU → subtotal conocido. Cierre de este corte: fuentes diferenciadas, efecto monetario en contado/financiado y dos ciclos, sin duplicados ni cambio del CVU. Wireframes MARKSMAN siguen correspondiendo al posterior recorrido B3; este corte no modifica pantallas.

## Precios utilizados y exclusiones

| Componente de referencia | Importe publicado | Uso en el modelo |
|---|---:|---|
| [Telcel SL300, catálogo primario](https://recarga.telcel.com/NewTelcelMXExternalWebMiTelcel/datapackages-catalog-t2p.do) |300MXN/30días,5.5GB|Una línea MX. Gasto mensual promedio304.166667MXN.|
| [Cricket Smart, Broadband Facts](https://www.cricketwireless.com/plans/phone) |50USD/mes|Una línea US; sin AutoPay/promoción. Impuestos y cargos recurrentes del proveedor incluidos.|
| [Spring, plan estándar](https://springtelecom.mx/rastreo-vehicular/) |199MXN+IVA=230.84/mes/unidad|Referencia para tractor MX; equipo/instalación aparte. Precio publicado vigente desde28sep2026.|
| [Matrack Premium mensual](https://help.matrack.io/eld/readme/categories/general-service-guides/subscription-plans-for-eld) |24.95USD/mes|Una suscripción US HOS/IFTA/GPS; no agregar Basic ni otro GPS.|

La equivalencia anual de prepago es `300×365/30=3650MXN` de servicio consumido, entre12meses. No son12recargas ni una factura fraccionada: arrancando sin saldo se necesitan13paquetes/3900MXN, con25días de derecho remanente. No sumar ese desembolso nuevamente al gasto.

[Condiciones Telcel](https://www.telcel.com/personas/amigo/paquetes/paquetes-amigo-sin-limite): comunicación persona a persona, límites de uso internacional y datos; compartir ubicación no entra en el tráfico social gratuito. No usar esta referencia como SIM IoT ni para roaming permanente US. No se ha medido consumo real ni cobertura radioeléctrica de la ruta. Se conserva el importe publicado sin deducir crédito fiscal ni inventar otro IVA.

Cricket distingue tarifa mensual no introductoria y25USD de activación en tienda. Esa activación no es renta mensual ni se presume que el teléfono sea gratis. Se usa su Broadband Facts mensual, no una promoción de primer mes ni extrapolación de términos de otra oferta.

[Alcance humano Spring](https://springtelecom.mx/monitoreo-vehicular-24-7/): atiende alertas/pánico/incidencias; recuperación corresponde a autoridades. El precio estándar se transfiere como hipótesis prospectiva, no como SLA de carga dedicado, vigilancia ininterrumpida o cobertura de una caja desacoplada/US. Aplicabilidad comercial especializada e instalación no están acreditadas ni valoradas.

[Producto Matrack](https://matrackinc.com/electronic-logging-devices/), corrección2oct2026: la sección condiciona **envío** gratuito a planes anuales, no el precio del dispositivo. El catálogo público distingue dispositivo incluido con suscripción mensual; evidencia y corrección en [visibilidad de caja](B2_BOX_VISIBILITY_2026-10-02.md). Envío, instalación e impuestos no quedan gratuitos por ello; agregado aún desconocido. Soporte técnico24/7 no es vigilancia humana. Lectura de lista oficial FMCSA falló previamente; no se afirma registro actual comprobado ni equivalencia del acceso TMS con cotización/despacho/liquidación. La corrección no modifica24.95USD/mes ni importes calculados en este corte.

## Integración económica reproducible

FIX ya verificado: **18.3688MXN/USD, determinación1oct2026**; referencia fechada, no tasa de pago ni nueva consulta. Servicios MX al importe publicado/gross, sin recuperación de IVA asumida; esa política no cambia con las alternativas fiscales del activo caja.

| Recurso | Partidas conocidas USD/mes | Incremento CFU red USD | Incremento CFU dedicado USD |
|---|---:|---:|---:|
| Tractor MX |29.12583656|3.71529019|9.92257499|
| Tractor US |74.95000000|8.17468409|15.10518126|
| Misma caja |0 asignado de estas partidas|0 asignado|0 asignado|
| **Total de este corte** |**104.07583656**|**11.88997428**|**25.02775625**|

La fila caja no afirma seguridad gratuita: estos contratos sólo se asignan a tractores. La seguridad/visibilidad de caja desacoplada sigue pendiente.

`CFU añadido por recurso = mensual × MAX(km_ciclo/capacidad_km, días_recurso/24)`

Reutiliza exposiciones verificadas de `supportingCompanyServicesCfu`; no calcula otra duración ni convierte suscripciones en CVU/km. Conserva sus633.98USD/mes, nómina/TMS, seguros y costos variables. Nuevo resultado `supportingDriverConnectivity`; cuatro partidas a8nodos contado y128financiados, cada uno con dos alternativas previas de prima de caja. No crear otro escenario por hardware sin precio, ni sumar la plantilla interna24/7.

Readback contado `RATE_EXCLUDES_WEEKLY_REST / NET_PLUS_VAT`:

| Ciclo | CFU conocido: dos alternativas de seguro caja | CVU conocido | Subtotal conocido USD |
|---|---:|---:|---:|
| Red |899.380750 /919.465000|3208.411732|4107.792482 /4127.876732|
| Dedicado |2029.257023 /2071.841959|6040.121692|8069.378716 /8111.963651|

Primer nodo financiado/red:4217.539921 /4237.624171USD. Estos son subtotales parciales, **no intervalo estadístico, costo íntegro, tarifa pactada de compra ni venta**. Los seis outputs completos continúan null; no se cambian parámetros canónicos ni se publica una base.

## Evidencia y pruebas

- JSON de este corte SHA256`f38b9e85f8038767714f305a86f670b644baa4511813241af170b0b200ca93fe`; consolidado69pins.
- Seis originales HTML archivados con SHA256 y cuerpo comprobado contra precio/alcance. Telcel términos:403 directo, sin repetición ni archivo falso; lectura web primaria sí realizada. El JSON registra ambos niveles. Páginas comerciales son evidencia de precios/afirmaciones del proveedor, no aceptación operativa.
- **265 pruebas aprobadas/3archivos tras la última modificación**:22conectividad,15empresa,228consolidado. Conservación, períodos, FX, unión contado/financiado, inmutabilidad, doble cargo, corruptelas y seis hashes de originales. Primera corrida263PASS/1FAIL por igualdad exacta de flotantes (diferencia≈4e-15USD); corregida comparación con tolerancia, no precios ni resultado.
- TypeScript estricto/noEmit PASS antes y después de la última modificación de pruebas. Sesión83105 terminó exit0. Readback monetario aprobado; sin integración/servicio real, DB ni UI probados en este corte.
- Verificación selectiva de rollback en memoria PASS. Primer comando diagnóstico tuvo error de comillas; corregido sin escribir/restaurar archivos. No inferencias externas, retries de proveedor o cambios de permisos.

```text
node node_modules/vitest/vitest.mjs run apps/api/tests/benchmark-driver-connectivity.test.ts apps/api/tests/benchmark-company-services-cfu.test.ts apps/api/tests/benchmark-binational-reference-budget.test.ts
node node_modules/typescript/bin/tsc --strict --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler apps/api/scripts/lib/reference-driver-connectivity.ts apps/api/scripts/consolidate-binational-reference-budget.ts apps/api/tests/benchmark-driver-connectivity.test.ts
```

## Lo que falta y siguiente trabajo

Cerrar precio/cantidad de dispositivos, SIM/setup e instalación; distinguir observación de tractor de seguridad de caja desacoplada y costo de vigilancia especializada. Continuar con patio/acceso/maniobras MX, seguros de cruce y conceptos monetarios restantes del piloto. La respuesta pendiente sobre seguro adicional por valor declarado de mercancía no se presume ni impide investigación independiente.

No se exige un contrato real para estimar: los precios de referencia y supuestos de este corte son explícitos. Pero hardware y otros conceptos realmente sin importe no se vuelven cero por falta de contratación. Antes de B3 debe existir el costo completo B2 y su reconciliación, no sólo estos subtotales.

## Responsabilidad, modelo, límites y recuperación

Codex único investigador/implementador/integrador/verificador. Elección humana conservada `gpt-6.1-sol/high` de16:46:22Z; modelo/esfuerzo exactos del runtime no observables. No selector cambiado, Claude/Fable/agentes ni pruebas de acceso invocados. Continuidad evita transmitir contexto a otro ejecutor sin beneficio demostrado; no se declara ahorro cuantificado. Cuotas5h/semanal/Fable, consumo atribuible y cargos permanecen desconocidos, no cero ni una lectura anterior actualizada. Estimación25–40min dentro del máximo240h autorizado, cero reintentos de proveedor y reevaluación tras dos reparaciones fallidas; sin deadline adicional obligatorio.

Guía`claude-review` aplicada al registro/único escritor, APP fijado`chat-20261002T210626Z`, job`driver-connectivity`. Worktree físicoD `cost-tires-release-20260927`, rama`codex/cost-tires-release-s14`, HEAD`4f5fc2de0c3d178dace917231e1092040dec21fd`, AGENTS completo leído. Trabajo previo ajeno preservado. No compras, contactos, activaciones, IA de aplicación, DB/Auth/Neon/usuarios, migraciones, infraestructura, commits o despliegues.

Rollback: retirar únicamente import/pin/cálculo/hash-loop/salida`driverConnectivity` del consolidado y cambiar conteo de prueba69→68. Reconstrucción en memoria coincide con hashes precorte **1066c82dce9eacc387ddb613824a6ba02d4f3ed7a73c8971b3080ea4e66feaca** (consolidado) y **ea6cd8b33f711fae8446b2a80884d544f08d8666c7a0ffa7831c5407f3174720** (prueba). Conservar módulo/política/fuentes desconectados y retirar sólo las dos entradas de estado si se revierte. No restaurar archivos completos ni borrar cambios ajenos.
