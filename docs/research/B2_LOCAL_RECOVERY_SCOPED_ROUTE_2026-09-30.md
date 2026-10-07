# B2 · recuperación local y candidato US comprobados

## Resultado del corte

Fecha local 2026-09-30. Worktree físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Cambios ajenos conservados; sin commit, nueva rama, PR o despliegue. [Preflight y alternativas](B2_ROUTE_REVIEW_RUNTIME_RECOVERY_2026-09-30.md) preceden este corte; sus bloqueos y presupuesto intacto son históricos, no el estado actual.

Antes: Web/API detenidos y contraseña del rol limitado perdida con el proceso; no era un fallo de Google Sign-In. Ahora: runtime local recuperado, pantalla autenticada, mapa y observaciones del candidato nominal Laredo → Fort Smith recibidos realmente, limpieza y recarga comprobadas. El resultado no se conserva ni se adopta en el motor. **Corte local validado; B2 parcial, cero adopciones y cero de cuatro gates de negocio completos.**

## Benchmark, alcance y seguridad

Se reutilizaron el cliente Routes, Maps JavaScript, Supabase Auth, BFF, wireframe y compuertas existentes; no SDK, infraestructura ni proveedor nuevos. El permiso puntual de recuperación se ejecutó sólo sobre `fcm_local_read_20260930` en FCM Neon Preview, proyecto verificado `broad-art-99750179`. Se cambió únicamente su contraseña, no grants, pertenencias o vigencia. Propietario utilizado sólo para comprobación del rol y ese ALTER; desconectado antes de arrancar aplicación con el rol limitado.

Readback real antes/después: 17 tablas SELECT, cero DML efectivo, sin CREATE/ownership/membresías ni acceso a secuencias o funciones public SECURITY DEFINER. Vencimiento original **2026-10-02T03:16:49.930Z / 1 oct 2026 21:16:49.930 México**, sin extensión. Verificación de identidad/default_transaction_read_only=on precede el arranque. API escucha sólo `127.0.0.1:3002`; Next en loopback 3000, URL navegador `http://localhost:3000`. Aprovisionamiento bloqueado, usuarios existentes exclusivamente; otras mutaciones API devuelven 403 antes de Auth. No migraciones, datos de negocio, cambios de Auth/Site URL/Google OAuth, producción, IA de aplicación o deployments.

Credencial limitada protegida con Windows DPAPI CurrentUser; sólo ciphertext en `.fcm-local-review/credential.dpapi`, carpeta D: ignorada por Git, sin redirección, DACL privada del usuario/SYSTEM comprobada. No plaintext ni owner/token Supabase/clave Routes en el archivo. Clave navegador distinta de servidor; el launcher no pasa credencial DB o clave Routes al proceso Next. DPAPI requiere el mismo perfil Windows: **no protege contra un proceso ya ejecutándose como ese usuario**, ni constituye un vault compartido. No se declara borrado seguro de memoria.

Referencias primarias de la alternativa adoptada: [ProtectedData](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata?view=windowsdesktop-9.0), [DataProtectionScope](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.dataprotectionscope?view=windowsdesktop-9.0). Las políticas/cartografía y costos están en el [benchmark previo](B2_GOOGLE_ROUTE_REVIEW_UI_2026-09-30.md); no se asume gratuidad de la cuenta.

## Presupuesto y recorrido real

Permiso acotado reutilizado: máximo **una carga Maps y una tentativa Routes**, tramo US nominal sin intermedios, sin retries. El launcher conserva marcadores exclusivos `map.attempt` / `routes.attempt` en la misma carpeta privada. Sólo versión, HEAD, vencimiento, instante de reserva y clase; no geometría, distancias, entradas, identidad o claves. Reserva atómica antes del proveedor. La reserva Maps queda ligada al usuario/organización en memoria antes de aceptar Routes; un reinicio no reconstituye esa reserva ni el presupuesto. No es cuota mensual/account-wide ni defensa frente a manipulación por el propio usuario local.

1. Chrome abrió `/scenarios/benchmark/route-review`: sesión existente Supabase, organización HeyMarksman y rol ADMIN visibles; sin repetir login ni mapa al entrar.
2. Un consentimiento/clic inició config autenticada no billable, reserva de mapa, carga Maps, y candidato Routes. Mapa presente; mensaje «Candidato recibido · sólo esta vista · no guardado ni aprobado.» y etiquetas de distancia/tiempo visibles. No se archivaron los valores ni la geometría.
3. Restricciones de camión, domicilios/cruce y peajes permanecieron sin validar/pendientes; la pantalla indicó que no está lista para cotizar. DRIVE no se presenta como ruta truck certificada ni mapa D2D completo.
4. Borrar vista retiró las observaciones; recarga conservó organización/sesión y no restauró resultado/mapa. Un clic posterior llegó sólo a config y mostró presupuesto agotado **antes del SDK/proveedor**, sin segundo evento Google.
5. Proceso independiente descifró la copia, conectó con el rol limitado y repitió readback: 17 tablas, misma expiración y cupos 0 Maps / 0 Routes, sin nueva rotación. Esto prueba reutilización del credential y persistencia del límite, **no un reinicio integral Web/API ni renovación Auth por vencimiento**.

Consumo observado en esta ejecución: una carga solicitada Maps y una tentativa Routes con resultado; saldo gratuito, facturación de la cuenta y precio real no verificados. Capturas sólo de pantalla vacía/bloqueada, nunca cartografía o respuesta Google. No se accedió a otras pestañas o aplicaciones para el recorrido.

## Verificación automatizada y límites

- API: 254/254 PASS en seis archivos afectados (126 API, 49 cliente, 24 plugin, 43 política local, 9 frontera API, 3 credencial/presupuesto). Web: 26/26 PASS en dos archivos (21 pantalla, 5 mapa). Son pruebas locales simuladas, no aceptación remota.
- Typechecks API/launcher y web PASS. Después de la última corrección del helper, launcher typecheck y tres pruebas de credencial volvieron a PASS; `git diff --check` PASS (advertencias CRLF, no errores).
- Probes reales: `/health` y `/ready` 200; POST `/quotes` 403; config Google anónima 401. Ninguno llama a Google.
- Se corrigieron dos fallos locales: compatibilidad PSModulePath Windows PowerShell 5 frente al proceso PS7; chequeo de secuencias PostgreSQL mediante CASE para no evaluar privilegios de secuencia sobre relaciones no secuencia. Ambos detuvieron intentos previos antes del ALTER/archivo de credencial; lectura real final satisfactoria.

Cambio de cuenta, segundo tenant, renovación por expiración y ruta de camión no certificados en esta ejecución; las pruebas mock de roles no los sustituyen. No se recalcularon cotizaciones ni se publicaron bases históricas. Próximo resultado de negocio: completar evidencia del tramo MX, cruce y peajes por configuración vehicular del piloto, junto con exposición/ciclo compatibles, antes de adoptar kilómetros/costos en CFU/CVU. No ampliar presupuesto o scope Google para ello sin autorización puntual.

## Reanudar y rollback

Reanudar sin `--recover-credential`: `apps/api/scripts/resume-local-review.ts --start-web`, desde el worktree verificado y dentro de vigencia; arranca SELECT y Google deshabilitado por defecto. `--review-google` requiere la compuerta exacta del presupuesto autorizado, pero cupos agotados siguen en cero. **No borrar marcadores, no volver a crear/resetear rol para reponer el cupo.** La contraseña existente hace que `--recover-credential` rechace otra rotación automática. Cambiar HEAD/branch detiene el launcher y exige revisar el nuevo alcance.

Rollback local: detener sólo los procesos de este launcher; retirar sólo las adiciones de este corte a launcher/helpers, compuertas, interfaz/tests y documentación, sin restaurar/eliminar cambios ajenos. Mantener marcadores gastados mientras la aprobación siga vigente. El proceso se cierra al vencimiento original. Borrar copia cifrada o revocar/eliminar rol dedicado requiere una acción controlada y autorización; aquí **no se elimina ni revoca**. Contraseña previa no es recuperable, por lo que no se promete revertirla: recuperación posterior sería otra operación autorizada sobre el mismo rol. Auth, datos y producción no requieren rollback porque no cambiaron.

Modelo recomendado: **GPT-6.1 Sol alto** para credencial/frontera de seguridad, **medio** para recorrido real/documentación. No cambio de selector ni tokens/costo del modelo medidos. Habilidad de pruebas orientó regresión dirigida y distinción real/mock; habilidad de navegador orientó sesión, limpieza y evidencia sin contenido cartográfico.
