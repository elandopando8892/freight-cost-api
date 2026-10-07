# B2: inventario completo del modelo, no investigación de casetas

Entrega posterior a la solicitud «completa todos los trabajos»: [cierre local integrado y pendientes económicos](B2_CLOSEOUT_DELIVERY_2026-10-03.md).329pruebasPASS,82sondas nuevas, resolución estricta por linaje y reporte210/16. Cálculo completo demostrado con remainders sintéticos; público todavía incompleto. Este enlace no sustituye la evidencia histórica siguiente ni declara B2 cerrado.

## Corte vigente: reconstrucción de combustible/desgaste y seguro sin duplicación

3oct2026, cierre local posterior a la interrupción. Objetivo intacto: validar inventario, inclusiones y transformaciones económicas de las bases hasta CFU/CVU; no convertir cada caseta en otro proyecto. México DF–Fort Smith vía WTB, caja seca53′, relevo propio MX/US y una misma caja siguen siendo la aplicación de referencia. Este corte está probado; **B2 no está cerrado ni todo el inventario calibrado**.

### Revisión previa y decisión mínima

Se reutilizan seis políticas/fuentes fijadas de combustible, desgaste, FX y fluidos; el compositor mensual, el contrato CFU/CVU, el inventario y la política existente de responsabilidad extranjera. No se cambia de arquitectura, proveedor, motor heredado ni esquema de base de datos.

Alternativas evaluadas para seguro: adoptar un paquete combinado añade daños físicos ya contabilizados; presentar una prima doméstica como cotización extranjera oculta diferencias de población/territorio; conservar una sensibilidad pública explícita permite verificar la fórmula sin simular elegibilidad. Se elige la tercera, sin seleccionar un extremo por el usuario. [Full Coverage, publicación20mar2026](https://myfullcoverage.com/blog/primary-liability-insurance-for-truckers), reconsultada3oct2026, publica7500–12000USD/año para nuevos operadores Indiana2025 y5000–9000 para operadores experimentados; no publica muestra ni denominador inequívoco por tractor. Los cuatro extremos son sensibilidades, no límites estadísticos, promedio adoptado ni una póliza para tractor mexicano. La publicación separa responsabilidad de daños físicos/carga. No se consulta formulario, intermediario ni cotización privada.

### Qué funciona ahora

- Combustible carretera/desgaste se reconstruyen con políticas locales verificadas por SHA256 y el mismo ciclo declarado. Se rechazan cambios coherentes de precio, tasa o partición que antes podrían conservar sumatorias correctas. No se afirma medición independiente del ciclo ni consumo real.
- Ralentí y DEF se reconstruyen aparte: DEF sobre diésel carretera+reserva de ralentí una vez; consumo prorrateado, no compra de envase completo. Sensibilidades3/4/5%, separación mantenimiento/llantas y sustitución de mantenimiento US preservadas. No se recalibran los microinputs canónicos con agregados públicos.
- `foreignLiabilityAlternativeId` es opcional y acepta sólo cuatro IDs publicados o null. Omitido/null no selecciona prima ni añade lectura de esa política en el compositor mensual. El compositor completo conserva su validación habitual de fuentes.
- Una selección explícita añade una sola fila de seguro al presupuesto MX: anual/12, redondeado una vez a centavos.625/1000/416.67/750USD mensuales, respectivamente. El monto anual original y el cociente exacto se conservan por separado. No se interpreta5000.04 obtenido de12×416.67 como el importe publicado5000.
- La distribución al viaje es mensual×MAX(km del ciclo/km mensuales, días del ciclo/24). No se usa prima anual/365 como precio temporal ni se multiplica una prima anual por incursiones. Tractor US, caja, administración, salarios y las20 partidas CVU permanecen iguales.
- Política, identidad/hash del pin y cuatro extremos reconstruidos deben coincidir. Datos manipulados, selección desconocida, importe inyectado y duplicación de pin se rechazan. Financiación sustituye capital, no vuelve a cargar seguro.
- La fila pendiente de cobertura extranjera sigue null. Una prima homologada futura debe **sustituir** el proxy, nunca sumarse como segunda prima íntegra. Territorio, elegibilidad, límite, impuestos/cargos e historial no se dan por verificados. Tampoco se cierra cobertura de caja ni carga.

No cambia UI: no se produce otro wireframe artificial para este trabajo interno. B3 conserva wireframes y manual MARKSMAN para el flujo visible seleccionar/calcular/guardar/reabrir. No existe todavía entrega SaaS de esta opción.

### Pruebas ejecutadas y límites de evidencia

Antes de seguro, reconstrucción de combustible/fluidos:87 pruebas/3 archivosPASS. Después del último ajuste de pruebas del corte: **176 pruebas/7 archivosPASS,22.56s**. Mensual22, compositor63, responsabilidad11, fluidos11, variables18, presupuesto30 y proyección21. TSCestricto de seis archivos cambiados y sus dependencias:salida0. Una reparación diagnosticada: fixtures que intentaban asignar propiedades readonly ahora alteran deliberadamente su copia mediante descriptores. Primer TSC falló; no se oculta ese intento. Todas las suites afectadas se repitieron después. Advertencia heredada de API CJS de Vite, sin instalación o build global.

Cinco ejecuciones CLI completas posteriores al último código, cada una con DATABASE_URL/STAGING_DATABASE_URL ausentes del proceso hijo: salida2 esperada por incompletitud, no error ni estadoREADY.82pins, las tres alternativas explícitas ATRI/BLS/alimentos patronales conservadas. Sin sensibilidad extranjera: componentes parciales4816.210709853235USD/red y9645.151413785585USD/dedicado; no costos completos ni límites inferiores certificados.

| Sensibilidad anual pública | Mes USD | Adición CFU red USD | Adición CFU dedicado USD |
| --- | ---: | ---: | ---: |
| Nueva autoridad2025, extremo7500 | 625 | 79.72496744221428 | 213.431043701034 |
| Nueva autoridad2025, extremo12000 | 1000 | 127.55994790754255 | 341.48966992165424 |
| Experiencia2+, extremo5000 | 416.67 | 53.15040349463595 | 142.28850076625577 |
| Experiencia2+, extremo9000 | 750 | 95.66996093065711 | 256.1172524412409 |

Los CLI comprueban CVU idéntico y conteos de brechas idénticos contra el caso sin prima. CFU/CVU/costo completo permanecennull; quoteReady/calibrated=false; cero valores adoptados/escrituras externas. No se prueba operación real, consumo de camión, compra de seguro, persistencia SaaS ni calibración de210 campos. Sigue el diagnóstico previo de llantas; kernel sin cambios.

### Siguiente cierre por inventario, no por caseta

El readback distingue16 secciones y las brechas monetarias actuales; contar brechas no equivale a porcentaje de calibración:

- **8 de base:** alcance restante de permisos MX/US/caja; responsabilidad extranjera MX; territorio/custodia de caja; impuestos/activación/instalación del servicio administrativo; remanentes de costo patronal del operador MX; alojamiento/otros viajes MX.
- **4 del viaje:** peaje agregado MX, peaje agregado US, cruce agregado y servicios incrementales de relevo. Necesarios para una estimación completa, no para demostrar todas las fórmulas del inventario. No abrir un expediente por plaza.
- **1 del servicio:** valor/responsabilidad de mercancía y aplicabilidad de cobertura suplementaria. No elegir valor ficticio.

Próximo bloque: conciliar las ocho brechas de base por aplicabilidad, alcance incluido/excluido y benchmark público suficiente. Distinguir falta de input, regla metodológica y evidencia que una fuente pública no puede certificar. No mantener toda la validación del modelo detenida por una tarifa concreta, ni eliminar una brecha poniéndola en cero. B3 sólo después del criterio de cierre acordado, sin ampliar automáticamente el sprint o afirmar producción lista.

### Ejecutor, consumo y recuperación

Codex único escritor/integrador/verificador; elección humana6.1Sol/high2oct2026 16:46:22UTC conservada. Modelo/esfuerzo realmente servido del principal no observable; no se cambia selector por CLI. Claude alternativa no elegida, sin invocación; Fable no aporta una capacidad necesaria a este contraste determinista, acceso/cuota desconocidos. Ningún subagente. No cargos/API de IA, contratos, contactos ni proveedor facturable activados por este corte.

Lectura automática soportada3oct2026 16:41:13UTC: CodexPro permitido, semanal26%utilizado/10080min, reposiciónUnix1791580450; ventana5hnull/desconocida. Claude/Fable desconocidos. No se convierte saldo/créditos/tokens en cuota o ahorro. Presupuesto del tramo reanudado45min/hasta dos reparaciones locales, una usada; cero llamadas/reintentos auxiliares. Tokens atribuibles y cargos reales no observables. Evidencia anterior06:30 no se presenta como cuota vigente. No se repiten builds ni se instala lector.

D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd revalidados. Sin nuevas ramas/commits/despliegues/migraciones/Auth/DB/usuarios. SHA del kernel intacto3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b.

Rollback selectivo, nunca restaurar archivos completos del árbol sucio: retirar de `compose-public-pilot-cost` reconstrucción/metadatos de combustible y opción de responsabilidad; del compositor mensual la selección/fila/metadatos y explicación condicional; del helper sólo extracción del lector y constante, conservando el cálculo anterior; retirar las pruebas correspondientes y esta entrada documental. No hay estado externo que revertir. SHA previos al combustible: compositor público d28859c61ec1e37753f17e8ea20cde0451f6618199a0016927cc0be4b50856d6; test9d874eeb5005c1f3a8913b946f46f3badab03082af0ea0030e93bd21d9ddc93a. Previos al seguro: mensual26eb4d95b709d3a9427bc6415d2d02a1b3f54735930d3e47e1360417b0a99cbc; testmensual36f640b4d14104edeeed6a25ac6aa09e0a410506a25eff13bc0614e6a0340352. Conservar todos los cambios anteriores/ajenos. Checklist final: diff--check más revisión de espacios en los archivos no rastreados, pues diff--check no los cubre.

## Corte actual: fórmula de llantas contrastada y combinación ambigua bloqueada

3oct2026. El turno anterior fue aclaración de enfoque, no progreso de implementación. Este corte sí cambia la validación utilizada por el adaptador de benchmark y por D2D. No investiga plazas de peaje, cambia importes del piloto ni calibra el catálogo. Objetivo B2 completo intacto; México DF–Fort Smith sirve como aplicación del modelo, no como sustituto de su inventario económico.

Revisión previa: código y dependencias de `engine.outputs`, `benchmark-rates`, compositor D2D, readiness, inventario210/135, cierre por sección y módulo de ciclo de vida existentes. Se reutiliza `B2_MAINTENANCE_TIRES_REFERENCE_2026-09-30.json`, cuya frontera declara recape secuencial, no otra rueda. Se revalidó la explicación pública de [Bandag/Bridgestone](https://commercial.bridgestone.com.mx/es-mx/recursos/llantas-renovadas-101/ahorrando-con-renovados), líneas70–84: reemplaza banda sobre una carcasa y extiende su uso. También se consultó el programa [Michelin Million Mile Casing](https://business.michelinman.com/million-mile-casing); sus prestaciones comerciales no se trasladan al equipo del piloto. Ningún porcentaje comercial de ahorro, precio instalado, número de renovados o vida útil se adopta.

Alternativas: conservar la suma ambigua permite derivar CVU sin una frontera física comprobable; reescribir el motor/catálogo añade alcance y cambia compatibilidad histórica. Se elige adaptar la validación existente, conservar el motor heredado y reutilizar el ciclo de vida para una futura entrada explícita. El agregado público es una alternativa de planificación, no un gasto que se sume al ciclo detallado. No se exige información privada XBF para continuar con ese agregado.

### Resultado y criterios comprobados

- `deriveBenchmarkRates` devuelve INCOMPLETE/rates=null ante Qty Recapeadas positiva: el contrato no identifica si sustituye una posición instalada o corresponde a una etapa de carcasa. No borra el input ni lo vuelve cero. El error `RETREAD_POSITION_OR_LIFECYCLE_REQUIRED` se propaga a D2D, con costos completosnull.
- Cantidades físicas fraccionarias de dirección/tracción/remolque se rechazan, sin convertir equivalentes económicos de un agregado en número de ruedas.
- Con disposición explícita de cero recape adicional en fixtures exclusivamente sintéticos, el adaptador calcula cada posición con su propio Qty/PU/vida y excluye la caja de la pierna tractor-only. Se mantienen las12 dependencias canónicas, incluidas las tres de recape; cero no se adopta en ninguna base.
- El inventario y el cierre del piloto muestran una sonda ejecutada sobre el kernel real con precios sintéticos desiguales, hash de fuente y los12 campos. Observa Dirección→PU Dirección; Tracción→PU Recapeadas; Recapeadas→PU Remolque; Remolque→PU Tracción. Tres asociaciones difieren. La sonda no prueba calibración ni que la fila recape constituya una posición física válida.
- `priceBindingsEquivalent=false`, `methodsEquivalent=false` y `canonicalLifecycleBridgeComplete=false`. Corregir un PU no bastaría para probar equivalencia económica. El kernel heredado y sus resultados históricos no se modifican en este corte.

No hay UI nueva ni cambio de navegación: no corresponde otro wireframe. B3 conserva el requisito de wireframes MARKSMAN. Este corte no conecta automáticamente el módulo de ciclo de vida a una base ni hace una migración metodológica de cotizaciones guardadas.

### Evidencia final y límites

Baseline140 pruebas/cinco archivos. Tras el último cambio de código, **189 pruebas PASS/seis archivos**,35.04s: tasas25, D2D72, readiness26, inventario24, compositor público38 y ciclo de vida4. Nueve archivos TypeScript y dependencias pasan revisión estricta, salida0. Las pruebas de inventario siguen prohibiendo inicializar Prisma. Escenarios: MX/US, tractor-only/con-caja, recape ambiguo con/sin llantas nuevas, fracciones, PU propio, conservación de datos, propagación del error y límites de evidencia. Sin build global repetido ni instalaciones.

CLI reales de inventario y piloto después del último código, con DATABASE_URL/STAGING_DATABASE_URL eliminadas del entorno del proceso hijo: ambas salen2 por incompletitud económica esperada. Catálogo210/16, benchmark135, otras58 lecturas literales y17 sin lectura literal. Piloto con alternativas explícitas de mantenimiento US, operador US y alimentos patronales MX conserva82pins y sumas **parciales**4816.210709853235/9645.151413785585USD; no son costos completos ni límites inferiores certificados. Conserva ocho brechas de base, cuatro inputs agregados de viaje y una definición de mercancía en cada escenario. CFU/CVU/costo completo siguennull; calibrated/quoteReady=false, cero adopciones/escrituras externas. Procesos de pruebas/typecheck/readback terminados.

Codex único escritor/integrador/verificador; elección humana6.1Sol/high del2oct2026 16:46:22UTC conservada, modelo/esfuerzo principal servido no observable. Claude sería alternativa viable, no elegido ni invocado; Fable no aporta capacidad necesaria para este contraste determinista. Sin subagentes ni traslado de proyecto/datos. Cuota automática con reloj3oct2026 06:14:16UTC: CodexPro permitido, semanal23% utilizado/10080min, reposiciónUnix1791580450; ventana5hnull y Claude/Fable desconocidos. No estimación de cargos, ahorro o tokens atribuibles. Presupuesto45min/hasta dos reparaciones locales diagnosticadas, cero invocaciones/reintentos de IA auxiliar; no fallos de tests o compilación. Se conservan búsquedas con globs Windows fallidas, corregidas con `rg -g`, y un patch documental rechazado por contexto incorrecto, sin cambios: consumo no se declara cero.

### Recuperación y siguiente acción

Mismo D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14 y HEAD4f5fc2de0c3d178dace917231e1092040dec21fd. Kernel `engine.outputs` SHA3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b intacto respecto al inicio del corte. SHA previos: benchmark-rates5c8158c8446afaeeaf0afa80b972743ede071ccc453d437d2edbde4b03b2f2ee; su test94fe59df50fc9395082a6cd7a04583e422abe2dfbb291569bd4205e2a943ca5c; conciliadoreba0d476d71dbd34beade2a0ce2d92776a36b0dbc141213d5ebe863cf129a077; cierreporseccióne7b70591ae7d3c3d9c11a9e5089fe386fb22373c48e0479144af3d1f3a949a48. Rollback: retirar sólo contrato/guardas, sonda e imports/propiedades nuevos y sus tests/ajustes de fixtures; no restaurar archivos enteros del worktree sucio. Sin rollback externo: no commits/push/PR, ramas/worktrees/previews, despliegues, Auth/Neon/DB/usuarios/infraestructura, compras, contactos, tarifas de negocio ni APIs facturables.

**B2 continúa activo.** El inventario ya muestra esta frontera de fórmula y el cálculo canónico no pasa sobre ella silenciosamente. Falta comprobar equivalencias de las demás familias y cerrar suficiencia económica de LABOR MX, seguros, compliance y servicios; las entradas agregadas de viaje son una capa distinta. No declarar todo el inventario calibrado ni abrir un sprint por caseta o microinput.

## Resultado y objetivo

La revisión anterior cubría135 claves consumidas por el adaptador de benchmark. El catálogo completo contiene210, distribuidas en16 secciones. Las13 secciones solicitadas por el usuario no incluyen BORDER, CONFIG y COST_CROSSBORDER, que también intervienen en el modelo. Confundir esos alcances omitía supuestos operativos y políticas relevantes.

Ahora el [conciliador existente](../../apps/api/scripts/reconcile-economic-model-inventory.ts) conserva `canonicalInputMatrix` de135 y añade `completeCatalog` de210. Cada clave muestra campo/unidad, activación y comportamiento declarados en el catálogo, lectores de código con archivo/línea, destino económico, relación con evidencia de familia y estado de cobertura. No se exportan ni adoptan los valores predeterminados. La relación con una familia no acredita una cifra individual.

Objetivo B2 intacto: benchmark público → base operativa binacional → CFU/CVU por recurso → costo completo reproducible del piloto. México DF–Fort Smith es una comprobación de aplicación, no motivo para convertir cada plaza de peaje en un desarrollo. Este incremento resuelve una omisión de trazabilidad; no declara calibración económica, tarifa pactada, venta ni cierre B2.

## Revisión previa y alcance

Se releen catálogo, enumerador de dependencias, ADR009, conciliador y siete módulos existentes del motor. Se conserva la investigación fijada de79 expedientes y sus períodos; sin refrescar precios ni fuentes externas.

- Adoptar el inventario135 como descripción del adaptador, no de toda la aplicación: reutilizado sin alterar sus resultados históricos.
- Adaptar el conciliador con lectura estática del código mediante TypeScript5.9.3 ya instalado: elegido. No ejecuta el orquestador ni sus servicios, sin dependencia nueva o infraestructura.
- Rechazar ampliar el inventario a partir de defaults o ejecutar cotizaciones para descubrir cada lectura: introduciría falsa evidencia o efectos innecesarios.

Se añade un helper local de lectura con allowlist de siete archivos y control de ruta física dentro del módulo engine. Parseo AST, no búsqueda que cuente comentarios; fuente vacía/sin lectores o sintaxis inválida falla. Lecturas dinámicas y referencias fuera del catálogo se muestran como diagnósticos, no se esconden. HashSHA256 captura el código inspeccionado, no autentica el benchmark ni congela futuras versiones.

Fuente inspeccionada no prueba que una rama se ejecute en el piloto, que el parámetro esté vigente, que tenga evidencia suficiente o que su fórmula sea correcta. El destino económico de una clave no consumida por el adaptador es el papel de su sección/familia, no una fórmula individual ya validada (por ejemplo, una tarifa de detención requiere distinguir gasto del operador de cargo comercial). El escaneo no pretende cubrir lectores indirectos, validadores, toda la aplicación ni consumos fuera de esos siete módulos. No se infiere inactividad desde ausencia de lectura literal.

Flujo: fuentes económicas fijadas + registro + catálogo + código actual → conciliación de alcances → examen de fórmula y evidencia → cierre de brechas económicas por familia → ambos escenarios del piloto. Sin cambios UI; no corresponde un wireframe nuevo. B3 conserva wireframes MARKSMAN para el recorrido seleccionar/calcular/guardar/reabrir.

## Matriz de las13 secciones y las tres adicionales

Resultado observado:135 claves del benchmark,58 claves adicionales con lectura literal y17 sin lectura literal en los archivos revisados. Ninguno de esos contadores representa claves calibradas o bases listas. También se observan30 sitios de lectura del namespace FACTORS fuera del catálogo210; no se añaden ficticiamente a él ni se calibran sus multiplicadores.

| Sección | Catálogo | Benchmark | Otras con lectura literal | Otras sin lectura literal | Papel económico y condición de validación |
| --- | ---: | ---: | ---: | ---: | --- |
| COST_CAPITAL |13|11|2|0|CFU; horizonte, residual, propiedad y financiación compatibles. Dolly leído en otra rama, no caja adicional del piloto.|
| COST_COMPANY |46|46|0|0|CFU; canasta y alcance grupo/recurso, servicios y fiscalidad. No46 importes inventados desde un agregado.|
| COST_INSURANCE |3|3|0|0|CFU; prima/plazo más frontera real de territorios, custodia y responsabilidad.|
| COST_MAINT |31|31|0|0|CVU; agregado o detalle alternativos, sin duplicar lubricación, caja o DEF.|
| COST_PAYROLL |14|14|0|0|CFU; pool administrativo único, separado del operador y sus obligaciones.|
| COST_TIRES |12|12|0|0|CVU; agregado o ciclo de posiciones, no ambos. Lectura no acredita correspondencia aritmética.|
| FINANCE |7|6|0|1|Capital financiado reemplaza contado; FX fechado; inflación no se imputa tácitamente.|
| FUEL |7|4|3|0|CVU; precio/rendimiento/consumo, mezcla y buffer con ámbito explícito. Ralentí y DEF disjuntos.|
| GENERAL_BASE |6|5|1|0|Perfil, flota/capacidad y fronteras; gasto adicional de ruta es distinto del importe de peaje.|
| LABOR |7|3|0|4|Operador fijo/variable y viáticos; garantizar que la base elegida se integra y no se duplica.|
| RISK |7|0|3|4|Riesgo retenido/políticas aparte; no porcentaje automático para completar costo ordinario.|
| TECHNICAL_MARGIN |9|0|8|1|Compra/venta y margen separados del costo; no se obtienen del benchmark como costo.|
| UTILIZATION |20|0|16|4|Vacíos, tiempo y capacidad productiva por recurso; MAX y ciclo serial de una caja.|
| BORDER |4|0|1|3|Tiempo/cargos incrementales del servicio, no toda la economía de la base.|
| CONFIG |9|0|9|0|Ramas de equipo/modalidad, incluyendo drayage/tándem. Su lectura no las calibra para caja seca sencilla.|
| COST_CROSSBORDER |15|0|15|0|CFU de compliance/servicios y ámbito territorial; conservar componentes ya incluidos.|
| **Total** |**210**|**135**|**58**|**17**|**Inventario trazado, no210 valores calibrados.**|

## Las17 claves sin lectura literal no son17 investigaciones obligatorias

- LABOR: sueldo base MX, viáticos, team y hazmat. El compositor público ya trata remuneración y alimento MX por componentes; eso no prueba que editar esas claves canónicas afecte el cálculo. Team/hazmat pertenecen a perfiles distintos del piloto.
- FINANCE: Inflation Buffer. No se aplica automáticamente a series históricas ni se declara cero económico.
- UTILIZATION: Trailer Utilization, Truck Utilization Days, Free Time y Detention Rate. El piloto usa capacidad serial y24 días productivos mediante su contrato de exposición, no esas lecturas canónicas. Espera tiene efectos de capacidad y remuneración separados; no sumar costo de detención comercial como si fuese gasto observado.
- BORDER: Border Friction Time, Yard Transfer Cost e Inspection Delay Reserve. La exposición/cargos del piloto se documentan por componentes; importe o tiempo faltante no se elimina por ausencia de lector canónico.
- RISK: Tight Market Premium, Expedited Premium, Hazmat Premium y Weather Disruption Buffer. Distinguir riesgos operativos de primas comerciales y modalidades fuera del piloto; nada de porcentajes elegidos para rellenar huecos.
- TECHNICAL_MARGIN: Buy Market Weight. No es un input de costo productivo para B2.

El siguiente cierre económico debe justificar la inclusión, sustitución por una familia, exclusión de alcance o brecha de cada concepto relevante. No basta con que exista una pantalla, un valor en catálogo, una fuente relacionada o un lector de código.

## Hallazgo de fórmula: llantas

`engine.outputs.ts` conserva una permutación histórica V3 de precios entre tracción, recapeadas y remolque; `benchmark-rates.ts` calcula posiciones con su propio precio. Son caminos distintos. No se cambia esta compatibilidad ni se certifica su equivalencia en este corte.

Contraste sintético independiente: Qty dirección/tracción/remolque=1, Qty recapeadas=0; precios100/200/300/400 y vidas1000km; mantenimiento/reservas explícitamente0. Cálculo posicional `(100+200+400)/1000=0.7`; legado `0.6`. Importes sólo de prueba, no benchmark adoptado. Tener las12 claves trazadas no valida ambas fórmulas como si fueran idénticas. El piloto público mantiene sus tasas agregadas disjuntas; esta diferencia no cambia sus importes.

## Brechas reales para cerrar B2, no una cola de casetas

Readback del compositor con alternativa explícita ATRI2024 de mantenimiento, ambas exposiciones y las hipótesis fechadas ya documentadas:

- Seis remanentes fijos: permisos MX/US/caja; RC extranjera del tractor MX; territorio/custodia de caja; impuestos/instalación de servicios. Mantener los componentes ya conocidos, sin duplicarlos.
- Cinco conceptos parciales: operador MX, operador US, viáticos MX, peajes MX y cargos de puente.
- Tres conceptos sin importe: peajes US, servicios incrementales de relevo y cobertura suplementaria de mercancía según valor/responsable.

Son las brechas actuales de esos paquetes, no14 sprints adicionales ni85 investigaciones exigidas por el registro granular. Antes de retomar un cargo de viaje, cerrar la frontera económica por familia: incluido con soporte, hipótesis pública explícita o exclusión justificada; no cero por ausencia. Peajes/cargos son inputs agregados necesarios para el resultado completo, no requisito para validar el inventario o las fórmulas.

Este corte no cambia componentes monetarios. Sumas conocidas continúan4562.351292749036USD en vacío esperado de red y9030.407149808703USD en retorno vacío dedicado. **No son costos completos, tarifas ni límites inferiores certificados.** CFU/CVU/costo completo permanecen null, calibrated=false, quoteReady=false, cero adopciones. No se trasladan resultados entre bases: el piloto no calibra intercambio entre empresas, transbordo, drayage, local, intra-MX, reefer, hazmat o flatbed.

## Pruebas, ejecución y recuperación

Baseline18 pruebas de conciliación aprobado antes de editar. Pruebas nuevas: catálogo210 y conteos conservados; referencias a utilización/frontera/compliance/margen; comentarios frente a llamadas AST, referencias dinámicas/desconocidas, fuentes vacías/sintaxis/rutas no permitidas y discrepancia posicional de llantas. La prueba existente sigue prohibiendo inicializar Prisma. No se importa el orquestador ni se conecta una base.

Después del último cambio de código: **77 pruebas PASS/cuatro archivos**,23 conciliación,12 presupuesto mensual,21 composición pública y21 compositor por recursos;12.17s reportados. Typecheck estricto dirigido al conciliador/test/helper y dependencias: salida0. `git diff --check` salida0 con avisosLF/CRLF; los cuatro archivos de este corte, no versionados, se comprobaron aparte: cero espacios finales. No se atribuye a diff-check la revisión de archivos no versionados.

CLI real con DATABASE_URL/STAGING_DATABASE_URL ausentes: salida2 esperada por economía incompleta;210 claves/16 secciones,135 del benchmark,58 adicionales con lectores,17 sin lectura literal, siete fuentes de código,245 llamadas, cero lecturas dinámicas y30 llamadas fuera del catálogo.79 expedientes económicos intactos y todas las salidas completas null; cero adopciones/cambios externos. Readback separado del piloto confirma ambas exposiciones, los seis/cinco/tres remanentes y subtotales conocidos sin cambio. Todos los procesos de pruebas/typecheck/CLI terminados.

Alcance: inspección de fuentes actuales, regresión local de matemática/contratos y readback de investigación pública. No aceptación del carrier, calibración de cada microinput, persistencia, Auth, sesión, preview ni producción.

Codex único escritor/integrador/verificador; elección humana gpt6.1-sol/high del2oct2026 16:46:22UTC conservada. Modelo/esfuerzo principal efectivamente servido desconocido, no picker cambiado. Claude viable no elegido; Fable no es necesario para escaneo verificable ni resuelve falta de evidencia. Sin subagentes ni invocaciones auxiliares. Skills pruebas/documentación acotan verificaciones y separan trazabilidad de aprobación económica.

Cuota automática3oct2026 04:47:35UTC: CodexPro uso permitido, semanal18% utilizado/10080min, resetUnix1791580450; ventana5h, Claude/Fable, tokens/cargos atribuibles desconocidos. No porcentajes de ahorro o reserva inventados. Autorización global240h intacta; corte acotado45min, cero reintentos de proveedor, hasta dos reparaciones locales diagnosticadas antes de reevaluar. La primera lectura de un nombre inexistente `engine.service.ts` se conserva como intento fallido; luego se usa el inventario real de archivos. No inferir consumo cero.

Checkpoint local: cuatro archivos de este corte — helper, nuevos hunks de conciliador/test y este documento. Registro previo `us-economic-aggregate-coverage.json` terminal con writer_stopped_confirmed=true y lease_id=null, revalidado; no sesión Claude reanudada ni nuevo writer externo. No se crea un contrato headless para afirmar un cambio de modelo no observable.

Raíz físicaD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd revalidados. Sin ramas/worktrees/commit/PR/push/deploy, Auth/Neon/DB/usuarios/infraestructura ni operaciones de negocio; trabajo anterior preservado.

Rollback selectivo: retirar sólo nuevos hunks `completeCatalog` e import del conciliador, nuevas pruebas/imports del test y helper/documento si no tienen modificaciones posteriores. No restaurar archivos enteros ni borrar research ajeno. SHA previos: conciliador77b3e31ad5cae0519cf9b88f3d0145b692c9003eb55fb3ae17dda9a72c3d400d; test94bab71bac550c49995a44801853e2057e9fc07d8308fbbf07ee4de111d1b5a6. Sin rollback externo.

**B2 sigue activo:** trazabilidad completa del catálogo es una condición necesaria, no el cierre. La siguiente actividad útil es conciliar las fronteras económicas del piloto contra el inventario completo, empezando por compensación/viáticos y canasta fija, sin nuevas búsquedas de casetas individuales.

## Actualización: cierre por sección conectado al cálculo, 3oct2026

El turno anterior corrigió el enfoque pero no modificó la validación: se clasifica como no progreso de implementación. Este corte añade `modelSectionClosure` al compositor público existente, con un helper de auditoría y cinco pruebas. No crea otro motor, pantalla, base ni sprint por remanente. No cambia tasas, componentes monetarios ni opciones; vuelve verificable la separación de inventario, cobertura económica y datos de viaje.

Revisión previa proporcional: se inspeccionaron conciliador210/135, presupuesto mensual, compositor por recursos, compositor público, fórmula V3, adaptador de tasas y sus pruebas. Alternativas: continuar el inventario estático no mostraría qué parte del costo conserva una brecha; adaptar el compositor con una vista derivada y comprobaciones independientes fue elegido; construir otro motor o distribuir agregados entre microinputs fue descartado por duplicación y falsa calibración. Reutilización de los79 expedientes y de la alternativa de mantenimiento ya documentada; ninguna búsqueda nueva, refresco de precios ni llamada a proveedor.

Objetivo y criterio de cierre del corte: las16 secciones deben aparecer, contabilizando210 campos y135 dependencias del benchmark; cada gasto fijo y concepto variable debe tener un dueño monetario único; cada escenario debe separar brechas de base, del viaje y de alcance de servicio. Las sumas conocidas y MAX tiempo/distancia se recomputan, incluido el reparto por recurso en centavos y la cuota fija patronal fuera de administración/CVU. No se usa la existencia de una fuente, etiqueta o prueba como prueba de calibración individual. No hay cambio UI; B3 mantiene el requisito de wireframes MARKSMAN.

### Estado económico observado de las16 secciones

| Secciones | Qué demuestra este corte | Qué no demuestra / qué falta |
| --- | --- | --- |
| COST_CAPITAL, COST_PAYROLL | Componentes y una asignación monetaria por recurso; un pool administrativo. | No certifica bienes/FTE reales ni todos los microinputs. |
| FUEL, COST_MAINT, COST_TIRES | Componentes públicos integrados y disjuntos; mantenimiento US completo sólo en la alternativa de planificación seleccionada. | No consumo observado ni calibración por equipo. La permutación de llantas V3 sigue registrada, no reparada ni equivalente al adaptador. |
| LABOR | Cuota fija separada y valores variables conocidos conservados. | Tres fronteras: remuneración/cargas completas MX, US y viáticos MX. |
| COST_INSURANCE | Componentes de prima existentes, separados de mercancía. | Dos remanentes de base: RC extranjera tractor MX y territorio/custodia de caja; un alcance de mercancía pendiente. |
| COST_COMPANY | Canasta acotada, sin inventar46 precios. | Un remanente de impuestos/activación/instalación de los servicios seleccionados. |
| COST_CROSSBORDER | Permisos/compliance conocidos tienen un único dueño de costo, incluidas obligaciones domésticas. | Tres remanentes de permisos MX, US y caja. No duplicar componentes ya documentados. |
| GENERAL_BASE, BORDER | Perfil y entradas de viaje separados de la economía recurrente. | Cuatro entradas agregadas: peajes MX, peajes US, puente y servicios incrementales del relevo. No cuatro investigaciones de plazas. |
| FINANCE, UTILIZATION | Contexto de transformación: capital financiado sustituye contado; asignación MAX y capacidad por recurso. | No otra partida de capital/CFU; no deuda/FX futuro ni roster observado. |
| CONFIG | Perfil de caja seca/relevo conservado. | No calibra modalidades distintas ni todos sus campos. |
| RISK, TECHNICAL_MARGIN | Política de riesgo separada; compra/venta/margen fuera del costo productivo. | No riesgo cero ni porcentajes/márgenes inventados. |

En ambos escenarios, seleccionando `ATRI2024_ALL_RM_PLANNING`, la cobertura genera **nueve brechas de base, cuatro inputs de viaje y una definición de cobertura de mercancía**. Las nueve de base se concentran en cuatro grupos: LABOR3, COST_INSURANCE2, COST_CROSSBORDER3 y COST_COMPANY1. Son fronteras económicas pendientes, no nueve sprints. Sin seleccionar la alternativa ATRI, mantenimiento US conserva además su remanente de lubricación: diez brechas de base. Los contadores se derivan de los componentes actuales, no se copian de este texto.

Cada fila mantiene estado documental y fuentes/derivación; el agregado no se convierte en microvalores. FINANCE/UTILIZATION no vuelven a sumar gastos cuyos dueños son CAPITAL u otra sección. DEF tiene dueño FUEL y no un segundo importe en mantenimiento. La cuota fija del operador pertenece a LABOR, no al pool administrativo. Ausencia de brecha en una familia no implica que todos sus campos o fórmulas estén validados: `allIndividualFormulasValidated=false`, `matchedAssetCalibration=false` y cero adopciones en cada sección.

### Verificación final y límites

Baseline antes de editar:77 pruebas PASS en cuatro archivos. Se añaden cinco pruebas: cobertura16/210/135 y fronteras de validación; clasificación base/viaje/servicio; cambio de estado derivado al seleccionar mantenimiento; propiedad monetaria única; rechazo de sumas/escenarios/exposiciones/asignación por recurso alterados. Un caso conserva el total del pool pero desplaza1USD entre tractores y debe fallar: conservar la suma grupal no basta.

Después de la última modificación de código: **99 pruebas PASS/cinco archivos**,26 compositor público,23 inventario,12 presupuesto mensual,21 compositor por recursos y17 adaptador de tasas. Duración24.82s. Typecheck estricto dirigido: salida0. CLI real, sin DATABASE_URL/STAGING_DATABASE_URL, después de la última modificación: salida2 esperada;16 secciones/210 campos/135 dependencias,80 pins por alternativa de mantenimiento, nueve/cuatro/una brechas en ambos escenarios. Sumas conocidas4562.351292749036/9030.407149808703USD intactas; no son costos completos, tarifas o límites inferiores certificados. CFU/CVU/costo completo siguen null, `completeCostReady=false`, cero adopciones/escrituras externas. No se ejecutó una cotización de negocio ni persistencia.

La auditoría comprueba invariantes concretas de estos paquetes, no todas las fórmulas de la aplicación: un pool administrativo, un capital por recurso, conservación y reparto de centavos, MAX tiempo/distancia, cuota fija separada, identidad de los20 conceptos y sumas conocidas. La matriz mejora la validación y el orden de cierre; **no resuelve por sí misma las fronteras económicas pendientes ni cierra B2**.

Se conservan intentos fallidos: una ejecución inicial de Vitest apuntó a `apps/api/node_modules` inexistente, corregida a la dependencia instalada en la raíz sin instalar paquetes; una modificación posterior encontró un error de sintaxis por continuación de expresión, diagnosticado y reparado una vez. Se repitieron todas las pruebas afectadas y el typecheck después de esa reparación. Estos intentos no se declaran de consumo cero. La ejecución inicialmente correcta de99 pruebas antes de la última mejora no sustituye la ejecución final.

Codex único escritor/integrador/verificador; selección humana gpt6.1-sol/high vigente, runtime principal no observable. Claude/Sonnet sería alternativa viable para esta lógica local, pero no elegido: no se invoca ni se presupone cuota disponible. Fable no aporta una capacidad necesaria para estas verificaciones deterministas y no se consulta. Guías de pruebas/documentación utilizadas para separar evidencia matemática de suficiencia/calibración y acotar regresión. Cuota leída automáticamente en este corte: CodexPro permitido, semanal19% utilizado/10080min, resetUnix1791580450; ventana5h null/desconocida. Claude/Fable desconocidos, sin llamadas. Sello del registro3oct2026 05:24:24UTC; la herramienta de cuota no proporciona hora propia de la lectura. Tokens, cargos reales y consumo atribuible del plan no observables; ningún ahorro o equivalencia monetaria inventado. Presupuesto del corte45min, cero reintentos de proveedor y hasta dos reparaciones locales diagnosticadas; una reparación de código realizada.

Cambios locales en D:, misma rama/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd. Sin commits/push/PR, nuevos worktrees, despliegues, Auth/Neon/DB/usuarios/infraestructura, contactos, pagos ni consumo de IA mediante APIs. Todas las pruebas/typecheck/CLI terminaron. Rollback selectivo: retirar sólo import/call/propiedad `modelSectionClosure` del compositor, imports y cinco pruebas añadidas del test, helper si no tiene cambios posteriores, y esta actualización documental; no restaurar archivos enteros. SHA previos: compositor a6945c771b6f1b37cb15bf1b9ba33fad4cf3e100e1477e1c77ba7e9f7f0a4c05; test df4a916092d4acb494b2259a3168ac348bba9ff1a8c18d57f759a7b8e5605738; documento738b0d36d9b859db674818ba91b0d001f157ea9661c8093706ee1bfa26a41086. Helper nuevo, sin estado externo que revertir.

Siguiente trabajo útil: cerrar la suficiencia económica de LABOR (remuneración total y viáticos, no sólo salario por distancia) con las fuentes públicas pertinentes y supuestos de exposición pagada, conservando inclusiones para no omitir ni duplicar cargas/per diem. Después seguros/compliance y servicios. Los inputs agregados del viaje permanecen necesarios para la estimación completa, pero no dirigen el cierre de inventario/fórmulas. Sin declarar todo el catálogo calibrado ni trasladar el piloto a bases distintas.

## LABOR US: componente ordinario con benchmark público, 3oct2026

El corte previo sí fue progreso: conectó la matriz por sección al cálculo y verificó invariantes. Este corte mueve un componente económico real del modelo: añade la alternativa explícita `BLS2025_ECEC2026_MIE_PLANNING` para remuneración patronal ordinaria US y alimentos/incidentales, conservando por omisión `ATRI2024_MILEAGE_PARTIAL`. No toca el motor legado ni adopta valores en una base. El resultado sólo es una estimación bajo el alcance/hipótesis documentados, no nómina, contrato o operación observada.

### Benchmark previo y decisión

| Opción | Ajuste y límites | Decisión |
| --- | --- | --- |
| Conservar ATRI2024 por milla | Reutiliza fuente y alcance históricos; su agregado incluye per diem cuando reportado, sin separar esperas/cargas completas/bonos. | Conservado como alternativa reproducible parcial. |
| Agregar porcentajes/bonos/per diem encima de ATRI | No permite distinguir lo ya incluido; duplicaría cargas o asignaciones y no resuelve tiempo pagado. | Rechazado. |
| OEWS salario medio específico × factor patronal ECEC de grupo + asignación M&IE separada | Permite explicar remuneración y tiempo; diferencia de períodos/poblaciones y contrato horario son transferencias explícitas, no una observación conjunta. | Elegido sólo como alternativa pública ordinaria de planificación. |

Reutiliza el reloj US, exposición ordinaria, compositor y validator existentes. Gobierno público, sin licencia/dependencia/infraestructura nueva, cuotas API ni cargos de proveedor. Lo diferencial sigue siendo ensamblar una base binacional por recurso y fronteras de inclusión; no reconstruir estadísticas salariales, nómina o un motor fiscal.

Fuentes primarias verificadas por lector web3oct2026, con extractos y restricciones en [la política local](B2_US_DRIVER_HOURLY_PLANNING_2026-10-03.json):

- [BLS OEWS mayo2025, tabla1](https://www.bls.gov/news.release/archives/ocwage_05152026.htm): salario medio horario del operador de camión pesado/tractocamión28.71USD. Se usa la media horaria publicada, no mediana, salario anual/2080 ni costo total de empleador ya cargado.
- [BLS ECEC junio2026, tabla4](https://www.bls.gov/news.release/archives/ecec_09092026.htm): grupo ocupacional privado de transporte/materiales, total36.38USD/h y salarios24.97USD/h. No la fila de industria49.86USD/h, que mezcla otras ocupaciones. Factor total/salario conserva remuneración, vacaciones, primas/bonos, seguros, retiro y obligaciones en un solo sobre patronal; no se le suma otra carga. Diciembre2026 excluirá workers compensation: no reemplazar esta referencia sin revisar su frontera.
- [BLS conceptos ECEC](https://www.bls.gov/opub/hom/ecec/concepts.htm): costo por hora trabajada, incluyendo retorno vacío; no acredita habitación/comida ni on-call. El factor se transfiere de un grupo más amplio, sin afirmar que corresponda a una flota53ft, geografía local o contrato real.
- [IRS Notice2026-60](https://www.irs.gov/pub/irs-drop/n-26-60.pdf), secciones3/6, páginas impresas2/8: referencia80USD/día M&IE transporte CONUS, vigente desde1oct2026. Es referencia de substanciación fiscal, no obligación del transportista ni precio observado de alimentos. Se transfiere a una **política declarada de asignación**, no se calcula deducción, ahorro fiscal ni elegibilidad. No se agrega otro incidental5USD.

El expediente nuevo está fijado porSHA256 `d997a9837b3ea3859a2d13bbf5aa58b5dcc661cd05b8af29fa06e2d1512b7cd4`; ese hash protege el extracto/política local, no autentica originales BLS/IRS ni demuestra una factura. Se leyeron HTML primarios y texto primario PDF; las llamadas de screenshot del IRS no expusieron píxeles en esta superficie. No se declara inspección visual exitosa, archivo original descargado ni PDF creado/editado. Las guías PDF/pruebas/documentación llevaron a conservar esa limitación y distinguir aritmética, alcance económico y aceptación operativa.

### Supuestos y fórmula de integración

`costo_US = 28.71 × (36.38 /24.97) × horas_pagadas + 80 × bloques_24h_US_iniciados`

El costo patronal horario transferido resulta41.82898678414098USD/h. Períodos mayo2025/junio2026/efectividadM&IE1oct2026 permanecen separados; no inflación ni vigencia para una fecha de servicio real inventada.

Se modela una posición equivalente de operador US **empleado compensado por deberes horarios asignados**, sin garantía mensual adicional. Se pagan conducción nominal cargada/vacía, pausas declaradas, manejo terminal, relevo y espera de sincronización del reloj ordinario. No se paga como trabajo el descanso off-duty de movimiento ni la recuperación14h. El sobre patronal ya asigna vacaciones/primas/cargas promedio: no volver a sumar salarios de vacaciones, FICA, workers compensation, bonos ATRI u otros porcentajes. La espera pagada es hipótesis de este modelo, no precio benchmark de on-call ni registro duty/ELD. No se certifica roster, cumplimiento laboral semanal ni disponibilidad real.

Para viaje ordinario se declara descanso en cabina y ausencia de hotel rutinario. M&IE se aplica una vez por bloque24h de asignación US iniciado; el bloque es política de planeación, **no día calendario fiscal** ni descuento first/last-day. No se elimina la incertidumbre de alojamiento extraordinario, nuevas garantías, cambios de asignación o reembolsos reales. Si cambian esos límites, la alternativa deja de representar el alcance y debe revisarse, no asumir costo cero. El per diem no separado del agregado ATRI anterior se reemplaza junto con él; no queda sumado debajo de BLS.

El helper verifica identidad de ciclo/tractor/road-reference, distancia cargada/vacía, reloj ordinario, partición pagado/no pagado y suma salario/beneficios. Una espera omitida mientras el reloj sigue igual debe fallar. Sólo se sustituye `US_DRIVER_TOTAL`, con sus cuatro referencias US y derivación completa; fijos, cuota MX, DEF, mantenimiento, llantas y demás conceptos no cambian. Se añade un pin cuando se elige esta alternativa; con mantenimiento ATRI elegido son81, no79 expedientes calibrados.

| Escenario | Horas pagadas | Descanso no pagado, movimiento+recuperación | Remuneración patronal USD | Asignación M&IE USD | Componente ordinario US USD |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vacío esperado de red |17.07351084172169|27.5|714.1676593572643|160|874.1676593572643|
| Retorno vacío dedicado, misma caja |34.16861679179375|41|1429.2386202163184|320|1749.2386202163184|

En dedicado, las horas pagadas incluyen3.935283458460418h de sincronización; no son horas adicionales de conducción. Estos importes son componentes económicos del escenario público ordinario, no tarifas de transportista o montos de nómina. `DOCUMENTED_COMPONENT` significa cobertura de ese alcance declarado; `allCarrierTravelCovered=false`, `actualCarrierCompensationOrReimbursementObserved=false` y `calibrated=false` permanecen explícitos.

Suma de componentes conocidos, con mantenimiento y LABOR US elegidos:4787.092823737429USD/red y9579.636170025024USD/dedicado. Son sumas parciales, **no costos completos ni límites inferiores certificados**. La vista de cierre pasa de nueve a **ocho brechas de base**: LABOR MX/viáticos2, seguros2, permisos3 y servicios1; mantiene cuatro inputs agregados de viaje y una definición de mercancía. CFU/CVU/costo completo siguen null: B2 no se declara terminado.

### Pruebas, consumo y recuperación

Seis pruebas nuevas: aritmética pública independiente y descanso excluido; sustitución única y demás importes intactos; cobertura ordinaria sin falsa calibración/claim fiscal; opción legado preservada; política/período/fuentes/opción alterados rechazados; tiempo/distancia/espera inconsistente rechazados. Tras la última modificación de código, **147 pruebas PASS/siete archivos**:32 compositor público,23 inventario,12 mensual,21 compositor por recursos,17 tasas,28 exposición de ciclo y14 reloj ordinario;51.74s. Typecheck estricto dirigido salida0. No build global repetido.

CLI real final sin DATABASE_URL/STAGING_DATABASE_URL: salida2 esperada por economía todavía incompleta;81 pins, ambos componentes US `DOCUMENTED_COMPONENT`, sumas/horas de la tabla confirmadas, ocho/cuatro/una brechas, cero adopciones/escrituras externas. No persistencia, login, despliegue, producción o aceptación de carrier probados en este corte. Los procesos de pruebas/typecheck/CLI terminaron. La precisión mostrada sirve para reproducibilidad aritmética y no aumenta la precisión de estadísticas, precios, distancia o duración de las fuentes.

Codex único escritor/integrador/verificador, elección humana6.1Sol/high vigente; principal servido/esfuerzo efectivo no observable. Claude/Sonnet sigue candidato viable no elegido; Fable no es necesario para estas transformaciones verificables y no se invoca. Cuota automática con reloj inmediato3oct2026 05:28:44UTC: CodexPro permitido, semanal20% utilizado/10080min, reset1791580450;5h/Claude/Fable desconocidos. Ninguna lectura de sesiones privadas, API IA, facturación o consumo extra activado. Consumo/cargos atribuibles no observables; no comparación monetaria/porcentual inventada. Corte45min, cero reintentos de proveedor y hasta dos reparaciones locales; ninguna reparación por fallo de compilación/pruebas fue necesaria. Se corrigió durante lectura previa un import de tipo de nombre no existente antes de ejecutar; una inspección de metadatos de screenshot devolvió sólo texto y no se usa como prueba visual.

Cambios: nuevo helper/política, opción y sustitución acotada en compositor, seis pruebas y esta sección. Rollback: omitir `usDriverBasis` o seleccionar `ATRI2024_MILEAGE_PARTIAL` recupera los valores anteriores sin estado externo; revertir selectivamente sólo estos hunks y helper/política si no tienen cambios posteriores. SHA previos: compositor742350de18d061136247ceb697bc7010c87886ca189801783237628d5d2c47cb; test e1e719dcbbcfaf75650819cfa4d2a049e33a1c980de38106bd12b1e1b5c38f40. No restaurar archivos completos ni eliminar trabajo ajeno. Misma rama/HEAD y raíz D:; sin commits, branches/worktrees, PR/push/deploy, Auth/Neon/DB/usuarios/infraestructura, operaciones de negocio ni costos de proveedor activados.

Siguiente frontera económica: LABOR MX/viáticos (ingresos/cargas ya documentados, compensación de deberes y límites ordinarios pendientes), luego seguros/compliance/servicios. No retomar una investigación de cada caseta ni declarar calibrado el catálogo210 por cerrar un componente público.

## LABOR MX: alimentos y costo patronal incremental, 3oct2026

El corte anterior fue progreso: integró una alternativa monetaria de LABOR US. Este corte incorpora un importe que faltaba en el escenario MX, no sólo más documentación: el efecto de una asignación de alimentos sobre prestaciones y aportaciones patronales **si se modela como ingreso remunerativo**. La clasificación real no está demostrada por la oferta. El costo total B2 permanece incompleto; no se cambia el objetivo ni se declara cerrado LABOR MX.

### Comparación previa y alcance

1. Conservar los alimentos como partida de viaje con tratamiento patronal pendiente: alternativa histórica disponible, sin cambio de importes por omisión.
2. Añadir una carga social genérica o gravar todo al3%: rechazado. Ignora bases por persona, topes, prestaciones ya incluidas y la distinción entre integración federal y exenciones estatales.
3. Reutilizar el forecast MX para calcular el delta de una hipótesis remunerativa explícita: implementado, sin otro motor de nómina, dependencia, infraestructura, contacto con empleadores o cuota API. Benchmark y reglas estándares se adoptan como referencias; lo diferencial es su integración por recurso/ciclo, no reconstruir nómina fiscal.

Resultado esperado: coste incremental reproducible, directo de alimentos una sola vez, cuota fija/capacidad/administración sin cambio, y límites de aplicabilidad visibles. Cierre de este corte: aritmética independiente, ambos ciclos y ambas interpretaciones de descanso, rechazo de inconsistencias, CLI real local y regresión después de la última modificación. Sin cambio UI; no corresponde nuevo wireframe. B3 mantiene wireframes MARKSMAN para su recorrido SaaS.

Fuentes primarias re-leídas3oct2026 y registradas en [la política opcional](B2_MX_FOOD_EMPLOYER_PLANNING_2026-10-03.json):

- [Oferta del reclutador TIVUS](https://mx.indeed.com/viewjob?jk=050282e84f698f0c), líneas48-57: caja seca foránea, alimentos300MXN/día o2100/semana, separados del sueldo neto. Se reutiliza sólo la asignación de alimentos, no sueldo, bonos, instalaciones, convoy o cobertura laboral de esa empresa. Una oferta no equivale a promedio estadístico ni dato privado XBF.
- [LFT vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf), arts76/79/80/84/87/89/257-259, páginas impresas24-25/71: referencia de remuneraciones, prestaciones y bases. Se conserva la hipótesis previa de ingreso estable por día trabajado; no se certifica que el apoyo de esta oferta sea salario ni que el promedio financiero sea historial legal.
- [LSS vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf), arts27-30, páginas impresas10-12: integración de percepciones y exclusiones, límites y salario variable/mixto. Se conserva cálculo por persona, régimen inicial claseV y forecast medio anual, no declaración de SBC real. No aplicar además un porcentaje de alimentación en especie ni afirmar exención por alimentos onerosos.
- [Ley de Hacienda de Nuevo León](https://www.hcnl.gob.mx/trabajo_legislativo/leyes/leyes/ley_de_hacienda_del_estado_de_nuevo_leon/), arts154/156/157/160-I-f,g: se verificó el texto con exenciones, no sólo la tasa3%. Alimentos y viáticos efectivamente comprobados tienen fronteras distintas. La alternativa declara clasificación de alimentos exenta para el importe directo; los nuevos devengos salariales conservan el escenario3%. No inferir jurisdicción del itinerario ni acreditar una exención real por esta hipótesis.

Se leyeron texto primario y páginas relevantes completas, no se descargaron originales nuevos ni se realizó una nueva comprobación visual de PDFs. Las guías PDF/pruebas/documentación conservaron esa limitación y separaron las pruebas matemáticas de clasificación legal, calibración y uso operativo. El hash del nuevo JSON `1276b3df491fac11166cfd38428a55aa09658726e2397da253762e0b29c4be2c` fija extractos/política local, no autenticidad de documentos originales. Fuentes normativas archivadas previamente permanecen intactas.

### Qué cambia en el cálculo

Opción explícita `mxFoodEmployerBasis=REMUNERATIVE_FOOD_NL_EXEMPT_PLANNING`; por omisión `UNRESOLVED_FOOD_PAYROLL` conserva importes anteriores. Se reconstruye únicamente la exposición física que ya utilizó el reloj ordinario, se recalcula primero el forecast sin alimentos y se exige coincidencia con el payroll existente antes de añadirlos. Esto impide trasladar el forecast de otro reloj/denominador.

`alimentos_anuales = alimentos_del_ciclo × ciclos_compatibles_mes × 12`

`ingreso_diario_planeado = (salario_km_anual_con_descanso + alimentos_anuales) /306_días_productivos`

El ingreso de alimentos se reparte294/306 al operador principal y12/306 al relevo, manteniendo una sola posición ocupada. Se recalculan devengos de vacaciones/prima/aguinaldo/festivos y contribuciones por persona mediante el calculator existente, incluidos topes. Se declara descanso ya incluido en esta asignación: no añadir otra vez16.66% o2100semana. No gross-up por retenciones del trabajador.

`incremento_CVU_USD = (delta_devengos_mes + delta_aportaciones_mes + delta_ISN_mes) /FX /ciclos_compatibles_mes`

El importe directo de alimentos sigue exclusivamente en `MX_TRAVEL_EXPENSES`. El delta entra en `MX_DRIVER_TOTAL`. La cuota fija EM permanece en CFU y no cambia; no se modifica el pool administrativo ni otro concepto monetario. En NL el importe directo de alimentos queda fuera del escenario ISN por la clasificación declarada160-I-g; los devengos adicionales conservan3%. Integrar una percepción al proxy federal no implica gravarla automáticamente por ISN, y la exención estatal no prueba exención federal.

| Escenario | Alimentos directos MXN | Incremento patronal USD/ciclo | Suma parcial conocida USD |
| --- | ---: | ---: | ---: |
| Vacío esperado de red |1200|29.11788611580608|4816.210709853235|
| Retorno vacío dedicado, misma caja |2700|65.51524376056359|9645.151413785585|

Tabla para caja neto+IVA/contado, descanso excluido de tarifa km, mantenimiento ATRI y alternativa LABOR US anteriores. No costos completos, tarifas o límites inferiores. CFU conocido conserva984.4714555231577/2242.4437705723003USD; ambos componentes MX permanecen `DOCUMENTED_PARTIAL`. Se mantienen ocho brechas de base, cuatro inputs agregados de viaje y una definición de mercancía: cuantificar un faltante dentro de una familia no autoriza cerrar toda la familia. Outputs completos null, adopciones0, escrituras externasfalse.

### Validación y límites

Seis pruebas nuevas: fórmula independiente con ambas interpretaciones de descanso; alimentos una vez y otros importes intactos; estado parcial sin convertir PTU/alojamiento en cero; alternativa omitida intacta y entradas sin mutación; política/fuentes/opción/exención alteradas rechazadas; reloj/días/FX/identidades/payroll inconsistentes rechazados. **127pruebas PASS/seis archivos**,45.68s:38 compositor público,28 forecast MX,21 variable MX,14 jornada ordinaria,14 suplementos y12 mensual. Typecheck estricto dirigido salida0. Todas esas ejecuciones terminaron, después de la última modificación de código; no build global redundante.

CLI real con las tres alternativas nuevas, sin DATABASE_URL/STAGING_DATABASE_URL: salida2 esperada por economía incompleta,82pins, importes de tabla confirmados, alimentos no duplicados, fijos invariantes y outputs completosnull. Pruebas deterministas sobre fuentes/hipótesis públicas, no nómina real, fiscalización, cuenta autenticada, persistencia, UI, operación de carrier o aceptación de producción.

No declarar que el apoyo sea reembolso comprobado o remuneración real. El estado parcial conserva PTU/prestaciones adicionales, alojamiento/demoras aplicables y obligaciones fuera del supuesto ordinario. La revisión local confirmó que el expediente del tractor MX seleccionado no establece tamaño/existencia de litera; no cerrar alojamiento afirmando que ese tractor ya tiene sleeper comprobado. La referencia de instalaciones del empleador TIVUS tampoco se trasplanta al piloto. Próxima acción económica: resolver alojamiento/compensación ordinaria compatible o conservar su frontera explícita y avanzar seguros/compliance/servicios, sin microinvestigar tarifas de casetas.

### Responsable, consumo y recuperación

Codex único investigador/escritor/integrador/verificador. Elección humana6.1Sol/high conservada; principal servido/esfuerzo efectivo no observable. Claude/Sonnet sería viable para estas transformaciones, pero cambiar escritor requeriría traslado de contexto sin ventaja demostrada y no fue elegido; no se invoca. Fable no requiere capacidad adicional para este delta verificable y no se consulta. Guía claude-review usada para respetar elección/escritor único, no para lanzar una consulta auxiliar.

Cuota automática y reloj inmediato3oct2026 05:50:02UTC: CodexPro permitido, semanal21% utilizado/10080min, reset1791580450. Ventana5hnull/desconocida; Claude5h/semana/Fable desconocidos. Tokens/razonamiento/caché/cargos y consumo atribuible no observables; no se convierten cuotas a dinero ni se garantiza ahorro. Corte hasta45min, cero llamadas/reintentos de proveedor auxiliar y hasta dos reparaciones locales diagnosticadas; ningún fallo de tests o compilación. Una búsqueda local usó globs como argumentos en PowerShell y falló; corregida a filtros `rg -g` sin repetir builds ni instalar herramientas. No tratar ese intento como consumo cero.

Raíz D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd y topología revalidados antes de editar. SHA previos: forecastdc65a4cf150f38a52021910e0e64c029828b62dd7f86ae9892b0d33140cf515d; compositord7cf5de6e8b413fa2c85b2df799e074ee74ab5bc0fe5d6b5a01fa49a2e440841; test3cf4477cc888f222e576f7ef8e5063e4a972872beb24d617251a2000289cc19c. Nuevos helper y política, más hunks acotados en forecast/compositor/tests y esta sección. Rollback monetario: omitir `mxFoodEmployerBasis` o elegir `UNRESOLVED_FOOD_PAYROLL`. Rollback de código: revertir sólo esos hunks, helper/política si no tienen cambios posteriores; nunca archivos completos del worktree sucio. Sin commits/push/PR, ramas/worktrees/previews nuevos, despliegue, Auth/Neon/DB/usuarios/infraestructura, operaciones de negocio ni servicios facturables.
