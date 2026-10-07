# B2 · checkpoint previo a elección de ejecutor

Actualizado2oct2026,15:45UTC/09:45México. La nueva instrucción del usuario reemplaza la política anterior: Codex y Claude son candidatos iguales; el usuario elige ejecutor/modelo/esfuerzo. Implementación/integración/verificación se asignan explícitamente y hay un solo escritor. Este checkpoint registra una detención de escrituras de implementación, **no pausa ni cierre del objetivo B2**. No hay escritor auxiliar/sesión Claude, lease nativo tomado, inferencia Claude ni proceso de pruebas pendiente iniciado por este corte.

## Estado verificable al detener implementación

WorktreeD:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD4f5fc2de0c3d178dace917231e1092040dec21fd, preservado. Estado previo sucio conservado; sin commit/stage/reset ni nuevas ramas/previews/PRs.

Dos archivos nuevos, sin integrar al consolidado:

- `docs/research/B2_PILOT_ROAD_BORDER_SCENARIOS_2026-10-02.json`, SHA25669047bd29c1c08938f784a7811b8244bb05255bb09637bda23fa9566b774d2e5.
- `apps/api/scripts/lib/reference-pilot-road-border.ts`, SHA256c75fcc606cbbecd04ef20782344692736810932a1563244dfb058b6ea684da88.

Comprobación de tipos del helperPASS antes de recibir la nueva política. **No pruebas unitarias/integración del helper ni readback económico ejecutados**. El consolidado no importa ni publica `pilotRoadBorder` (rg sin coincidencias, exit1 esperado); sus56pins/resultados del corte anterior no se han modificado en este corte. El resultado700PASS del corte anterior no prueba este nuevo módulo.

Investigación previa y decisión: reutilizar tarifas C5 por movimiento de la conciliación pública, no GoogleDRIVE/multiplicadores ni nueva integración pagada. Nuevo cálculo prospectivo conserva proveedor4770MXN y sustituye Matehuala144→125 sólo dentro de su hipótesis, no en el original. La Carbonera43 sigue sin precio;306del tramoPuertoMéxico ya solapaLosChorros, no agregar automáticamente. Selecciones de movimiento/tax/fechas son hipótesis auditables, no aprobación operativa.

Hallazgo que cambia la acción siguiente: relevo con patio hipotéticoUS requiere retorno de tractorMXsin caja. La alternativa prospectiva contabiliza norteC5+surC3 en red y norteC5/surC3/norteC3/surC5 en dedicado; UStractor permaneceUS. No elegir patio real, carrier o permiso de operación. Distancias/tiempos/costos variables de esos movimientos bobtail fronterizos aún no están en el ciclo previo: flags de recomposición obligatoria/fulloutputsnull, no esconderlos como0. Validar esta geometría antes de publicar cualquier estimación completa. La alternativa patioMX y un tercer drayage no se mezclan automáticamente.

Fuentes revalidadas2oct: [SICTPuenteIII](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=cmdDatosOperRepDet&idVia=86), C3=65/C5=144 sin vigencia/sentido/tax explicitados; [SICTMatehuala](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=CmdTarifaRep1&radioSel=1&selectVia=176), C5=125/IVA/13abril; [CAMS](https://operadoravial.com/tarifas/) y [CEM](https://www.circuitoexterior.mx/rutas-y-tarifas/) conservan alternativas documentadas. Metadata [Laredo2026-O-114](https://cityoflaredo.legistar.com/LegislationDetail.aspx?FullText=1&GUID=EE67763C-5ACA-4570-9E93-1A4EC3A3FD28&ID=8067932&Options=&Search=)passed; adjunto devuelve410. PDF original archivadoLAREDO_2026_O_114_REVIEW_20260930.pdf SHA f99da8ee6812eef56a91393b4b26acf09a29972782453e0b05b7f15cb0db8725 revalidado y página3 completa revisada visualmente: comercial sur4.75USD/eje actual en ese documento, primer aumento0.50desde1enero2027, no cobrarlo en norte. No certificación de ausencia de otra modificación posterior. Imagen de revisión nueva `sources/LAREDO_BORDER_RATE_CHECK_20261002.png`, auxiliar, no tarifa ni PDF modificado.

Intentos fallidos preservados: URL de bridge-toll-fees inaccesible; adjunto410; endpointMETA no accesible por lector web. No repetir ciegamente ni confundir lector con descarga/raw vigente. Una lectura usó nombre supuesto de módulo inexistente; se localizó el módulo real en scripts antes de implementar. No se instalaron paquetes, se contactó operador, se envió BOL ni se llamó API facturable. Consumo de esos intentos desconocido, no0.

## Recomendación a elegir, no asignación

Actividad pendiente: integrar el módulo y fuentes/pins/archives en consolidado, pruebas de sentidos/clases/cobertura/no-doble-cargo/frescura/error/idempotencia y readback con límites; actualizar estado. Después recomponer los movimientos fronterizos en CFU/CVU y completar importes pendientes, sin reducir B2 a este peaje parcial.

Comparación concreta: Codex actual retiene todo el contexto de revisión y evita retransmisión; GPT6.1Sol/high es la recomendación para integración/verificación de contratos económicos. Claude Code con `claude-sonnet-5-5`/high es candidato suficiente para este contrato acotado, con aprovechamiento potencial de Maxx5 si la cuota/ruta son comprobadas. Ninguna opción tiene ahorro/costo/cuota futura garantizados. Catálogo del kit2oct y éxito históricoSonnet1oct son compatibilidad/historial, no disponibilidad actual de cuenta. Fable se consideró: no hay insuficiencia de razonamiento demostrada que requiera otro modelo más capaz; condiciones/inclusión/cuota no verificadas, no invocarlo para consumir cupo.

Recomendación provisional para cerrar este corte: **CodexGPT6.1Sol/high**, por continuidad y menor traslado/retrabajo; implementación/integración/verificación del mismo ejecutor, si el usuario lo elige. No es asignación ni cambio del selector. Modelo/esfuerzo principal efectivos no observables por herramienta; el usuario debe confirmar la selección real en la superficie antes de registrarla como efectiva. Si eligeClaude, usar el kit existente y un handoff mínimo nuevo, sin resume ciego, tras autorización precisa/metadatos/cuota/OFF/trust previo/permisos normales; no puente nuevo ni inferencia automática.

Presupuesto propuesto para la siguiente elección:15min de integración/pruebas, contexto mínimo≤24kbytes si traspaso, una reparación por fallo diagnosticado; parar al límite/segundo fallo/sin fuente/permisos, reservar5min de esos15para corrección/documentación. No repetir700pruebas por defecto: probar nuevo módulo y consumidores/conciliación afectados. Sin UI: no hay wireframe nuevo; B3 conserva wireframesMARKSMAN.

Quota automática soportada15:36:53UTC/09:36:53México: Codexsemanal100%usada/10080min, reposición6oct13:08México; ventana5hno disponible; créditos existentes, sin compra/reset/activación. Consumo de esta actividad/cargos reales no observables. Claude5h/semanal/Fable/rutaMaxx5/extraOFF/reposición desconocidos; ninguna ejecuciónClaude autorizada ni probada aquí. No instalar lectores ni revisar credenciales/sesiones privadas para completar evidencias. La skillclaude-review y HANDOFF/README fueron leídas tras la nueva instrucción y causaron el checkpoint/espera de elección; testing-strategy/PDF guiaron planes/lectura, no demuestran pruebas faltantes.

Corte iniciado15:36:53UTC, tope15:56:53UTC. Detención por nueva elección de ejecutor, no por presupuesto agotado. Sólo documentación de checkpoint después de detener implementación. B2 sigue activo: sin costoD2D íntegro, sin Auth/DB/Neon/usuarios/migraciones/infra/producción/negocio/IAaplicación.

Rollback: retirar sólo los dos archivos nuevos y esta ficha; la imagen auxiliar puede conservarse como evidencia. No restaurar archivos completos ni borrar investigación/trabajo ajeno. No hay pin/import/salida nuevos en el consolidado para revertir en este corte.
