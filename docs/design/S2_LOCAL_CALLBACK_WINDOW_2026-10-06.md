# Sprint 2 · callback local temporal autorizado

## Autoridad y alcance

Respuesta humana «autorizo» a añadir únicamente http://localhost:3001/auth/callback durante20min y retirarlo al terminar, preservando SiteURL/34retornos/QA cerrado. Encargo recibido6oct2026, preflight desde16:40CDMX. No permiso de dominioquotes, despliegue, usuarios, GoogleCloud, keys, nuevas bases o reactivaciónNeon. Referencia documental, no consentimiento infalsificable por booleano/hash.

Se reutilizan [diagnóstico vivo](S2_FAMILY_AUTHENTICATED_QA_2026-10-06.md), configuración pública local y Management API oficial existente. Alternativas comparadas: modificar SiteURL compartido afecta otras apps; repetir login sin cobertura no resuelve; añadir una entrada exacta temporal es el cambio mínimo elegido. Supabase skill exige comprobación y limita PATCH a uri_allow_list. [API oficial](https://supabase.com/docs/reference/api/v1-update-auth-service-config) y changelog actual revisados. Sin nueva implementación persistida o dependencia: supervisor temporal en memoria con guardas de target/baseline y cleanup, no nuevo framework deAuth.

Codex único; GPT-6.1 Sol/alto recomendado/solicitado, efectivos/cuota/tokens/cargos desconocidos. Sin Claude/subagentes/IA de negocio. Una adición y una retirada autorizadas, cero reintentos automáticos de escritura. Si configuración inicial difiere, no añadir. Si resultado es incierto, lectura para determinar estado y cleanup de entrada propia, no repetir adición ni borrar retornos ajenos.

## Cambio confirmado

Project rateware-prod/alqjqzqagdmcywpjtnnr confirmado por GET; lecturaAuth tambiénGET. Token deManagement ya configurado sólo en memoria/proceso, sin imprimir/guardar secreto ni instalar lector. Baseline esperado:

- SiteURL https://rates.heymarksman.com/.
-34retornos/1990caracteres, URIsha256 ec72d36f70e12020ac6d15dc3d63ae5a50610cbb5b947f5e6baef90088f3fb3d.
- Hash de configuración restante (canonicalJSON excluyendo uri_allow_list):14f5138265fc74c434e49a56a0c7e119e0da1d87d00a69c9a05c01cc60b05b82; no configuración íntegra o secretos archivados.

ÚnicoPATCH con cuerpo sólo uri_allow_list recibióHTTP200. GETposterior confirmó adición exacta y otros campos iguales: **35retornos/2026caracteres**, URIsha256 **585b03c759ddaa13d1f2121f3fda3cae7708ba1410b0141fb42462a0cb25f668**; SiteURL unchanged/otherConfig unchanged. No sustitución/limpieza de entradas de otras apps. Cobertura de configuración confirmada, **no login real por este resultado**.

ControladorAuth execsession2165. Ventana hasta2026-10-06T23:02:56.224Z (**17:02:56 Ciudad de México**), temporizador instalado antes delPATCH. Al expirar o stdin stop, GETactual, retirada sólo de nuestra entrada y GETdeverificación. Si otros modificaron la lista, conservar sus entradas y retirar sólo la nuestra si aparece exactamenteuna vez; duplicación/ownership incierto requiere atención, sin restauración global sobre cambios ajenos ni retryautomático. Comparar SiteURL/otros campos antes/después delcleanup, no sobreescribirlos. **Retirada programada, aún no verificada al crear este registro.**

## Frontend y handoff

Frontend sóloAuth con supervisor temporal execsession29948/CLI NextPID21664, mismo deadline deAuth (no otros20min desde arranque). PublicURL/key existing sólo memoria; clavesprivilegiadas/DB/IA filtradas, API_URLpuerto1 bloqueado, localhost3001 fijo. Sin API/NeonQA, SQL, cambios del producto o sitio productivo.

Se respeta el bloqueo de control automatizado del navegador: ningún intentoUI alternativo/CDP/fetch de página para sortearlo. Usuario debe abrir localhost3001/login y comenzar Google **nuevo** con cuenta existente, no reutilizar el código de Rateware ni crear otra cuenta; avisar del retorno local/MFA sin credenciales en chat. Dashboard podría fallar por API aislada: no equivale a fallo del callback y no autoriza abrirQA. Confirmación de callback/sesión sigue pendiente.

Rollback autorizado: retirar únicamente http://localhost:3001/auth/callback y verificar; detener sólo frontend propio por stdin stop/timer. No cambiar SiteURL, OAuthGoogle, otrosretornos, datos/eventos/usuarios, historialdeintentos o roles. Si cleanup falla/queda incierto, informar y mantener evidencia, no declararlo cerrado. El permiso familyQA anterior sigue consumido/cerrado.

Rama codex/cost-tires-release-s14/HEAD4f5fc2de0c3d178dace917231e1092040dec21fd en D:. Cambios ajenos conservados. Este corte añade sólo este registro; ningún archivo de implementación nuevo/modificado ni suite/build nuevos. GET/PATCH/GET son evidencia real de configuración, no prueba de login/calibración/release.

## Retorno local observado y cierre, 6oct16:48

Usuario informó «listo» con origenlocalhost3001/. Se respetó el bloqueo de automatización del navegador: no nueva selecciónUI/CDP/lectura de cookies ni extracción de tokens. Evidencia local sólo de archivos generados del proceso propio y lógica del handler:

- Traza a22:46:02.043Z y22:46:02.069Z: **/auth/callback**, origenlocalhost3001, querykeycode (sin valor divulgado). Segundo span999.997ms.
- Siguiente handle-request a22:46:03.091Z: **/**, mismo origen, sin query,185.665ms. Reporte humano y secuencia acreditan retorno local, noRateware. Tagsfailed varían entre spans; no se convierten en statusHTTP o falloAuth. No hay WARN/ERRORAuth clasificados en el log de este proceso.
- Código callback: exchangeCodeForSession y retorno raíz sólo sin error; con error devuelve/login. Secuencia consistente con intercambio exitoso, **sin recibo explícito de la respuestaSDK ni sesión/exportación de tokens**. Layout usa getUser antes de datos negocio; no se leyó identidad real del usuario/rol por la API aislada. No declarar por esta secuencia permisos, recarga, renovación o login productivo completos.

Se cerró anticipadamente por controlstop, no se esperó hasta17:02. **RestauraciónAuth confirmada**: únicoPATCH de retiradaHTTP200 yGETdeverificación, callbackRemoved:true/baselineRestored:true/otherEntriesPreserved:true/otherConfigPreserved:true/siteUrlUnchanged:true;34retornos y SHA **ec72d36f70e12020ac6d15dc3d63ae5a50610cbb5b947f5e6baef90088f3fb3d** original. Controlador2165 exit0. No signOut global/local, borrado de sesión de usuario ni cambios de otras apps; retirar allowlist no se usa como prueba de revocación o conservación de sesión.

Frontend29948 stopstatus0/PID21664, exitCLI1 esperado por taskkill/stoppedtrue, controlador exit0; sin listeners3001/3002 comprobados16:47:44. Ambos timers terminados, no ventanas/leases de este corte activas. QA no reabierto;0propuestas nuevas en esta actividad. Hash log 7663C42343A99AB32E157B6BC20B031DA3F6264F6342ACF2FCC4BE2146126A94, hashtrace E88FF0634DE225DE342C3BF6C51C5F6FE674605A750C7BC86898F23A93BCFC87. No datos crudosAuth archivados.

**Cierre: cobertura temporal y retorno al origen local corregidos, cleanup real confirmado.** Autenticación funcional/permisos/sesión completa y aceptación familyQA siguen abiertos. Próximo gate debe comenzar por identidad existente/rol, después una propuesta/recuperación/replay, con nueva autorización acotada paraNeonQA: no reactivar marcador consumido ni reutilizar esta autorizaciónAuth. Si otra sesión necesita loginGoogle fresco, callback ya retirado: revalidar cobertura antes de pedirlo, nunca repetir el error de preparación.

Sólo documentación modificada en este cierre; ningún test/build nuevo atribuido. Supabase skill limitó restauración a entrada propia y comprobó configuración; verification-before-completion distingue retorno/traza de sesión autenticada integral. Modelo recomendado6.1Sol/high, efectivo/esfuerzo/consumo desconocidos; sinClaude/IA auxiliar/operaciones comerciales, importes y V3 intactos.
