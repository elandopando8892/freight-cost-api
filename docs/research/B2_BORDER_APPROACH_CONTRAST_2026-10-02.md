# B2 · aproximaciones y contraste postal US

Investigación 2oct2026–3oct2026 UTC. Referencia económica pública, no selección de patios, transportista o fecha de servicio. Continúa el contrato B2 autorizado hasta240h; no activa gastos ni despliegues.

## Resultado utilizable

El contraste público entre **18702 Metropolitan Road, Laredo TX78045** y el resultado postal **72916, Fort Smith AR** devolvió **734.4mi /11h37min**, con Commercial Truck seleccionado y Calculate Route, no Optimize Route. El origen es el domicilio público de Outpost; el destino es el punto representativo del código postal, no el domicilio de entrega. El proveedor advierte que no garantiza restricciones de altura, peso o circulación comercial. No certifica caja53′, HOS, acceso de patio ni ruta ejecutable.

Frente a708mi/680min urbanos del escenario vigente: **+26.4mi =42.4866816km, +17min**. Es un candidato más específico para contrastar el piloto, no sustitución automática del escenario.

Reutilizando exclusivamente las tasas ya documentadas en `reference-pilot-variable.ts` y sus fuentes fijadas:

| Componente US | Fórmula del incremento de ida | USD |
|---|---|---:|
| Diésel | 26.4mi ×5.955USD/gal ÷7.9mpg |19.90025316|
| Mantenimiento compuesto |26.4 ×0.212USD/mi|5.5968|
| Llantas compuestas |26.4 ×0.048USD/mi|1.2672|
| Remuneración reportada |26.4 ×0.817USD/mi|21.5688|
| Subtotal de esos componentes |suma|48.33305316|

Red con vacío esperado7.61% del kilometraje total: subtotal ÷0.9239 = **52.31416080USD**. Dedicado con retorno vacío simétrico: subtotal ×2 = **96.66610633USD**. Son sensibilidades de componentes, **no incremento completo de CVU o de costo D2D**: DEF, ralentí, jornadas, productividad, CFU, impuestos, peajes y aproximación fronteriza requieren recomposición compatible. Simetría de retorno y rendimiento constante son hipótesis existentes, no mediciones. No se añade salario ECEC ni caja variable separada a las tasas compuestas.

## Acceso fronterizo: no confundir tramos

1. El original de [concesión SCT](https://micrs.sct.gob.mx/images/DireccionesGrales/DGDC/Titulos/doctos/16.pdf), página2 AntecedenteVI, describe carretera0+000 a El Canelo5+640, enlace con Federal2. Página3 describe **parte mexicana** del puente297.5m y8carriles. No convertir297.5m en longitud patio–patio ni presumir que cubre toda la infraestructura binacional. Documento histórico, no prueba de configuración actual.
2. El detalle SAKBE existente termina con5,242.69m de carretera PuenteIII, retornoU55.86m y195.94m sobre esa carretera. Por tanto **ya contiene aproximación mexicana**, pero no prueba tránsito internacional. Añadir5.640km completos al recorrido1124.57642095km duplicaría parte del acceso.
3. El [plano TxDOT de abril2026](https://ftp.txdot.gov/pub/txdot/get-involved/lrd/world-trade-bridge/042126-location-map.pdf), revisado visualmente, distingue existente y ampliación propuesta. La longitud propuesta del nuevo puente no es distancia vigente del retorno bobtail.
4. La [agenda pública de Laredo](https://www.cityoflaredo.com/home/showpublisheddocument/16838/638639978602870000), ítem4, identifica acceso desde Riverbank a **carriles de salida**. No tratar la ruta automática a una oficina715Bob Bullock como entrada de carga sin verificar sentido. La agenda no demuestra cierre, permiso o ejecución de obra.

## Reutilización: decisión y límite de la prueba

| Alternativa | Evidencia observada | Decisión |
|---|---|---|
| [Freight Sidekick](https://freightsidekick.com/tools/route-planner) público | Sin cuenta; cálculo y optimización separados; perfil comercial con advertencia; postal72916 resolvió | Adoptar sólo contraste US; no integrar proveedor ni emitir cotización |
| Mismo planificador transfronterizo | SIMACO/NuevoLaredo ofreció coincidencias estadounidenses/PR, no el patio mexicano. El POI WorldTrade se ubicó sobre el ladoUS, no prueba travesía | No usar sus5mi/14min al POI como longitud del cruce ni completar país con resultado ajeno |
| [TruckRouter](https://www.truckrouter.com/Web/Info/Terms.php) | Términos17jun2026 restringen herramientas automatizadas fuera de API autorizada; requiere cuenta | No automatizar ni crear cuenta |
| SAKBE y cliente Google existentes | SAKBE aporta tramoMX; DRIVE Google es candidato sin certificación | Reutilizar fuentes; sin nuevo router o infraestructura |

[Términos FSK](https://freightsidekick.com/terms), efectivos10sep2026, revisados; no cuenta, acuerdo firmado, chatAllison, IA, solicitud de tarifa, correo, contratación ni reserva. Dos cálculos de ruta públicos; cero optimizaciones y cero llamadas Maps Platform con clave. Observaciones de UI, no prueba de servicio autenticado o circulación real. No se retiene polilínea, instrucciones cartográficas ni identidad de cuenta.

## Evidencia, ejecución y continuidad

Original SCT archivado intacto como `docs/research/sources/SCT_NLDIII_CONCESSION_20261002.pdf`; SHA256 `e24d28d60122e26b56c3f1689a780e5f0caea2700087dc10de4c9b6a6f2fac17`. PDF13p; inspección visual de páginas1–3 para las afirmaciones indicadas, no lectura íntegra atribuida. Skill PDF usada para distinguir geometría histórica y propuesta. TxDOT plano descargado/inspeccionado temporalmente; PDF general de inventario404 y planmaestroCity403 no recuperados. Fallos conservados, no consumo cero. El cálculo postal conserva menor precisión que una dirección de destino.

Codex único escritor/verificador, elección humana `gpt-6.1-sol/high` de2oct16:46:22UTC; runtime y cuota5h/semanal desconocidos, no selector cambiado. Sonnet/Fable no se invocan: el problema es cobertura de fuente, no falta de capacidad de razonamiento. Skill claude-review sólo registra contrato/lease, sin inferencia auxiliar. Alcance de este corte: investigación focalizada, contraste aritmético local; cero reintentos de proveedor y hasta2 reparaciones locales, no investigación indefinida de nuevas herramientas.

Workspace D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD4f5fc2de0c3d178dace917231e1092040dec21fd. Lease402a324b3f2c49018e4f949087601d68 sólo sobre este documento y originalSCT. Fuente y aritmética verificadas; no código ni pins económicos cambiados. No atribuir pruebas75PASS del corte anterior a este corte. No DB/Auth/usuarios/Neon/migración/infra/producción/deploy/commit.

Verificación local final: PASS de las3 identidades aritméticas y hashes del originalSCT, consolidado y `benchmark-binational-reference-budget.test.ts` (este último `d5dcc6922e13ab956e7d03e2a7c79b039b09123007dd5d0269536bf37eda3b2b`). `git diff --check` PASS, avisosCRLF previos. Primer readback apuntó al test `benchmark-binational-budget.test.ts`, distinto archivo; se corrigió el identificador, no el test ni su hash. Preparación de contrato inicialmente rechazó argv de pruebas vacío; corregido antes de claim, sin ejecución de modelo ni edición fuera de lease. No hay comandos/procesos pendientes; consumo de investigación y cuota no observable.

Siguiente: recomponer extremos físicos y sensibilidad del reloj/CFU con este contrasteUS; completar aproximación MX y bobtail sin duplicar SAKBE. Las salidas completas del consolidado siguen null: **B2 no está cerrado**. Los datos reales aún ausentes no se convierten en cero; las hipótesis prospectivas se muestran separadas de observaciones.

Rollback selectivo: retirar sólo estos dos nuevos artefactos si no tienen cambios posteriores; conservar íntegros código, investigación anterior, archivos ajenos y fuentes previas. Sin reset/checkout general.
