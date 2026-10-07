# B2 — seguro de mercancía conectado al piloto

## Resultado y límite

Antes existían una fórmula pública y un adaptador de costos aislado; el importe no llegaba a la última cadena de comparaciones de contado/financiamiento, desgaste bobtail y responsabilidad civil. Ahora `supportingPilotCargoInsurance` integra el seguro adicional por valor declarado una vez por embarque de salida: 1,088 comparaciones principales y 2,176 variantes fiscales. Son escenarios alternativos, no 3,264 embarques ni una suma de pólizas.

El alcance de B2 sigue siendo el costo D2D completo del piloto México DF → Fort Smith AR72916, Puente III, caja seca53′, relevo propio MX/US y misma caja. **Este incremento no cierra B2.** Los seis outputs completos del consolidado continúan `null`; `quoteReady=false`, sin adopción ni operación de negocio.

## Benchmark, alternativas y decisión

Se reabrió la fuente primaria [Timi — costo del seguro de carga](https://timi.mx/carga/cuanto-cuesta), revisión local 2026-10-03UTC; la tabla publicada con fecha20-sep-2026 coincide con los ocho puntos ya archivados. Se conserva la prima0.45%, mínimoMXN250, derechos únicamente en puntos publicados e IVA16%. No se extrapolan derechos para valores intermedios. La publicación no es una cotización ni acredita elegibilidad de nuestra carga/ruta.

Alternativas: mantener el cálculo aislado (no completa la integración), copiar su aritmética en el consolidado (duplica reglas y retrabajo), o reutilizar la función existente mediante un lote de proyecciones. Se adopta la tercera: sin paquete, infraestructura, servicio o proveedor nuevo. El lote calcula una sola referencia para sus comparaciones; el consolidado conserva además su referencia independiente ya existente. No se atribuye una única invocación global cuando son dos.

La cadena tiene tres elecciones explícitas: `UNDECIDED` conserva pendientes; `SEPARATE_SHIPPER_COST` excluye únicamente el seguro suplementario del costo del transporte; `INCLUDE_IN_MODELED_TRANSPORT_COST` exige valor, descripción y tratamiento fiscal. Ninguna elección elimina la cobertura anual de cargo del transportista (proxyUS1553USD/año), responsabilidad civil o daño físico de la caja. Un regreso vacío, relevo o segundo tractor no duplica la prima suplementaria.

## Reproducción local y lectura de ejemplo

Séptimo argumento opcional de `consolidateBinationalReferenceBudget`: la elección de mercancía. Los seis argumentos anteriores mantienen sus defaults. Las alternativas fiscales son hipótesis explícitas, no prueba de acreditamiento de IVA.

```typescript
consolidateBinationalReferenceBudget(undefined, undefined,
  'POSTAL_REFERENCE', 'PUBLIC_LINK_FORECAST',
  'IMT_C3_NON_ARTICULATED_PROXY', 'PUBLIC_US_PRIMARY_LIABILITY_PROXY', {
    mode: 'INCLUDE_IN_MODELED_TRANSPORT_COST',
    declaredValueMxn: 500000,
    cargoDescription: 'Synthetic public-price example, not actual pilot cargo',
    taxTreatment: 'GROSS_VAT_NOT_CREDITABLE_PLANNING',
  })
```

Este ejemplo **no selecciona carga real del usuario**. MXN500,000 daMXN2,400 netos/MXN2,784 brutos; FIX de referencia18.3688 daUSD130.656330299203/151.56134314707546. La fecha de servicio y el valor real siguen sin acreditarse.

Lectura ejecutada para contado, capitalNET_PLUS_VAT, sueldo sin descanso semanal incluido, primera alternativa de daño físico de caja y extremo inferior de responsabilidad civilNEW_AUTHORITY_INDIANA_2025:

| Escenario | Componentes CFU conocidos USD | Componentes CVU conocidos USD con ejemplo bruto | Suma parcial USD |
| --- | ---: | ---: | ---: |
| Red/vacío esperado | 1064.1948808155792 | 3740.5696574808658 | 4804.764538296444 |
| Dedicado/regreso misma caja vacía | 2455.870772143663 | 6960.08792238348 | 9415.958694527142 |

No son límites del mercado, un costo D2D completo, tarifa pactada ni precio de venta. Las sensibilidades de tractor rígido y responsabilidad domésticaUS no acreditan equivalencia con nuestro tractor extranjero. Con elección pendiente o derechos no documentados, el nuevo CVU/suma queda `null` y se retienen los componentes previos para auditoría.

## Fuentes y preservación

Se conservan79pins, originales y archivos archivados. No se editaron tarjetas de importes:

- `B2_CARGO_TRIP_INSURANCE_2026-10-02.json`: SHA256 `5cbb5946c8e7af7a91b271a253f0bc9ba80d0c6ca6a7308f881fa7c0fcce92a8`.
- `TIMI_CARGO_PRICE_20261002.html`: `32098a67f7f78dfb66b4c310be89adc42e240327197a8ed196be0da9ca67fe3c`.
- `TIMI_CROSS_BORDER_20261002.html`: `7c0be90666283ea23d6ee7c0a61b310c61cdd09f6de39fccca7712c96cea9e89`.
- `FMCSA_MX_REGISTRATION_INSURANCE_20261002.html`: `647a7bdff0d1beb34f359e9ac8490f74df08f42c85922ef3fa5b6ef617655bd7`.

El consolidado verifica los hashes; pruebas de alteración siguen rechazando archivos cambiados. Reseña actual de peajes: el [PDFCAPUFE2026](https://iave.capufe.gob.mx/assets/Doc/Tarifas-vigentes-2026.pdf) leído como texto mantiene C5OjoCaliente sin importe, no cero; no hubo inspección visual nueva delPDF en este incremento. El [sitioSCT](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=cmdSolRutas) devolvió página de error al lector web, no evidencia de tarifa. Los movimientos Jorobas/Carbonera, regreso y validacióntruck siguen limitando el cierre; no se rellenaron importes por inferencia.

## Verificación y recuperación

Validación local, datos públicos fechados y escenarios sintéticos; sin login, frontend, persistencia ni aceptación operacional nueva. Suite de seis archivos:317testsPASS después de la última modificación de código. TypeScript estricto de los cinco archivos afectados:PASS. Hubo un primer fallo de tipos (dos accesos a `premiumAlternativeId` que el tipo de passthrough no conservaba); una reparación conserva el objeto de alternativa tipado y su procedencia. No se ocultó el intento fallido.

Pruebas: suma una vez en todas las alternativas y variantes fiscales; CFU previo intacto; inputs inmutables; determinismo; originales intactos; cargo separado; defaults pendientes; valor600,000 sin derechos documentados; rechazos de duplicación, nueva aplicación, joins/sumas corruptos, FX y tarifa inválidos. Recarga, permisos, cuenta y vencimiento corresponden al siguiente recorrido SaaS, no a estas funciones locales puras.

Rollback de comportamiento: omitir el séptimo argumento devuelve alcance pendiente; no activa una elección comercial. Para retirar esta nueva proyección, revertir **sólo** los hunks de este incremento en los tres módulos y dos tests, junto con este documento; preservar todos los cambios previos del usuario. Sin reset, checkout destructivo, eliminación, commit ni push. El snapshot previo de los seis archivos está en el job del kit `cargo-through-final-reference-chain.json`; SHA256 es evidencia de diferencias, no una copia recuperable por sí sola. El adaptador individual sigue compatible.

## Responsable, modelo y presupuesto

Elección humana registrada2026-10-02T16:46:22Z: Codex `gpt-6.1-sol`, esfuerzo`high`. Recomendación suficiente para integrar/verificar la misma cadena; no se cambió el selector principal, su modelo/esfuerzo efectivos siguen no observables desde esta superficie. Claude es alternativa no seleccionada; Fable no aporta una necesidad demostrada para este cambio verificable. No se invocó Claude, otro modelo auxiliar ni subagente. La skill`claude-review` sólo registra elección, snapshot y escritor exclusivo local.

MáximoB2 autorizado240h global; sin fecha límite adicional por corte. Contrato:80pasos, cero reintentos automáticos, máximo dos reparaciones locales antes de reevaluar; usada una. Detener ante gasto, datos privados o autoridad nueva. Lectura soportada de cuota2026-10-03T01:40:16UTC: ventana semanal11%utilizada/10080min, reposiciónUnix1791580450; ventana5h no disponible, no cero. Claude5h/semanal/Fable desconocidos. No conversión a dinero o porcentaje del plan a partir de tokens, ni garantía de cargos cero; no se activaron API/inferencia de pago.

Ejecución: seis archivos declarados, un único escritor en D:, procesos de tests/tipos/readback terminados con códigos observados. Rama`codex/cost-tires-release-s14`, HEAD`4f5fc2de0c3d178dace917231e1092040dec21fd`; dirty work previo conservado. El recibo del kit diferencia cierre del escritor de modelo principal no reobservado; su etiqueta técnica no declara bloqueado el objetivoB2. Próximo trabajo de negocio: resolver cobertura de peajes y consolidar un escenario económico completo con sus exclusiones explícitas, sin abrir otra serie de pantallas.
