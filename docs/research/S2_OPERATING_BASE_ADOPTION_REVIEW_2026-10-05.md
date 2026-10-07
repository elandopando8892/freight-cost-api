# Sprint2: inventario y propuesta de adopción por base operativa

## Continuación autorizada: puente local implementado

La decisión solicitada en este informe recibió «autorizo». [Implementación y demo del puente](../design/S2_OWN_RELAY_FAMILY_BRIDGE_2026-10-05.md): recibo B3 validado→propuesta versionada por familias→relectura/revalidación→kernel B2 sin cambios.32partidas fijas/20conceptos,24selecciones probadas, una caja/pool,82/82focales y tipos/build APIPASS. No publicación, adopción o readerDB real en este corte; demo usa identidad/recibo sintéticos y conserva importes originales. Adopción económica e integración operativa siguen abiertas. Las secciones siguientes conservan el análisis y la solicitud original, no una autorización aún pendiente para este módulo.

## Resultado del corte

Entregados [paquete ejecutable210campos](S2_OPERATING_BASE_ADOPTION_PACKET_2026-10-05.json) y [preparador local](../../apps/api/scripts/prepare-operating-base-adoption.ts). Se reutilizan conciliador135/210, catálogo, parser de evidencia, aplicabilidad V3 y snapshot B2; no otro motor, dependencia, esquema, servicio o maestro.

**Conciliación preparada; adopción/calibración operativa aún abierta.** Hay7campos con alternativas públicas normalizadas (9alternativas por país),186con evidencia de familia no convertible directamente en microvalores,17sin lector literal identificado. Estas categorías suman210; no significan7campos calibrados ni186fuentes inexistentes. Registro histórico135 conserva3candidatos/47contrastes/85faltantes: es otra granularidad, no un segundo conteo comparable.

Los75campos fuera del registro135 tienen58lectores literales y17sin lector literal. Una lectura estática no prueba ejecución para todos los perfiles; tampoco certifica valor, exactitud de etiqueta, representatividad o vigencia. No se distribuyen tasas agregadas entre Qty/PU, precio/vida de llantas, pólizas o FTE ficticios. Valores propuestos/adoptados canónicos permanecen null/0 respectivamente; no se cambiaron defaults ni fuentes originales.

## Objetivo, alcance, alternativas y ejecución

Instrucción humana «procede con los trabajos del sprint2»,5oct2026. Objetivo: relacionar input/supuesto→fuente→unidad/periodo→recurso→CFU/CVU→restricción de adopción, sin simular bases productivas. Alcance local en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama codex/cost-tires-release-s14, HEAD4f5fc2de0c3d178dace917231e1092040dec21fd;358entradas sucias previas conservadas. No consulta de bases persistidas, SQL, usuarios, Auth, infraestructura, despliegue, operación de negocio ni IA auxiliar.

Benchmark previo proporcional: revisión del conciliador y evidencia actual79pins, snapshot B2/88pins/24casos, política pública autorizada, perfil V3, aplicabilidad y checklist de calibración existentes. (A) llenar210defaults o derivar microvalores de agregados: rechazada por falsa calibración/doble conteo; (B) reutilizar B2 por familias con puente versionado explícito: recomendada para el piloto; (C) reconstruir la granularidad detallada completa: posible, pero mayor investigación/implementación y no resuelve por sí sola relevo vs through-tractor. Ninguna opción se implementa/publica sólo por este informe.

Codex/OpenAI ejecutor único, recomendado GPT-6.1 Sol/alto, efectivos/cuota/tokens/cargos desconocidos. Claude considerado y no necesario para conciliación determinista de los componentes disponibles; sin llamadas auxiliares/subagentes. Presupuesto45min de corte local desde aproximadamente21:23 Ciudad de México, hasta dos reparaciones por causa, sin ampliación de gasto/acceso. Skills data:validate-data para periodos/cohortes/unidades/denominadores, TDD para las guardas del paquete y verification-before-completion para cierre. No cambio visual: conserva wireframes/branding B3, no requiere un nuevo diseño de pantalla para este entregable.

## Cobertura completa por sección

| Sección | Campos catálogo | En registro135 | Papel y límite de adopción |
|---|---:|---:|---|
| GENERAL_BASE | 6 | 5 | Perfil, responsabilidad y alcance; no acredita por sí solo relevo propio |
| FUEL | 7 | 4 | Precio×consumo; fecha/región/mezcla y diferencia cargado-vacío explícitas |
| LABOR | 7 | 3 | Compensación vial, patronal y viáticos separados;4sinlector literal |
| FINANCE | 7 | 6 | FIX fechado y financiación alternativa; no sumar cuota completa |
| UTILIZATION | 20 | 0 | Denominadores de km/días/ciclo;4sinlector literal |
| BORDER | 4 | 0 | Viaje/cruce y responsabilidad;3sinlector literal |
| RISK | 7 | 0 | Política independiente;4sinlector literal, no ausencia=0 |
| CONFIG | 9 | 0 | Equipo/ciclo; lectura V3 no acredita otro equipo |
| TECHNICAL_MARGIN | 9 | 0 | Compra/venta/margen fuera de costo productivo;1sinlector literal |
| COST_MAINT | 31 | 31 | CVU agregado alternativo al detallado, no inferir31microvalores |
| COST_TIRES | 12 | 12 | Método agregado distinto de ciclo por posición/recape, no sumarlos |
| COST_INSURANCE | 3 | 3 | Plazo/cobertura/recurso, no traslado de prima doméstica a binacional como observación |
| COST_PAYROLL | 14 | 14 | Un pool administrativo, no multiplicar por tractor/tramo |
| COST_COMPANY | 46 | 46 | Canasta de servicios/permisos por responsable, no inventar46Qty/PU |
| COST_CAPITAL | 13 | 11 | Depreciación/interés/residual y renta como alternativas |
| COST_CROSSBORDER | 15 | 0 | Cumplimiento/servicios compartidos;15lectores, no15adopciones |
| **Total** | **210** | **135** | **Cero adopciones** |

## Alternativas canónicas existentes, no valores aprobados

| Campo | Alternativa conservada | Periodo/límite |
|---|---|---|
| Diesel MX | 27 MXN/L | 25sep2026, referencia nacional; no compra/ruta verificada en este corte |
| Diesel US Border | 5.955/3.785411784 =1.5731445718 USD/L | 28sep2026/PADD3; no mezcla de compras de todo el corredor |
| Rendimiento cargado | MX1000/483.92; US7.9×1.609344/3.785411784 km/L | MXmodelo2025/40′ transferido a53′; US2006–2008 |
| Rendimiento vacío | Las mismas dos referencias como transferencia declarada | No dos observaciones independientes de carga/vacío |
| Tarifa operador MX | 2.1×1.609344/18.3688 USD/milla | Remuneración anunciada, no costo patronal completo; corte de investigaciónOct |
| Tarifa operador US | 0.817 USD/milla | Cohorte histórica2024, no observación del carrier objetivo |
| Tipo de cambio | 18.3688 MXN/USD | FIX1oct2026, no sustituto silencioso de FIX30sep18.0692 del escenario |

El paquete conserva fórmulas de conversión, país, IDs de fuentes, periodos y limitaciones de cada alternativa. Completar aritmética de una familia no permite poner esos siete valores en cualquier versión sin revisar el método y el periodo de esa base.

## Comprobación puntual de fuentes públicas

- [EIA, Gasoline and Diesel Fuel Update](https://www.eia.gov/petroleum/gasdiesel/): consulta5oct2026 muestra Gulf Coast/PADD3 diésel5.955 USD/galón para28sep2026, impuestos incluidos. Confirma la referencia regional congelada, no el rendimiento ni las compras del carrier.
- [BLS, ECEC junio2026 publicado9sep2026](https://www.bls.gov/news.release/archives/ecec_09092026.htm): tabla privada de transportation/material moving contiene salario24.97 y componentes1.31/3.51/1.47 USD/h utilizados en la política. Confirma los números de origen US; su traslado a beneficios MX sigue siendo una hipótesis, no «estándar de mercado MX» certificado.
- [Texas Comptroller, Local Sales and Use Tax FAQ](https://comptroller.texas.gov/taxes/sales/faq/local.php):8.25% es máximo combinado, no tarifa universal ni prueba de gravabilidad de la canasta. La reserva existente se mantiene como reserva, no impuesto real.

No se refrescaron los79/88expedientes completos ni todos los precios. La comprobación puntual no debe convertirse en sourceRefreshPerformed:true del dataset completo. Fuentes históricas y restricciones continúan fijadas; ninguna cifra nueva se inyectó al motor.

## Segmentos: plantillas, no bases persistidas aprobadas

El paquete enumera los9segmentos del sistema. Cinco son CONFIGURABLE V3 (binacional propia, Intra-Mex, Local MX, Intra-US, DrayageUS), con210decisiones de aplicabilidad por plantilla. Cuatro son MODEL_PENDING (intercambio MX→US/US→MX, transbordo y MXDrayage); no se les inventa un perfil ni una matriz heredada US. Todos quedan readyForAdoption:false. No se inspeccionó el inventario de bases publicado en la nube: estas plantillas no prueban cuántas bases existen ni cuál está activa.

Hallazgo decisivo: perfil defaultV3binacional=`THROUGH_TRACTOR`; piloto aprobado=`OWN_RELAY_SAME_TRAILER`. El snapshot B2 fija24casos/88fuentes, hash69a5d1af1d07d072b5238c5c92d4490479940c569bb3bca68dd7b0e8b6b8d2b3. Hash de payload validado; no se revalidaron todos los archivos fuente en este paquete. No publicar ese escenario como base V3 porque ambos digan «binacional».

## Decisión necesaria y trabajos aún abiertos

Recomendación: **autorizar el diseño e implementación local de un puente versionado de base pública por familias para relevo propio**, reutilizando las fórmulas y ledger B2, preservando V3/históricos y las reservas explícitas. No distribuye agregados entre210campos ni cambia Auth/infraestructura. Esa elección metodológica importante requiere confirmación antes de implementar el puente; la instrucción de conciliar no aprueba valores individuales, nueva semántica productiva o publicación.

Para cerrar sprint2 completo faltan: puente del perfil/método, conciliación del periodo de cada propuesta, resolución/revisión de transferencias históricas y reservas, aprobación específica de valores/políticas por base y prueba contra CFU/CVU de esa versión. Compra/venta/riesgo/margen son decisiones separadas, no inferidas del benchmark. No se exige al usuario aportar contabilidad privada para modelar la referencia pública; tampoco se afirma observar costos reales con fuentes agregadas.

**Evaluación data:validate-data: compartir con salvedades** para el inventario/paquete de revisión; **necesita revisión** para adopción/calibración productiva. El entregable local de conciliación está preparado, no el sprint completo ni B4.

## Pruebas, ejecución y rollback

TDD:5tests nuevos fallaron por ausencia del preparador y luego pasaron.29/29focales (5paquete+24conciliación existente), tipos estrictos dirigidos exit0. Otra prueba mostró que faltaban las fórmulas/supuestos explícitos en el paquete; se añadieron las13familias y la política B2 completa, leída con su hash fijo0292435008061196cbfafdbef8bcf8f0815435b8f6bcfb65bac84ed754fe6bf3. Después del último código:51/51focales (6paquete+24inventario+21planeación) y tipos estrictos dirigidos exit0.

CLI `node --import tsx apps/api/scripts/prepare-operating-base-adoption.ts --write-packet` creó inicialmente592867bytes con flagwx. Antes de enriquecerlo se verificó hashF24F6991F14CB5B5D3224252D4EBD34953421F83812012C92ECB79C03812A159 y se conservó como [versión inicial](S2_OPERATING_BASE_ADOPTION_PACKET_2026-10-05.initial.json), sin mover directorios ni modificar archivos ajenos. Paquete enriquecido622461bytes/hashF751B51578520850F84E90A308D8AAEFB40550B46F03A00B5D6064F7036308DA, creado de nuevo conwx. Política y fórmulas presentes; no reservas nuevas ni cambios económicos.

Código nativo2 significa revisión preparada/adopción abierta; el wrapperPowerShell devolvió1 en la primera invocación, sin error de datos ni repetir escritura. Invocación sinwrite confirmó nativeExit2,210/135/75/17, estados7/186/17 y9plantillas; CLI--adopt rechazado por uso inválido antes de preparar/escribir, no existe modo de adopción. Suite API completa desnuda lanzada; resultado final se añade al terminar. No build/UI/DB necesarios para el reporte, no prueban aplicación productiva.

Primera corrida amplia empezó21:32:52 antes de añadir familias/política y terminóexit1/663.88s:3248testsPASS/1FAIL/25SKIP;209archivosPASS/2FAIL/4SKIP. Fallos: guard obligatorio tire-calibration-rls-postgres por falta de FCM_TEST_ADMIN_DATABASE_URL local, y nueva aserción de economicFamilies que encontró undefined en esa corrida iniciada antes del último cambio. No se considera verificación final ni se atribuye a un bug de proveedor/caché sin aislamiento. Focal limpio posterior51/51 y lectura CLI muestran13familias/política validada. Se lanzó una sola corrida amplia nueva con código congelado aproximadamente21:44; su resultado se registra al terminar, sin ocultar el intento anterior. Guard PostgreSQL no relajado ni apuntado a Neon.

**Resultado final limpio:**inicio21:44:26/duración469.69s/exit1,3249testsPASS/25SKIP,210archivosPASS/1FAIL/4SKIP (215archivos/3274tests). Cero tests ejecutados fallidos; única suite bloqueada en colección=tire-calibration-rls-postgres.test.ts por env PostgreSQL local desechable ausente. Nueva prueba de fórmulas/política pasó y no se reprodujo el fallo anterior en proceso limpio. No se declara suite total verde ni se omite el bloqueo. RLS17/17 del sprint1 es evidencia anterior separada, no nueva ejecución en este corte sin DB. Los25SKIP requieren sus entornos, no se certifican. Tipos focales estrictos y51tests afectados se ejecutaron después del último código.

Checkpoint final5oct2026 aproximadamente21:53 Ciudad de México: rama/HEAD sin cambio,210claves únicas/13familias/9plantillas, SHA del paqueteF751B51578520850F84E90A308D8AAEFB40550B46F03A00B5D6064F7036308DA intacto, no servicios/leases/gates iniciados. El informe se solicitó abrir en panel local Codex; herramienta devolvióqueued, no se presume visibilidad. No quedan procesos propios de prueba activos. No se cierra la adopción económica por haber terminado el código de revisión.

Archivos del corte: export e imports añadidos a reconcile-economic-model-inventory.ts (el conciliador y sus fuentes previas permanecen), CLI nuevo prepare-operating-base-adoption.ts, test nuevo y este informe/JSON/status. Rollback retira sólo esos hunks/archivos nuevos; preservar todo código anterior, fuentes, snapshot B2, eventos y cambios ajenos. No reset, SQL, nuevos modelos/proveedores ni políticas activadas. No leases/servicios/gates QA iniciados.
