# B2 · registro separado de cargos dependientes

Antes: 46 referencias de registro y 13 bases pendientes. Ahora: **54 referencias y cinco bases pendientes**, integradas al consolidado local; ocho registros no desaparecen por tener impuestos por valor sin resolver. No son 54 tarifas completas: cero partidas completas/adopciones, IRP total y CFU/CVU/precios siguen null. Se cierra este incremento documental, no B2/MVP.

## Benchmark y decisión

Se reutilizaron el perfil de tractor, el consolidado, sus contratos/pruebas y los anexos oficiales IRP conservados. Tres alternativas: reconstruir bases desde facturas redondeadas (rechazada: pierde cargos y redondeos); aislar registro explícito de impuestos dependientes (elegida: avance verificable sin inventar valores); reemplazar anexos por nuevas fuentes jurisdiccionales (reservada para faltantes/conflictos y vigencia, no búsqueda general repetida). La capacidad estándar de lectura/hash ya existe; no motor, infraestructura, librería o proveedor nuevo. Investigación original fechada, no afirmación de tarifa vigente en octubre.

Objetivo/aceptación: enlazar ocho registros explícitos al mismo escenario público, conservar cargos/condiciones faltantes y cotejar celdas originales; nunca adoptar subtotal como permiso completo. Sólo API de investigación/documentación: sin UI nueva ni wireframe requerido en este corte; UI futura conserva MARKSMAN y wireframes. Relevo propio MX/US, misma caja, contado/financiado intactos.

Fuente: [IRP Guidelines 2026](https://www.irponline.org/resource/collection/A35CA2A0-300D-4785-B21C-329509828DD9/2026_Fee_Test_Guidelines__06_08_26.xlsx), publicación junio, ejercicio enero 2026, no vigencia actual acreditada. Archivo original `sources/IRP_FEE_TEST_GUIDELINES_2026_REVIEW_20261001.xlsx`, SHA-256 `5db191bc435844030366c5edd0b44401b7f832f73edc67ef587b30475b3f9df1`. Se cotejaron relaciones/nombres de pestañas y valores XML, sin ejecutar macros/fórmulas. JSON de este corte pin24: SHA-256 `2f4e13c785b0082c6a08d3d022e977262edc6e78cf85fb2abdcabb811dbfe54a`.

| Jurisdicción | Registro del ejercicio USD/año | Celda | Lo que no resuelve |
| --- | ---: | --- | --- |
| CA | 1942, componente GVW | C50 | Registration118/CVRA122/CTIP3 separados; VLF fiscal/edad/redondeo |
| CO | 2350 | E35 | Bridge32/Road39 separados; edad E32 con porcentaje inconsistente; MSRP/ownership |
| KY | 1440 | G53 | Compra/fecha/factor; reporte placa vs ejemplo con ad valorem |
| MS | 1512, Schedule1 | D31 | Schedule2 de modelo2022 no trasladado al2021 |
| NV | 1360 | G41 | BGST fábrica/tabla/modelo |
| SC | 800 | B31 | RUF valor y aplicabilidad |
| WV | 1131.25 | E32 | Precio/primer año ad valorem |
| WY | 907.5 | E29 | Excise1540 sin base compatible acreditada |

Los registros pertenecen al ejercicio de tractor2022/80,000lb/doce meses/for-hire, no acreditan compatibilidad económica del activo2021. Base conocida × participación APVD es contraste sin redondeo de factura; componente completo sigue null en los ocho. Extras CA/CO conservados como referencias separadas, no sumados como cuotas completas; desconocidos no son cero. No se usa participación del ejercicio para repartir APVD ni se deriva base desde factura redondeada.

Faltantes exactos de registro: **FL, ID, NE, UT, VT**. Florida no mapea explícitamente Test2; Idaho contradice hire/private; Nebraska remite a HandlogExcel ausente (se revisaron embeddings/relaciones externas sin hallar anexo); Utah/Vermont mantienen inconsistencias. Aun con registro conocido faltan valor, perfil/registrante, vigencia, cargos y redondeos de la familia. La etiqueta histórica `missingFeeJurisdictionIds` del consolidado identifica bases faltantes, no todas las cuotas incompletas. Próximo: resolver estos cinco sólo con evidencia primaria compatible dentro de un corte acotado; sin evidencia conservar bloqueo y continuar otras familias fijas/ciclo/variables, no prolongar IRP indefinidamente. No pedir históricos privados ni valorar activos a partir de importes inventados.

## Ejecución, pruebas y consumo

Responsable único Codex, worktree físico `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, verificados antes de editar; cambios previos preservados. Inicio 1 octubre2026 18:05:26 MX, verificación 18:12:54; presupuesto12min, una reparación máxima, parar ante dependencia fiscal/alcance sin sustento. Una reparación de sintaxis del lector temporal PowerShell; falló antes de abrir archivo, no cambió fuente. Sin reparación de implementación. Se aplicó skill testing-strategy a integridad económica, no adopción y errores; sin build general ni prueba autenticada innecesaria para esta proyección local.

- **190/190 pruebas**: consolidado139, presupuesto30, registro21; ocho bases/APVD, extras separados, dependencias y seis outputs null, pins alterados y fuentes previas.
- Typecheck estricto PASS; 13 importes/celdas cotejados, cero diferencias; relaciones de pestañas verificadas.
- CLI salida2 esperada: 24 pins, 54 bases, pendientes FL/ID/NE/UT/VT, cero partidas completas/adopciones. No recorrido productivo/persistencia/autenticación/aceptación.

Recomendación OpenAI GPT-6.1 Sol medium para integración determinista. No mecanismo de cambio del principal usado: recomendación no demuestra modelo/esfuerzo efectivo; catálogo desktop es referencia disponible, no prueba de inferencia. Codex suficiente; Claude no recibió asignación/invocación. Fable evaluado para incertidumbre fiscal, pero faltan datos, no razonamiento especializado demostrado: no justifica doble consulta ni su uso sin evidencia de cuota/facturación. No llamadas auxiliares, agentes, wrappers o instalaciones.

Cuota Codex leída automáticamente por herramienta soportada al inicio 18:05 MX: semanal10080min **96% usado**, reposición 6oct2026 13:08 -06:00; ventana secundaria no disponible. Claude Max x5 declarado por usuario; ventanas cinco horas/semanal/Fable/extra/reposiciones desconocidas, sin evidencia manual fresca ni lector instalado. No reserva cuantificable por tarea: límite de tiempo/una reparación/contexto acotado, sin inferir bolsas independientes o ahorro monetario. Tokens, consumo de cuota atribuible y cargos del corte no observables; intento fallido no contado como cero consumo. Reutilización reduce trabajo esperado, ahorro no medido. Sin pagos/proveedores/IA de aplicación activados. Se mantiene modelo suficiente; no escalar para suplir datos faltantes.

## Rollback y límites

Quitar sólo pin/proyección/referencias `irpSeparableRegistration`, revertir expectativas y pruebas de este incremento para volver a46/13; preservar JSON/dossier como evidencia si se decide retirarlos del consolidado. No restaurar archivos enteros ni reset/checkout: contienen trabajo anterior. No archivos eliminados. Sin Auth/Supabase, Neon/DB/usuarios/migraciones, infraestructura, operaciones, commit/branch/PR/despliegue/producción ni llamadas facturables; no rollback externo.
