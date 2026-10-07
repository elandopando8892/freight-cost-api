# B2 · componentes IRP por peso y faltantes delimitados

Entrega local 2026-10-01, America/Mexico_City. Antes: 16 jurisdicciones con componentes sustentados. Ahora: **35**, al integrar 19 reglas de DC, MD, MA, MI, MN, MT, NH, NJ, NM, NY, NC, ND, OR, PA, RI, SD, VA, WA y WI. Pendientes: **24** (diez canadienses y catorce estadounidenses). Ningún componente representa por sí solo una tarifa completa vigente o factura real; cero adopciones y diez partidas completas de presupuesto siguen pendientes. CFU/CVU/precios null, no cierre B2/MVP.

## Benchmark, alcance y decisión previa

Se reutilizó la comparación del [benchmark consolidado](B2_IRP_CONSOLIDATED_RULES_2026-10-01.md) y el [lote anterior](B2_IRP_US_RULE_BATCH_2026-10-01.md), comprobando sus hashes y el árbol Git antes de editar. Adaptar reglas subyacentes oficiales reduce búsquedas repetidas; reconstruir cuotas desde facturas redondeadas sigue rechazado. Consultar cada jurisdicción por separado se reserva para cambios efectivos y dependencias no resueltas. No se sustituye el proceso diferencial binacional de dos tractores/un ciclo de caja ni se crea infraestructura nueva.

Fuente documental reutilizada: [IRP Fee Test Guidelines 2026](https://www.irponline.org/resource/collection/A35CA2A0-300D-4785-B21C-329509828DD9/2026_Fee_Test_Guidelines__06_08_26.xlsx). Original `sources/IRP_FEE_TEST_GUIDELINES_2026_REVIEW_20261001.xlsx`, SHA-256 `5db191bc435844030366c5edd0b44401b7f832f73edc67ef587b30475b3f9df1`. Su ejercicio usa referencia enero 2026; publicación junio no garantiza vigencia a octubre. No se efectuó refresh web ni se declaró tarifa actual. Localizadores, condiciones y conflictos están en `B2_IRP_US_WEIGHT_RULES_2026-10-01.json`, pin 21, SHA-256 `975648a038fb350e2ec03c8f48d34c4517e88fe7c3215f7b3a1e29f845ef3261`. Los originales y JSON previos permanecen sin modificación.

Objetivo del corte: integrar las reglas por peso con cargos separados, mantener los casos ambiguos fuera del cálculo y cotejar cada componente. Se conserva arquitectura/lector/consolidado existente y almacenamiento documental local, sin dependencia nueva. No cambia interfaz, flujo de usuario ni persistencia real; no requiere nuevo wireframe. El siguiente cambio de UI debe conservar manual MARKSMAN y wireframes.

## Interpretación económica y casos excluidos

- Maryland conserva base por miles de libras más cargo 10; Montana separa peso de fee-in-lieu y registro; Nueva York separa DHBTF; Pennsylvania mantiene ambos schedules; Washington separa freight y VSIF. Los extras se suman antes del reparto analítico, no se duplica cuota íntegra y factura ponderada.
- Minnesota conserva intervalo de años 2020–2026. Oregon conserva cuatro trimestres; no se generaliza una prorrata mensual a renovaciones parciales.
- North Carolina muestra participación 0.0169 que no reproduce su cuota reportada; se usa la base documentada con APVD, no ese porcentaje inconsistente. North Dakota reporta 18 frente a 17.95005 antes de redondeo: no se inventa una regla universal de factura.
- Cero en extras significa ausencia de otro componente adoptado, no otros gastos iguales a cero. Todas las jurisdicciones mantienen tarifa completa/vigencia no confirmadas, selección/aplicación al piloto falsas y redondeo de factura no acreditado.

Faltantes estadounidenses exactamente: CA, CO, FL, ID, KY, ME, MS, NE, NV, SC, UT, VT, WV, WY. Valor, año, precio de fábrica y excise son dependencias económicas, no datos faltantes a sustituir por el precio de anuncio. CO usa MSRP para usado; NV compara precio de fábrica y tabla; ME/WV/SC dependen de valor. ID tiene etiqueta privada bajo encabezado hire; VT contiene importes/porcentaje incompatibles; UT regla y reporte difieren; NE remite a otro archivo no conservado. Se guardan los hallazgos, no se adoptan. Canadá: AB, BC, MB, NB, NL, NS, ON, PE, QC, SK; no se convierte otra vez la columna USD del ejercicio.

El siguiente trabajo agrupado dentro de B2: moneda/reglas canadienses y cargos por valor, luego resolver discrepancias/vigencia/perfil/cargos para presupuesto completo. No abrir 24 sprints ni más validadores genéricos. El escenario sigue hipotético Texas/80,000 lb/doce meses, no registrante real; APVD no es capacidad productiva ni una participación por tramo de la ruta.

## Plan y ledger del corte

Inicio 17:34:17; presupuesto anunciado doce minutos, una reparación como máximo, parada tras cotejo/integración/notas. Responsable único: Codex, lectura/escritura/integración/verificación. Proveedor/modelo recomendado **OpenAI GPT-6.1 Sol, medium** para este lote verificable; elevar sólo ante razonamiento insuficiente en fórmulas ambiguas después de descartar falta de datos. Ejecución en el principal actual sin cambiar selector/modelo/esfuerzo. Catálogo desktop documenta low/medium/high/xhigh/max/ultra; no prueba inferencia ni acceso efectivo a un ID. Tokens/latencia de inferencia y cargos del corte no observables, sin estimación monetaria ficticia.

No se asignó Claude: cotejo determinista no aporta una pregunta independiente para segunda llamada. Fable no se seleccionó ni invocó; la exigencia acotada no justificó añadir otro contexto o revalidar condiciones para una llamada que no se haría. Claude Max x5 es declaración del usuario; cinco horas/semanal/Fable, uso extra y reposiciones siguen desconocidos, sin captura vigente/lector utilizado. No se accedió a credenciales, sesiones privadas, facturación ni mecanismos nuevos. La ausencia de evidencia bloquearía una llamada auxiliar, no este trabajo local suficiente en Codex.

Lectura automática soportada de cuota Codex (`get_usage_limits`) al inicio, entre 17:34:17 y 17:34:21: semanal 10,080 minutos **95% usado**, reposición 6 octubre 13:08:00 -06:00; ventana secundaria no disponible. No se publican identidad/balance de créditos ni se confunden unidades con USD. Cuota compartida puede variar por uso concurrente; la observación no mide consumo de esta tarea. Reserva por actividad no cuantificable: alcance y tiempo acotados, sin duplicar contexto/llamadas ni build general. Impacto relativo esperado menor que revisión auxiliar duplicada, no ahorro medido. Cero consultas auxiliares; no hubo intentos de modelo fallidos que ocultar. Sin llamadas facturables de aplicación/activación de cargos. Al cierre: no escalamiento ni reparación, continuar con modelo suficiente para cotejos y reevaluar sólo ante dependencia nueva.

## Verificación, recuperación y límites

- **151/151 pruebas**: consolidado 100, presupuesto 30 y registro 21. Diecinueve casos por jurisdicción, condiciones/contradicciones y conjunto exacto de 24 faltantes, además de hash/evidencia y límites de no adopción existentes.
- Typecheck estricto de consolidado/tests PASS; cero reparaciones. Pruebas después de la última modificación de código.
- Lectura independiente ZIP/XML: diecinueve relaciones nombre→hoja, veintiséis componentes en celdas originales y sumas de extras cotejadas, cero diferencias. No ejecución de macros/fórmulas.
- CLI: salida 2 esperada por economía incompleta, 21 pins, 35 componentes jurisdiccionales conocidos, 24 pendientes, cero partidas completas/cero adopciones y seis salidas null.
- `git diff --check` PASS, advertencias previas de CRLF no corregidas por estar fuera del alcance. Sólo evidencia pública/arimética local, sin recorrido autenticado, persistencia productiva, despliegue o aceptación operativa.

Worktree físico `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd` verificados. Cambios ajenos preservados; sin Auth, usuarios, DB, migraciones, Neon, infraestructura, producción, operaciones ni consumo IA de aplicación. Sin archivos eliminados.

Rollback por hunks: retirar pin/referencias `irpUsWeightRules`, unión/proyección del nuevo lote y pruebas añadidas; restaurar conjunto de 15 reglas previas más Texas, expectativa de 43 faltantes y conteo 16. Preservar este expediente/JSON antes de retirarlos. No restaurar archivos completos ni reset/checkout porque contienen trabajo previo. No requiere rollback externo.
