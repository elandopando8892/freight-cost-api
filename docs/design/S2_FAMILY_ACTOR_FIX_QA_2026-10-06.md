# S2 — ejecución única QA tras proyección explícita del actor

## Contrato

Decisión humana: «adelante continua autorizo», en respuesta a una única validación adicional de 30 minutos en el mismo QA. Referencia temporal registrada: 2026-10-06T23:57:15Z. La referencia y sus guardas son auditables, no autentican por sí mismas al autor ni conceden permisos futuros.

Repositorio físico D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Cambios históricos ajenos preservados.

Mismo Neon Preview broad-art-99750179, neondb; rol existente fcm_w2_local_20261004. Base cmuuuwhbx0002sips941fqodr / versión cmuuuwhc20004sipsywu5stvk. Se exige el marcador anterior FCM_S2_FAMILY_QA_AMENDMENT:2026-10-06T23:13:13.966Z:2026-10-06T23:58:13.966Z cerrado, NOLOGIN y cero sesiones antes de activar. No se reinician intentos anteriores.

Ventana: inicio del launcher + 30 minutos, incluido preflight. Lanzamiento autorizado hasta 2026-10-07T00:57:15Z. Una escritura de propuesta por familias, recuperación y replay del mismo recibo; máximo un evento nuevo. Error o incertidumbre: cierre sin reintento, rotación ni nueva clave de operación.

Sin cambios de Auth, Site URL, Google, usuarios, permisos/grants, producción, infraestructura, fórmulas, importes, parámetros canónicos, perfil o calibración. La propuesta sigue siendo un borrador no adoptado y no habilita cotización.

## Reutilización y decisión

Se reutilizan contrato y wireframes S2_SHARED_FAMILY_PROPOSAL_2026-10-06.md, diagnóstico S2_FAMILY_ACTOR_PROJECTION_FIX_2026-10-06.md y adaptador transaccional existente. Se comparó corregir la proyección explícita frente a relajar el esquema o modificar identidad: se eligió proyectar orgId/sub/role; supabaseId no forma parte del cálculo ni del JSON persistido. No se introduce una librería, proveedor ni costo recurrente.

Responsable: Codex. Modelo recomendado/solicitado GPT-6.1 Sol, esfuerzo high; modelo nativo y esfuerzo efectivo no observables. Claude no invocado. Presupuesto: una ejecución QA de 30 minutos, cero relanzamientos automáticos; cuota/cargos no observados. No se activa consumo extra ni IA de negocio.

## Criterios y verificación

- 35/35 pruebas focales y tipos estrictos pasaron antes de lanzar. RED previo: dos nuevas pruebas de autorización fallaron antes de implementar sus guardas.
- El pack económico conserva SHA256 D1235CA788312CB5F0DD7B82A8354809AB93756E57BF5385483E52F0026D7DF0.
- Interacción UI manual del usuario: el control automatizado del navegador fue denegado por política; no se cambia superficie ni se elude el bloqueo. Sesión existente únicamente; si necesita cambiar Auth, cerrar y consultar.
- Confirmar PUT autenticado, un recibo revision 1, recuperación por lectura, replay sin duplicados y cold readback independiente. El replay del controlador no acredita una segunda autenticación HTTP.
- Conservar los tres eventos anteriores y los 210 parámetros; cero adopciones/publicaciones.
- Cierre obligatorio del servidor, frontend y rol: NOLOGIN / cero sesiones. Registrar resultados reales abajo; una compilación o fixture no equivale a aceptación autenticada.

## Rollback

Ante fallo: cerrar servidores y deshabilitar LOGIN del rol marcado, verificar inventario; conservar todos los eventos como evidencia. No borrar datos, restaurar valores económicos ni revocar sesiones globales. La corrección local puede revertirse únicamente mediante patch de sus líneas aisladas tras revisar cambios ajenos; no se revierte durante esta ejecución ni se publicará.

## Resultado

Activación única a las 2026-10-07T00:04:43.663Z (18:04:43 CDMX); cierre máximo 2026-10-07T00:34:43.663Z (18:34:43 CDMX). Marcador FCM_S2_FAMILY_QA_ACTOR_FIX:2026-10-07T00:04:43.663Z:2026-10-07T00:34:43.663Z. Preflight comprobó el marcador anterior cerrado; se reutilizó la misma base y versión DRAFT/inactiva/no calibrada, mismos 210 parámetros y usuarios. Rol efectivo: SELECT seis tablas, INSERT ocho columnas de auditoría, UPDATE exclusivo de Organization.id/AssumptionSet.id para locks; cero funciones definer u objetos propios.

API local: sesión de control 86077 (no PID), listener PID 31668; frontend propio Next padre PID 13088, listener PID 15080, sesión 94347. Ventanas compartidas; credencial no guardada. Controles locales iniciales: anónimo 401 / ruta fuera de alcance 403 (inyección de servidor, no aceptación browser). Planeación previa revisión 1 recuperada; propuesta por familias revisión 0. No se permiten nuevos cálculos B3.

Suite API general repetida tras las guardas: 3298 pruebas pasaron, 31 omitidas; 215 archivos pasaron, cinco omitidos y uno falló al recolectar por faltar FCM_TEST_ADMIN_DATABASE_URL de fixture loopback fcm_tire_s8 (296.57 s; exit 1). No hubo fallo en prueba ejecutada; no se declara suite completa verde ni prueba RLS/fixture omitida aprobada. No se conectó esa suite a QA para eludir su guarda.

### Evidencia real recibida — 18:14–18:16 CDMX

El usuario operó la UI y aportó [captura del guardado](S2_FAMILY_QA_SAVED_2026-10-06.png), copiada sin sobrescribir ni editar la imagen original. SHA256 309E79743BC14FD5B3368A7C4BC1C289E3053E7D8028F6AB63DCF0070D832F9A. Muestra «Propuesta vigente · revisión 1» y «Propuesta guardada. No se adoptaron inputs ni se publicó la base». No certifica por sí sola una recarga posterior, viewport móvil o teclado.

Log del servidor propio: lectura planning autenticada status 200 (3770 ms; identidad 2033 ms, handler/respuesta 1737 ms), seguida de authenticatedFamilyProposalSave:true / revision:1 / replayed:false / appliedToParams:false / quoteReady:false. Ruta protegida valida sesión existente y vínculo User/org/rol ADMIN u OPERATOR; no se extrajo token ni se identifica correo por inferencia del log. No se inició otro login ni se cambió Auth.

Replay controlado del mismo comando/actor retenido tras éxito: realFamilyReceiptReplay:true / revision:1 / metadataEventsBefore:4 / metadataEventsAfter:4. El replay llama al store con el recibo autenticado conservado; secondHttpAuthenticationTested:false, no es una segunda interacción browser/JWT. No nuevo requestId ni escritura de escenario B3.

Lectura en proceso independiente: independentProcessReadback:true / familyProposalReadback:true / readOnlyTransaction:true / revision:1; fullViewSha256 10d05cf9a841ac283607417cc02858174965aa759d2e5bb2c78059775a69ddfd3, idéntico al view del servidor. Prueba persistencia más allá del objeto en memoria, no reinicio de host ni renovación OAuth.

Invariantes reales tras ambos controles: baselineHash dc45b03c932f830dc77d65062f14b0ce4ad09d631d94e4f164e72eb6ec89e05c intacto; parámetros/perfil/calibración/estado/source/users sin cambios, tres eventos previos íntegros, exactamente un nuevo evento family y cuatro totales. Pack económico D1235CA788312CB5F0DD7B82A8354809AB93756E57BF5385483E52F0026D7DF0 revalidado.

Se pidió al usuario recargar y consultar únicamente (sin guardar). No se recibió confirmación de esa recarga durante el corte. No se sustituye por la captura de guardado ni por la lectura independiente. No se declara Sprint2 completo/B4, calibración ni adopción económica.

### Cierre efectivo — 18:19 CDMX

Cierre anticipado dentro de los 30 minutos autorizados, sin fallo de guardado ni segundo lanzamiento. Control API stop: exit 0; verificación final conserva parámetros/perfil/calibración/source/users, exactamente cuatro eventos, tres anteriores íntegros y un nuevo family. temporaryRoleDisabled:true / remainingRoleSessions:0 para fcm_w2_local_20261004. Rol NOLOGIN; marcador consumido conservado, sin borrar la propuesta ni los intentos previos.

Control frontend stop: ownNextStopped:true / padre PID 13088 / taskkill status 0; ownNextExitVerified:true / child exit 1 esperado por terminación del árbol, controlador exit 0. Comprobación de sockets a las 18:19:42: sin listeners 3001/3002. No se cerró la pestaña humana ni procesos ajenos. No se reiniciará la ventana para obtener una captura.

**Corte cerrado: guardado autenticado, persistencia independiente y replay sin duplicación confirmados en el QA delimitado.** Recarga visual posterior, segundo usuario/VIEWER/otra organización con sesión real y renovación/vencimiento OAuth no certificados por este corte; las pruebas sintéticas previas no los sustituyen. El permiso temporal terminó y no autoriza otra reactivación ni adopción económica/publicación.

Siguiente cola existente, sin otro sprint por input: cerrar aceptación delimitada de referencia pública (no 210 calibrados), consolidar candidato local reproducible frontend/API y verificaciones de release pendientes; sólo después solicitar autorización productiva puntual para quotes y su retorno exacto, sin modificar Site URL compartido. Ningún cambio de infraestructura/deploy/Auth/negocio/IA durante esta ejecución.

Skills utilizadas: verification-before-completion exigió recibos e invariantes frescos antes de declarar el resultado y distinguió replay/store, proceso independiente, UI humana y cierre; Supabase mantuvo separación de sesión/identidad/permisos y evitó convertir el problema de proyección en otro cambio de Auth.
