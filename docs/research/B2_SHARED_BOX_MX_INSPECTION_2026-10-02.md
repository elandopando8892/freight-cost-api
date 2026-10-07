# B2 · inspección de la misma caja: MX y reconocimiento US

Fecha de corte: 2oct2026, 00:16MX. Trabajo local en D:, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; worktree y cambios preexistentes preservados. **B2 continúa abierto.**

## Evidencia, alternativas y decisión

- [DOF NOM-068-SCT-2-2014](https://dof.gob.mx/normasOficiales/5578/sct2a11_C/sct2a11_C.html): numeral5.3.4 establece periodicidad anual; desde quinto año, inspección anual. Cada componente de una combinación lleva su propia calcomanía (5.3.2.4). No reutilizar periodicidad semestral de la norma anterior.
- [FMCSA Safety Planner, 5.2.2](https://csa.fmcsa.dot.gov/safetyplanner/myfiles/SubSections.aspx?ch=22&eta=26704&sec=65&sub=148): reconoce NOM68 para inspección periódica US. Requiere documentación actual en vehículo y conservación del reporte. Es guía, no certificación del vehículo ni sustituto de reglamentos; no establece reconocimiento recíproco Texas→México. Inspección de carretera tampoco se presume sustituto de periódica.
- [Unidad de Verificación Federal, costos publicados](https://www.unidaddeverificacionfederal.com.mx/inspeccion-fisico-mecanica-y-verificacion-de-emisiones-contaminantes-para-autotransporte-federal.html): remolque700MXN con IVA, calendario2020 aún visible. Sin fecha tarifaria2026 ni precio separado para semirremolque. No contactamos proveedor, no generamos cita ni cotización.

Comparación proporcional: renovar caja elegible Texas/Webb tiene referencia anterior101.75USD/año compuesta; alternativa mexicana tiene importe publicado700MXN de vigencia y equivalencia53′ no confirmadas. **No son precios comparables actuales ni cargos acumulativos.** Recomendación: mantener alternativas separadas hasta elegir perfil de matrícula y obtener evidencia pública tarifaria vigente; no convertir el precio histórico en input adoptado. La inspección NOM68 válida puede satisfacer requisito periódico US bajo condiciones aplicables; no añadir automáticamente otro programa periódico por cruzar frontera. Registro, aduana y otras obligaciones permanecen independientes.

## Cambio implementado

Reutilizado `reference-shared-box-compliance.ts`, sin otro motor ni servicio. Nueva ficha JSON con tres fuentes enlazadas y hash SHA256 `317a9be97cc8cc17981405f4c9e5aceb6d152793d673ca3f3d927871e15387c4`. La conciliación integra esta ficha como soporte de `SHARED_TRAILER_PERMITS`.

Arítmetica histórica:700/12=58.3333333333MXN/mes bruto, una caja y una inspección al año. **Importe actual null**, sin FX, selección de matrícula, certificación, inspección US extra automática ni renovaciónTexas añadida. Ningún dato desconocido pasa a cero. Lectura web actual; originales HTML no archivados en este corte, limitación explícita en salida. Sólo la ficha estructurada está fijada por hash.

## Verificación y cierre

272 pruebas PASS:191 conciliación,30 presupuesto,18 caja,33 seguros/patronal. Typecheck API PASS. Readback real:44pins, referencia histórica700/58.3333, precio actualnull,0/10familias completas y seis outputs finalesnull. `git diff --check` PASS con avisos CRLF preexistentes. La skill `engineering:testing-strategy` concentró pruebas en aritmética, evidencia, vigencia, doble cargo y rechazo de alcance indebido; no build general ni UI modificada.

Esto no entrega aún CFU/CVU completos ni estimaciónD2D. Siguiente prioridad: componer las diez familias en escenarios públicos compatibles contado/financiado y resolver exposición/cicloMX-US/frontera/vacíos; no abrir otro inventario ni exigir registros privados. La decisión de matrícula México/Texas sigue pendiente; no se escogió por el usuario. No requiere detener el resto de la economía pública. B3SaaS y sus wireframes después del cálculo completo.

## Registro de ejecución y consumo

Responsable únicoCodex/OpenAI. RecomendadoGPT-6.1Sol/alto para conciliación y verificación, suficiente para trabajo acotado verificable; modelo principal/esfuerzo exactos no observables independientemente, selector no cambiado. Claude no invocado: no ventaja concreta frente a aritmética y verificaciones locales; Maxx5 histórico declarado, ventana5h/semana/Fable/ruta incluida/usoextra actuales desconocidos. No asumir cuotas separadas ni capacidad disponible. Fable no necesario para este corte.

CuotaCodex leída automáticamente05:55:37UTC/1oct23:55:37MX: uso ordinario no disponible, principal100% usado/ventana10080min/reposición6oct13:08MX, secundaria desconocida; créditos disponibles observados y continuidad previamente autorizada, sin activar facturación. Estado es lectura inicial, no cuota final. Consumo exacto del corte, cargos y ahorro no observables. Reserva no cuantificable: limitar contexto,25min desde05:55:37UTC, un reintento por fallo; detener y reevaluar antes de ampliar.

Incidentes conservados: búsqueda globWindows error123 resuelta con inventario; SIDOF error interno y SmartFleet cache miss sin reiteración ni adopción de precio de buscador; ruta documentalC1 incompleta resuelta con `rg --files`; filtro de prueba de seguros inicialmente no coincidió y luego se ejecutó archivo correcto33pruebas. Consumo de intentos fallidos desconocido, no cero. No se delegó ni duplicó implementación.

Sin cambios Auth,DB,Neon,usuarios,migraciones,infraestructura,producción,despliegue,operaciones de negocio ni llamadas Google/IA de la aplicación. Rollback: retirar sólo ficha nueva, funciónMX y casos nuevos del helper/tests, pin/integraciónMX y párrafos de este corte; no restaurar archivos completos ni tocar cambios ajenos. FichaTexas anterior y worksheet original intactos. No commit ni staging.
