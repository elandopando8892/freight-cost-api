# Retiro y reactivación de bases — local, no desplegado

## Resultado

ADMIN puede retirar o reactivar una base con motivo y confirmación. Retirar no borra versiones ni estimaciones; bloquea nuevas revisiones, publicaciones, cálculos y guardados. Reintentos de guardados ya confirmados recuperan el mismo resultado, incluso durante retiro. Reactivar conserva la versión publicada seleccionada, sin renovar vigencias ni verificar fuentes comerciales.

UI y wireframe: sección Administrar disponibilidad; estado textual Retirada/Disponible; motivo 10–500 caracteres y checkbox. Reintentos conservan cuerpo/clave, bloqueando controles relacionados hasta confirmar. La versión seleccionada se muestra suspendida mientras la base está retirada. Historial visible: últimas 20 transiciones; API paginada permite consultar anteriores.

API POST `/partner-bases/:baseId/lifecycle`: clave idempotente, estado deseado, revisión esperada y versión activa esperada. El bloqueo de la misma fila usado por calcular/publicar evita guardados nuevos concurrentes con retiro. El contador de estado impide repetir acciones antiguas después de retirar/reactivar. Un replay de clave ya ejecutada devuelve su comprobante original, no vuelve a cambiar el estado.

## Esquema y alcance

Nueva migración aditiva `20260923000300_partner_tariff_lifecycle`: dos columnas en PartnerTariffBase, tabla PartnerTariffLifecycle, FK compuesta por organización/base, uniques, guardas de actualización. Cada transición registra actor, motivo y fecha; las modificaciones de auditoría fallan por trigger. Estado y evidencia se escriben en una sola transacción. No existe endpoint de eliminación.

Worktree D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830, rama codex/quote-integrity-sprint, HEAD inicial 419b10c202d396eed1801e5b3ce3e6393d4faf6e. Cambios anteriores conservados; sin commit ni deploy. AGENTS C: ausente; AGENTS codex-home vacío; instrucciones Next y documentación de componentes leídas antes de cambios UI.

## Evidencia

- TypeScript API aprobado antes de ejecutar PostgreSQL.
- 37/37 pruebas web y build Next aprobados; lint focalizado y diff-check sin errores.
- Browser sintético: base retirada sin acciones de cálculo/publicación/revisión, reactivación con motivo y confirmación. Iframe CSS 390×844: clientWidth=371, scrollWidth=371; sin overflow horizontal observado. La captura y el DOM son evidencia de componentes, no de sesión o persistencia real. No se pulsó Reactivar contra datos reales.
- Primera ejecución PostgreSQL: 43 migraciones aplicadas y replay sin pendientes; 19 pruebas aprobadas, dos timeout a los cinco segundos (recorridos de creación y retiro completos), mientras corría build Next. No se ocultó ese fallo. Se fijó timeout de integración de 30 segundos sólo para la suite de bases; los bloqueos retenidos conservan límite propio de 15 segundos. Se repite desde un contenedor vacío nuevo.

Repetición final: **21/21 aprobadas** (12 bases, 9 estimaciones), 43 migraciones y replay correctos. Suite bases 3.07 s total, suite estimaciones 1.34 s; sin relajar aserciones. Contenedor desechable eliminado al terminar. Datos e identidad sintéticos; no equivalen a OAuth ni flujo remoto.

## Autorización requerida para el siguiente paso

No hay autorización nueva de migración remota. Propuesta limitada al preview aislado de FCM y a los proyectos Vercel freight-cost-api y freight-cost-web, verificados en la entrega anterior; volver a verificar destinos, variables y ledger en lectura antes de cualquier aplicación. No usar DATABASE_URL compartida/producción.

Únicamente estas migraciones candidatas:

| Migración | SHA256 local |
| --- | --- |
| 20260923000200_partner_tariff_bases | 392DA134091CBC9570FF88E6F1A7F4EC479B018F7C5198C6329C1F39C28AAD27 |
| 20260923000300_partner_tariff_lifecycle | 57644104EAB7A3EE37B00EF56BED10D50F2DA050A41C41AA09A85552AF884A06 |

La observación anterior fue ledger 40; objetivo propuesto 42, con 43 artefactos locales porque `20260830000200_finalize_supabase_identity` sigue excluida. Si cambia el destino/ledger/hash, detenerse y reconciliar. Requiere backup y restauración de prueba, ejecutor selectivo nuevo validado en PostgreSQL y autorización puntual; no ampliar el ejecutor anterior de cuatro migraciones ni usar migrate deploy general remoto.

Después, frontend/API del mismo commit limpio sólo preview, sin aliases productivos ni cambios de Auth. Recorrido autenticado con una base y tarifas sintéticas claramente marcadas, guardar/reabrir/retirar/reactivar, verificar histórico; permisos reales y renovación siguen pendientes. Las tarifas comerciales y aceptación económica continúan siendo otra condición de salida.

## Rollback y límites

No hay cambio remoto que revertir. Runner elimina sólo su contenedor desechable local y fixtures; no modifica proveedores. Un rollback futuro de aplicación mantiene tablas/evidencias y devuelve el frontend/API a la pareja anterior; no DROP ni restore destructivo sin autorización adicional. Código local: revertir únicamente este incremento, preservando cambios previos.

Sin usuarios/Auth, operaciones comerciales, consumo de IA del producto, infraestructura remota ni producción. Guía design-handoff aplicada a confirmación, estados y wireframe. Modelo recomendado: Astra alto para integridad/transiciones; medio para pruebas/documentación, sin afirmar cambio de modelo de sesión.
