# B2 — Reserva anual de responsabilidad primaria: escenarios públicos

2026-10-03 UTC. Workspace físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Se conserva el estado sucio previo; no hay commit, despliegue ni operación externa. Turno anterior clasificado como progreso: agregó y verificó sensibilidad de desgaste bobtail. Este corte aporta importes condicionales a CFU, pero **B2 continúa activo y sin estimación D2D completa**.

## Antes y ahora

Antes había exposición de seguro fronterizo, pero no una reserva monetaria. Ahora se puede contrastar una reserva anual de responsabilidad civil primaria con datos públicos domésticos US, explícitamente no compatibles con un transportista mexicano asegurado. No es una prima extranjera observada, una póliza ni una garantía de cobertura. El costo real fronterizo sigue null. No se inventa precio por 24 h a partir de anual/365.

Se integra sobre la etapa previa de desgaste bobtail. Conserva 8 bases de contado y 128 financiadas, con 4 alternativas de responsabilidad y 2 primas alternativas de caja: 1,088 comparaciones. Los nuevos importes pertenecen a CFU; CVU no cambia. Caja, US, administración y daños propios no se cobran otra vez. Las alternativas de impuestos del patio también conservan sus sumas actualizadas.

## Benchmark y decisión

Revisión primaria por lector web, no formularios ni solicitudes de cotización. No se archivaron estas páginas como HTML: el pin conserva la ficha y su interpretación fechada, no un supuesto original descargado. Referencias:

| Alternativa | Evidencia concreta | Decisión |
| --- | --- | --- |
| Programa comercial extranjero QPI | [Producto Crossborder](https://www.qualitaspremier.com/Home/Products?lang=en) delimita vehículos MX que entran en US; no publica prima compatible | Mantener precio real sin resolver |
| Reserva por responsabilidad primaria US separada | [Full Coverage](https://myfullcoverage.com/blog/primary-liability-insurance-for-truckers), publicación 20/mar/2026, distingue primas anuales de nueva autoridad Indiana en 2025 y operadores experimentados; excluye daños propios/carga | Adaptar sólo como escenarios monetarios no compatibles |
| Precio combinado o ambiguo | [Progressive](https://www.progressivecommercial.com/commercial-auto-insurance/primary-liability-insurance/) remite a precio combinado. [Strong Tie](https://www.strongtieinsurance.com/company-driver-vs-owner-operator-who-is-responsible-for-what-coverage/) presenta rangos 8,000–16,000 y 5,000–12,000 para scopes no conciliados en el mismo texto | Rechazar para aislar una prima extranjera |

La fuente elegida publica 7,500–12,000 USD/año para nueva autoridad Indiana, periodo 2025; 5,000–9,000 para experimentados con registro limpio y dos años o más, sin periodo individual explicitado. No publica tamaño de muestra ni denominador inequívoco por tractor. Se trasladan a **un pool anual de planificación para el tractor MX**, no se afirma un promedio por unidad observado. No se mezclan cohortes, selecciona antigüedad del piloto, inventan tasas extranjeras o actualizan cifras por inflación. Los extremos no son límites de mercado ni probabilidades.

Ni domicilio extranjero, zona comercial, límites contratados, cantidad de vehículos, impuestos/fees ni aceptación están conciliados con el piloto. Es una reserva de comparación bajo hipótesis. No se suman bobtail/NTL personal, mercancía, casco ni seguro temporal: el bobtail del piloto es una tarea comercial y no se convierte en uso personal por no llevar caja.

## Fórmula y resultados reproducibles

`CFU_reserva = pool_anual_USD × MAX(km_MX_ciclo/km_MX_mensual, días_MX_ciclo/24) / 12`.

Se reutiliza la exposición fronteriza existente. No se multiplica por incursiones, por cada cruce, país, tractor US o financiamiento. Hipótesis anual y temporal son alternativas excluyentes. No se deriva un supuesto precio temporal ni una recomendación de compra para una flota.

| Escenario | Fracción anual MX | Nueva autoridad: extremos CFU USD | Experimentado: extremos CFU USD |
| --- | ---: | ---: | ---: |
| Red con vacío esperado | 0.010629995658961887 | 79.72496744221415 / 127.55994790754264 | 53.14997829480943 / 95.66996093065698 |
| Retorno dedicado misma caja | 0.028457472493471195 | 213.43104370103396 / 341.48966992165435 | 142.287362467356 / 256.11725244124074 |

Usar sexta opción `PUBLIC_US_PRIMARY_LIABILITY_PROXY` en el consolidado requiere cuarta `PUBLIC_LINK_FORECAST` y tercera `POSTAL_REFERENCE`. La sexta por defecto `UNPRICED` conserva los importes previos; la prima desconocida no se convierte en cero. La salida conectada se llama `supportingCrossborderLiabilityForecast`. La quinta opción permite conservar la sensibilidad de desgaste del corte anterior, no adoptar un costo calibrado.

```powershell
& 'C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --import tsx -e "const {consolidateBinationalReferenceBudget:run}=require('./apps/api/scripts/consolidate-binational-reference-budget.ts'); console.log(JSON.stringify(run(undefined,undefined,'POSTAL_REFERENCE','PUBLIC_LINK_FORECAST','IMT_C3_NON_ARTICULATED_PROXY','PUBLIC_US_PRIMARY_LIABILITY_PROXY').supportingCrossborderLiabilityForecast,null,2))"
```

Ejemplo: contado NET_PLUS_VAT, pago MX RATE_EXCLUDES_WEEKLY_REST, patio NET_PLUS_VAT_RESERVE, prima caja PUBLIC_GUIDE_LOW, desgaste C3 activo. Suma conocida con reserva por nueva autoridad: red 4,653.203195149368 / 4,701.038175614697 USD; dedicado 9,264.397351380067 / 9,392.455977600688 USD. **No son costos D2D completos, límites inferiores, compra o venta.** Fuente extranjera real, cargo y peajes siguen sin resolver. Los seis outputs completos de raíz permanecen null; siete indicadores externos false.

## Verificación y permisos

312 pruebas PASS / 6 archivos: reserva (11), consolidado (238), exposición fronteriza (11), bobtail (12), cargo (26), jornada ordinaria (14). Primera corrida correcta; sin reparación de implementación ni reintento automático. Typecheck estricto ESNext/Bundler PASS de módulo, consolidado y dos tests. Readback: 79 pins, 78 previos intactos, variantes monetarias y outputs null verificados; git diff --check PASS con advertencias CRLF preexistentes. Los archivos untracked se revisan adicionalmente por lectura, tipos y ejecución, no sólo por git diff.

Se comprueban default sin precio, fuente alterada, duplicados, doble aplicación, anual/mes inconsistente, joins contado/financiado, totals impuestos posteriores a bobtail, periodos inventados, precios adulterados, aprobación falsa y datos inmutables. No se abre conexión a DB, modifica Auth/usuarios/Neon/infraestructura, genera política ni contacta corredor. No se ejecuta frontend o SaaS: no se atribuye UI, persistencia, prueba autenticada ni aceptación productiva. Sin interfaz nueva, no se requiere un wireframe nuevo para esta fórmula.

Durante inspección hubo dos errores de diagnóstico: un glob de rg incompatible con Windows se sustituyó por -g, y una ruta de test supuesta se localizó con rg --files. No se repitieron inferencias auxiliares; el uso de esos fallos es desconocido, no consumo cero. El primer barrido de búsqueda devolvió muchas fuentes no pertinentes: no se adoptan snippets de pólizas particulares ni datos personales. No se abrieron formularios, cotizadores con identidad, documentos de pólizas individuales ni portales privados.

## Ejecutor y presupuesto

Responsable implementación/integración/verificación: Codex, único escritor. Elección humana de B2 2026-10-02T16:46:22Z: gpt-6.1-sol / high, máximo global autorizado 240 h; no deadline obligatorio por corte ni programación. Runtime principal no observable; no se afirma cambio de selector ni modelo efectivo. La skill claude-review se usó sólo para continuidad de elección, snapshot y lease acotado, no para invocar Claude.

Comparación de ejecutor: Codex conserva el contexto verificado y pruebas de la misma cadena; Sonnet 5.5 / medium sería candidato para integrar esta función aislada pero no fue elegido ni invocado. Fable no resuelve el faltante de prima extranjera publicada y no aporta beneficio demostrado que justifique otra llamada. Acceso y cuota de Claude/Fable en este proyecto desconocidos; no se prueba acceso con inferencia. No se duplica implementación ni se registra ahorro porcentual inventado.

Lectura automática soportada Codex 2026-10-03T01:26:05Z: ordinaryUsageAllowed=true, semanal 10,080 min usada 11%, reposición Unix 1791580450, cinco horas no informadas. Esta lectura es evidencia inicial, no consumo atribuible ni estado final. Claude cinco horas/semanal y Fable desconocidos. Créditos observados no autorizan gasto. Límites: máximo 80 pasos, paquete auxiliar máximo 6,000 bytes no transmitido, reintentos automáticos cero, máximo dos reparaciones antes de inspeccionar. Aquí cero reparaciones de implementación; tokens/costo/cuota por actividad no observables.

## Rollback y siguiente paso

Rollback funcional: omitir sexta opción o seleccionar UNPRICED. Rollback de archivos si se solicita: retirar sólo import, pin, llamada, salida y sexto argumento nuevos del consolidado; volver contador esperado 78; retirar módulo/test/ficha/documento nuevos, preservando todos los cambios anteriores. No se ha eliminado nada ni se necesita migración o rollback externo.

Continuar con la alternativa de seguro por valor de mercancía, con importe por embarque una vez y scope explícito de transportista frente a cargador; después, peajes pendientes y el resultado económico completo. Mantener la responsabilidad extranjera real sin precio hasta mejor evidencia; estos importes sólo prueban el impacto de la hipótesis presupuestal. No declarar B2 cerrado por una suma parcial o por tests verdes.
