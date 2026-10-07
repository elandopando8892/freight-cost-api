# B2: componentes variables conectados a la distancia mexicana

Revisión:1oct2026,22:27MX. **B2 continúa abierto**. Entregable del corte: subtotal numérico reproducible de componentes seleccionados del modelo público IMT, extendido sobre la distancia candidata MX. No es CVU completo, costo contratado, precio de venta ni tarifa del piloto53ft.

## Antes, ahora y evidencia

Antes los revisores de combustible y mantenimiento/llantas entregaban contrastes separados del presupuesto binacional. Ahora el consolidado B2 incluye `supportingVariableEconomics`: componentes, linaje y extensión monetaria de un modelo homogéneo. Se reutilizan ambos revisores; no motor/servicio/endpoint/infraestructura/paquete nuevo.

Se revisaron íntegramente las páginas físicas59/61 del original [IMT PT881](https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf), sección4.1/tabla4.2, impresas49/51, incluyendo especificaciones, unidades, condiciones y fuente VOC4.0. PDF reutilizado sin modificar, SHA256 `816728964103158f0a99f44c41bbe5d2bb7240c33e35651fcbd90c0b391412f4`. Lector web403; copia local con hash renderizada e inspeccionada, no nueva descarga/publicación afirmada.

Fuente:T3-S2, International9200i/CumminsISX450HP, caja aluminio40ft de dos ejes, neumáticos1100-20.00, carretera recta/plana, IRI2m/km e índice de servicio4.3. Costos2025, no consumos observados de flota2021. La sección4.1 excluye impuestos/derechos para evaluación económica nacional; **no equivale a costo contable de un carrier**.

## Comparación previa al código

| Alternativa para obtener componentes CVU | Ajuste/riesgo/costo total | Decisión |
| --- | --- | --- |
| Sumar fuel histórico IMT/ORNL y maintenance IMT/TTI | Vehículos, años, poblaciones, rutas y fiscalidad distintos; aparentemente fácil, alto retrabajo económico | Rechazar esa suma como subtotal homogéneo o CVU |
| Revisores existentes + combustible de la misma tabla4.2 | Año/configuración/moneda/frontera comunes; extensión local verificable sin proveedores contratados | Adaptar para contraste conjunto, no adoptar en piloto |
| Nuevo motor o rellenar135/210inputs con promedios | Duplica capacidades sin añadir evidencia y fabrica apertura Qty/PU/Life | Rechazar, conservar ADR009 y motor activo |

Conversiones/sumas son capacidades estándar. No se declara innovación ni se reconstruyen capacidades comunes. Tener cinco ejes no demuestra compatibilidad40ft→53ft ni carretera base→corredor; no se elige un coeficiente corrector arbitrario.

## Resultado numérico reproducible

SAKBÉ retenido/cotejado desde67segmentos: **1124.5764209526735km**, MéxicoDF→NuevoLaredo. Sin cambio de endpoint ni aprobación camionera. Hipótesis de extensión: tasa constante del modelo base por esa distancia, **sin ajuste por geometría, pendiente/carga/corredor**.

| Componente seleccionado | MXN/vehículo-km, modelo2025 | Extensión condicional, MXN |
| --- | ---: | ---: |
| Combustible | 10.70421 | 12037.70 |
| Mantenimiento: labor/refacciones, sin llantas/lubricantes | 5.61754 | 6317.35 |
| Lubricantes | 0.27967 | 314.51 |
| Llantas | 0.96996 | 1090.79 |
| **Subtotal seleccionado** | **17.57138** | **19760.36** |

Suma a precisión completa; redondear renglones antes de sumar puede diferir1centavo. Misma tabla por1000veh-km:10704.21+2010.02+3607.52+279.67+969.96=17571.38. Se excluyen conductor, depreciación, intereses, administración, peajes, frontera, retorno vacío, ralentí/auxiliares y DEF no conciliado. No sumar total de operación21.31MXN/km (contiene fijos/indirectos) ni otra tasa completa de remolque; no repartir50/50.

Consumo del mismo modelo483.92L/1000veh-km: rendimiento implícito2.0664572657km/L y extensión condicional544.2050L. **No es una pareja cargado/vacío medida del piloto**. Entradas impresas483.92×22.12=10704.3104 frente al costo publicado10704.21: conservar salida oficial, mostrar diferencia0.1004por1000km; no corregir PDF con insumos redondeados.

Conectados también los cuatro contrastes de combustible y las dos fichas maintenance/tires anteriores, sin sumarlos entre países/fuentes. US TTI2024 conserva0.1615565102USD/veh-km de R&M/llantas, sin combustible ni apertura lube establecida. No es cohorte compatible con ORNL2006-2008 para fabricar CVU conjunto.

[EIA PADD3](https://www.eia.gov/dnav/pet/PET_PRI_GND_DCUS_R30_W.htm) releída directamente:28sep2026,5.955USD/galUS, publicación29sep/próxima6oct; impuestos incluidos. Conversión existente USD/L conservada, sin actualizar snapshot o precio activo. Profeco27MXN/L permanece referencia indexada anterior, sin confirmación directa nueva. **Ninguno incorporado al subtotal neto2025**. Sin FX elegido ni suma MXN+USD.

## Implementación, validación y alcance

- [JSON nuevo](B2_VARIABLE_COMPONENTS_REFERENCE_2026-10-01.json), SHA256 `4e9749bad7caeb7db3a26c62883965cd74d4bf729cfc2e7e68635ec15ef730d2`.
- Helper `apps/api/scripts/lib/reference-variable-components.ts`: fuente/periodo/moneda/grupo, exclusiones, precisión publicada, componentes y extensión dimensional; reutiliza revisores.
- Consolidado:37pins y lectores confinados a docs/realpath. Verificadores anteriores6+10entradas de archivo con solapes; no16fuentes distintas ni prueba de representatividad.
- **250/250 pruebas focalizadas en4archivos**,20nuevas del helper; unión real de distancia, unidades, exclusiones, duplicados, archivos originales alterados y no imputación FX/faltantes. Primera corrida249PASS/1FAIL por igualdad binaria0.27967vs0.27967000000000003; corrección sólo de aserción a tolerancia12decimales y una repetición completa PASS, sin cambiar aritmética.
- Typecheck estricto consolidado/helper/tests:PASS. CLI real:exit2 esperado por incompleto,37pins,subtotal17.57138/extensión19760.35963159939;0/10partidas fijas completas,0adopciones/seis salidas finales null. Diff-check:PASS; avisos CRLF previos no funcionales.
- Skill testing-strategy motivó pruebas focalizadas de economía/integridad; PDF motivó revisar páginas completas/frontera fiscal. No suite general/UI/login/persistencia/despliegue/aceptación comercial demostrados. No UI nueva; B3 sigue requiriendo wireframes y marca oficial.

Comando offline desde raíz física D:

```powershell
& 'C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/tsx/dist/cli.mjs apps/api/scripts/consolidate-binational-reference-budget.ts
```

## Cierre B2 aún no demostrado y siguiente actividad

El objetivo sigue **estimación D2D completa**, no inventario ni este subtotal. CFU/CVU/costo productivo final siguen null. Faltan perfil53ft compatible por país, variables/conductor, presupuestos fijos/exposición productiva; rutaUS con uso permitido; carga/cruce/espera/liberación, retorno/vacíos y ciclo serial de una caja; peajes/cargos/FX/fiscalidad sin duplicación.

Próxima actividad: **aplicabilidad53ft y frontera operativa de componentes MXUS, empezando por modelo público actual de rendimiento/consumo y costo de conductor**, no nuevo validador o investigación fiscal general. Distinguir costos por km compuesto en fases disjuntas de cargos que requieren asignación única: no sumar dos tasas compuestas sobre el mismo kilometraje/ciclo. La nueva llamada Google no se ejecutó; continuar B2 no activa facturación/configuración ni garantiza cuota gratuita. No se pide información privada para el benchmark.

## Responsable, modelos, cuota y presupuesto

Codex único escritor/integrador/verificador. Recomendación OpenAI GPT-6.1Sol·alto para conciliación/implementación, medio para empaquetado; catálogo declara esos esfuerzos, no prueba acceso actual o modelo realmente ejecutado. Selector no cambiado; modelo/esfuerzo principal no leídos por mecanismo independiente. Sin agentes/CLIClaude/APIIA. Mantener contexto evita repetir expediente; ahorro numérico no observable. No incertidumbre de razonamiento demostrada que justifique Astra/Fable. Claude5h/semanal/Fable/reposición/ruta de suscripción/extra:desconocidos, no usados ni inferidos de Maxx5 histórico.

Lectura automática `get_usage_limits`:2oct2026 04:16:57UTC/1oct22:16:57MX, semanal100%usada/ordinaryUsageAllowed=false/créditos disponibles; próxima reposición6oct13:08MX, segunda ventana no observable. Autorización reciente para continuar, sin activar créditos/pagos/plan. Tokens/cargo real por corte/no observable; ninguna conversión de balances a porcentaje/ahorro. Reserva por alcance25min y un reintento por fallo, no porcentaje inventado. Intentos fallidos conservados:IMTweb403; pdftotext ausente, sin instalación; extracciónPython/codificación fallida y un reintentoUTF8 válido; prueba inicial/repetición; primer patch documental sin aplicar por contexto de línea incompleto, corregido una vez. Uso de intentos desconocido, no cero. No ampliar arquitectura/servicios/cargos sin autorización específica. No necesidad de duplicar este cálculo en otro proveedor.

## Entorno y rollback

Worktree `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; AGENTS/branch/HEAD/worktrees verificados antes de editar. Árbol sucio preservado. Sin staging/commit/rama/worktree/PR/publicación ni DB/Neon/Auth/usuarios/infraestructura/negocio/IA de aplicación/Googlecall. Motor activo/base publicada intactos.

Rollback: retirar sólo helper/prueba nuevos/JSON/MD de este corte; quitar del consolidado tres imports/tres pins/bloque de unión-verificación/`supportingVariableEconomics`; retirar cuatro tests añadidos al integrador y nuevas notas de estado/plan. **No restaurar archivos completos ni quitar revisores, recibos/rutas, PDFIMT u otros cambios anteriores**. Renders únicos tmp/pdfs/b2-variable-db0f48114c6a4e77afc6070ff8fced80 son intermediarios, no entregables. No rollback/eliminación ejecutados.
