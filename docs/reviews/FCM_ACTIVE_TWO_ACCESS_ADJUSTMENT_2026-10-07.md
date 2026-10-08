# Ajuste local: dos accesos, historial conservado

Resultado: control local de acceso y plan de conciliación desarrollados y probados. **No desplegado ni activado remotamente; sprint productivo no cerrado.** Instrucciones humanas: «solo son sales y jgonzalez» y «continuaa con el siguiente ajuste». Únicos destinatarios: sales@heymarksman.com y jgonzalez@xbfreight.com. No invitaciones a terceros, nuevas identidades Auth, cambio de roles, importes o Site URL.

## Benchmark proporcional y decisión

La [documentación de usuarios Supabase](https://supabase.com/docs/guides/auth/users) separa identidad Auth, token y autorización sobre recursos; advierte que user_metadata es editable y no sirve para autorizar. El código actual ya verifica JWKS/issuer/audience/sesión y conserva roles/organizaciones FCM en Neon. El problema era la posterior auto-provisión y tratar toda fila histórica como persona que debe volver a acceder.

| Alternativa | Capacidad y efecto | Decisión |
| --- | --- | --- |
| Control de acceso en el backend FCM, pares correo/UUID aprobados | Reutiliza verificación JWT y membresía existente; no cambia otras apps ni agrega proveedor/dependencias | Elegida para este corte |
| Hook o metadata global del Auth compartido | Puede cambiar autorización/provisión de otras aplicaciones Rateware | Fuera de alcance |
| Borrar/recrear autores históricos o darles cuentas nuevas | Arriesga referencias de auditoría/cotizaciones o reactiva accesos no solicitados | Rechazada |

Es una capacidad estándar de autorización, no una innovación ni un nuevo stack. Se aplicaron Supabase, codebase-design y TDD; systematic-debugging permitió corregir la cola residual de mocks sin relajar el filtro. verification-before-completion se aplicó al cierre. Sin cambios UI: no se diseñaron nuevas pantallas o wireframes.

## Contrato implementado

`FCM_AUTH_ACCESS_SCOPE` es JSON servidor, versión1, exactamente dos pares email/subject. Sólo acepta los correos aprobados, UUIDs distintos y sin campos adicionales de rol/tenant. Los UUIDs no son credenciales, pero el valor es una política de autorización y debe gestionarse como configuración confiable; nunca NEXT_PUBLIC ni tomada del navegador. Un JSON bien formado **no acredita** por sí solo consentimiento o propiedad del correo.

- Después de verificar JWT, rechaza un sujeto fuera del alcance antes de consultar membresía. Además valida la correspondencia del vínculo guardado con correo y UUID.
- En modo restringido sólo resuelve miembros ya vinculados. No escribe User, Organization, invitaciones o supuestos; no ejecuta ensureActiveSet ni el fallback de auto-provisión. Roles/tenant salen de la fila existente, no de metadata o del JSON.
- Token inválido: 401. Identidad excluida/vínculo incompatible/membresía faltante: 403. Política requerida ausente/inválida: 503. Respuestas genéricas, sin exponer valores de política.
- Vercel Production exige política válida tanto al construir como al autenticar; no cae silenciosamente al signup SaaS. El builder rechaza antes de inspección SQL/compilación. Los modos de inspección sin publicación permanecen de sólo lectura y terminan con error preventivo.
- Non-production sin política conserva compatibilidad previa; **no afirma** acceso limitado. Para probar el piloto local/preview se debe proporcionar la política o exigirla con FCM_AUTH_SCOPE_REQUIRED=true. La configuración no se instaló en ningún entorno remoto.

## Partición de inventario y evidencia

Consulta Auth de sólo lectura en rateware-prod `alqjqzqagdmcywpjtnnr`, limitada a los dos correos: ambas identidades confirmadas, permanentes, sin eliminación ni bloqueo vigente. No se efectuó login en su nombre ni se crearon cuentas. El plan pure scoped-access-plan conserva y sella todas las filas históricas mediante su fingerprint; sólo propone vínculos para los aprobados. Identidad ausente, no verificada, ambigua o sujeto cambiado bloquea cualquier propuesta parcial. No emite SQL ni autoriza escrituras.

Preparación privada local, fuera de Git y de Claude: `D:/andre/validation/fcm-production-cutover-20261007/active-two-scope-v1.json` y `active-two-plan-v1.json`. Resultado contra el **inventario productivo previamente capturado**, no una nueva lectura Neon: una propuesta de vínculo existente (sales), una membresía FCM pendiente (jgonzalez), tres registros históricos preservados, retiro final bloqueado, writesAuthorized=false. La snapshot deberá refrescarse antes de escribir; no se inventaron rol, organización o ID para la membresía pendiente.

## Verificaciones y límites

- TDD: exclusión de actores, ausencia de efectos automáticos, validación de política, partición y gate de build fallaron antes de implementarse. Se observó red/green; clearAllMocks conservaba respuestas once no utilizadas tras el rechazo temprano y se sustituyó por resetAllMocks en la fixture.
- Última suite focal: **124/124** en10archivos, incluyendo HTTP normal/read-only con claims y DB simulados, verificación de opciones JWT y los guards originales de migración. No equivale a OAuth real ni aislamiento DB real.
- TypeScript API y scripts estrictos: exit0. API build-only completo: exit0, Prisma generado y compilación, sin migraciones/servidor/SQL.
- `npm test` completo ejecutado: API3433casos aprobados/31omitidos; una suite falló: tire-calibration-rls-postgres.test.ts exige FCM_TEST_ADMIN_DATABASE_URL contra Postgres desechable loopback fcm_tire_s8. No se eliminó ni se omitió el guard. Web264casos provienen de replay del cache de Turbo, **no de ejecución nueva**. No hay PASS de suite global ni CI completa. La suite completa empezó antes de la última ampliación de pruebas HTTP; las afectadas se repitieron en los124casos finales.
- No se verificó recarga/renovación/login nuevo ni se reintentó la vía de navegador previamente bloqueada. No hubo llamadas IA de negocio, escrituras Neon/Auth, cambios de cuentas compartidas ni nuevas dependencias/infraestructura.
- El escaneo del workspace señaló patrones Google API key en nueve HTML capturados preexistentes sin seguimiento; valores no leídos ni impresos y archivos preservados. No se relajaron reglas. Se verificó un export byte-exacto del índice Git de1,598archivos y ese paquete pasó el escáner. Las capturas ajenas y los JSON de configuración privada no se incorporaron al índice/paquete.

## Pendiente para el siguiente corte

Este control no resuelve por sí solo la persistencia histórica: schema.prisma sigue exigiendo User.supabaseId y el SQL histórico de finalización sigue exigiendo todas las filas vinculadas. **Ambos se conservaron sin falsificar checksums, ejecutar o marcar migraciones applied.** No pasar un inventario filtrado al runner antiguo ni borrar los registros excluidos para que el guard pase.

El siguiente corte debe definir/probar el contrato de autores históricos sin login, conservando IDs y relaciones, y preparar la membresía pendiente de jgonzalez con organización/rol autorizados. Después: ensayo SQL/restore, revisión consolidada Opus dentro del presupuesto vigente, respaldo verificado, configuración de la política, publicación pareada y aceptación autenticada. Retirar kindeId sólo cuando el contrato de persistencia y rollback lo permitan.

Modelo/consumo: Sol6.1/high solicitado, native model/effort efectivo desconocidos cuando el host no los expone; Opus5.5/high previsto para la revisión consolidada, **cero inferencias Claude en este corte**, sin nueva reserva/cupo/reintento/fallback. No se modificó el kit ni su ledger. Duración de las verificaciones amplias:8m49s; no supone disponibilidad de cuota ni ausencia garantizada de cargos del proveedor.

Rollback: aún no hay estado remoto nuevo. Revertir sólo el commit de este ajuste si procede, preservando cambios ajenos y documentos de evidencia; no restaurar archivos mediante reset destructivo. Para una activación futura, no quitar la política y reabrir signup: revertir al par validado y conservar bloqueo de acceso durante el rollback de persistencia. La política no reactiva ni modifica cuentas de otras apps.
