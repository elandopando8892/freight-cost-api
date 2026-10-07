# B2 · caja desacoplada: visibilidad e instalación en CFU

2oct2026, trabajo local en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927. Rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd; cambios previos preservados. Sin despliegue, adopción canónica, contrato ni compra.

## Resultado de negocio

Antes, las comunicaciones de los dos tractores no cubrían la caja desacoplada. Ahora una referencia pública de rastreo autónomo se incorpora a los mismos escenarios contado/financiado: una caja, dos partidas fijas, sin duplicar ELD, administración o CVU. No significa vigilancia humana, indemnización ni señal comprobada sobre la ruta.

Instalación solar publicada3500MXN +IVA modelado16%=4060MXN. Golden250MXN/mes +IVA=290MXN. Reparto económico explícito de instalación en24meses: `(4060/24+290)/18.3688 = 24.997096526 USD/mes`. Los24meses son horizonte prospectivo de permanencia, no plazo contractual, vida fiscal, dato de benchmark ni depreciación de hardware propio. Comodato, no compra del GPS. El desembolso inicial con primer mes sería4350MXN; no volverlo a sumar al gasto mensual.

Exposición por recurso ya calculada mediante MAX tiempo/distancia:

| Ciclo | CFU adicional USD | Subtotal parcial contado USD, dos primas de caja previas |
|---|---:|---:|
| Red, vacío esperado |4.016383446|4111.808865 /4131.893115|
| Retorno vacío dedicado |8.515997964|8077.894713 /8120.479649|

Las dos cifras de cada fila son alternativas públicas de prima de caja, no intervalo estadístico ni mínimo/máximo garantizado. Misma hipótesis de capital NET_PLUS_VAT y pago RATE_EXCLUDES_WEEKLY_REST que el corte anterior. Primera comparación financiada:4221.556304 /4241.640554USD. Las272comparaciones previas conservan CVU, seguro y mensualidades de tractores. Los seis outputs completos siguen null.

## Benchmark previo y decisión

- **Adaptar [DukeTRACK](https://duketrack.com/):** página específica de remolques/cajas ofrece batería hasta30días instalada2500MXN o solar instalada3500, Golden250 o Premium299mensuales. Seleccionar solar+Golden como hipótesis presupuestaria: evita dependencia de alimentación del tractor y una tarea de recarga no medida; no necesita cuentas espejo premium. No sumar999 de instalación genérica, la alternativa de batería ni otro SIM. Cobertura MX/US/Canadá y mantenimiento/comodato son declaraciones comerciales, no prueba sobre esta caja/ruta, disponibilidad de instalador en el punto de operación o SLA de seguridad. No afirmar autonomía solar literalmente ilimitada.
- **No trasplantar [Alkkon](https://alkkon.com/gps-para-flotas/):** mínimo5unidades y tracker/instalación genéricos; no demuestra ajuste nominal a esta caja/unidad ni vigilancia humana.
- **No trasplantar [Fleteo](https://fleteo.com/):** instalación gratuita en patio McAllen/Reynosa, no Laredo; respaldo corto y paquete de tractor no demuestran caja autónoma. No añadir TMS duplicado para resolver GPS.
- **No inventar precio [ONROUTE](https://www.onroute.com.mx/rastreo-remolques.html):** remolque solar pertinente, precio público no localizado.

Adoptar capacidades de proveedores como evidencia económica, no construir un rastreador o activar integraciones. Sin cambio de arquitectura/UI; usa Zod y allocateFixedCost existentes, recalcula el componente anterior validado para no confiar en totales externos adulterados. Fuentes originales archivadas y SHA256 en JSON. Dos lecturas web nuevas de DukeTRACK devolvieron timeout; se conserva la lectura primaria previa y descarga HTTP original exitosa22:03UTC, sin convertir fallos en éxito del lector web.

## Corrección explícita del ELD

El corte anterior confundió envío gratuito con dispositivo gratuito. [Producto](https://matrackinc.com/electronic-logging-devices/) condiciona envío gratuito a anualidad; [catálogo público](https://matrackinc.com/shopping-cart/?product=asset) indica dispositivo ELD incluido con suscripción y planes mes a mes. Se corrigió el texto del JSON y documento anterior, actualizando su pin. No cambian24.95USD/mes ni deltas anteriores.

El nuevo resultado registra devicePriceWithSubscriptionUsd=0 condicionado a suscripción. Envío del plan mensual, mano de obra de instalación, impuestos y registro oficial siguen sin resolver. El subtotal cero de un carrito vacío no prueba envío gratuito. Página únicamente leída; ninguna adición al carrito, orden o activación. No sustituyó el ELD del tractor por el rastreador de caja.

## Validación, límites y siguiente resultado

261pruebas en tres archivos: nuevo10, conectividad22, consolidación229. TSCestricto sin emisión y readback de cifras/pins:PASS. Conservación de272comparaciones, inputs inmutables, nulos intactos, rechazo de doble caja/instalación, importes/horizonte alterados, FX/exposición incorrecta, fuentes duplicadas o hashes corruptos. git diff --check:PASS con advertencias CRLF preexistentes. No prueba autenticada, operación real, calidad de señal ni aceptación de producción.

No se investigaron de nuevo ni se adoptaron teléfonos: referencias de fabricante se localizaron, pero faltan verificar SKU, accesorios y términos comparables. El siguiente cierre económico debe agrupar dispositivos/alta y gastos restantes de patio/viáticos/cruce, junto con decisión de alcance del seguro de mercancía pendiente, antes de declarar costo íntegro. No abrir B3 ni otro sprint UI para encubrir faltantes B2. Un benchmark no exige comprar/contratar, pero un precio no publicado tampoco se vuelve cero.

## Ejecutor y consumo

Codex único escritor/integrador/verificador. Elección humana gpt-6.1-sol/high de16:46:22UTC conservada; modelo/esfuerzo efectivo exactos no observables, no cambio de selector afirmado. La skill claude-review mantuvo el registro de elección y lease por workspace, sin invocación Claude/Fable, agentes ni llamadas IA adicionales. Frente a traspaso, continuar contexto+asignación existente evita repetir implementación, sin porcentaje de ahorro inventado. Fable no resuelve falta de precios públicos.

Estimación25–40min dentro del máximo humano240h; no deadline nuevo ni permiso de gasto. Cuotas5h/semanal/Fable y consumo atribuible del corte desconocidos, no cero ni snapshot anterior actualizado. Cero reintentos de proveedor/fallback. Primeras260pruebasPASS; se añadió regresión monetaria y repitieron261. Sin reparaciones de implementación.

## Rollback selectivo

No ejecutar git reset/checkout ni restaurar archivos completos sucios. Quitar sólo import/pin/cálculo+buclehash/output de boxVisibility del consolidado, ajustar prueba de70a69pins y quitar nuevos archivos de implementación/prueba/política/checkpoint/fuentes sólo si siguen siendo de este corte y sin consumidores nuevos. Conservar la corrección documental ELD y su pin cb1a77798897f6f5b4ede191c7eb76746e4cffec2d93542d4759e6efeeb2d255: es una corrección factual independiente, no revertir a interpretación errónea. Retirar únicamente las entradas de estado de este corte. Nada en DB/Auth/producción que revertir. Pruebas previas de conectividad verifican que sus importes no cambiaron.
