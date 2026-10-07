# B2 · clave web local FCM creada y verificada

Fecha local: 2026-09-30. Usuario autorizó crear una clave exclusiva FCM con Maps JavaScript API y dos orígenes locales; no modificar Bidware. GPT-6.1 Sol · esfuerzo medio recomendado para configuración/readback; no selector de modelo cambiado ni consumo de tokens medido.

## Evidencia y alcance

Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. Política D:/andre/apps/codex-home/AGENTS.md y apps/web/AGENTS.md revisadas; trabajo ajeno conservado.

Reutilizada la revisión previa de seguridad de [la interfaz B2](B2_GOOGLE_ROUTE_REVIEW_UI_2026-09-30.md): adaptar una clave compartida exigiría cambiar su acceso; copiar Bidware no cumple la separación/restricción requerida. Se creó sólo la clave nueva limitada antes de pulsar Create.

Proyecto Google Cloud: rateware. Nombre: **FCM Maps Web Local**. Identificador de recurso (no secreto): b7a9e18e-309a-4eea-b787-2867174cad12. Fecha de creación visible: Sep 30, 2026, 6:38:15 PM GMT-6.

Readback de la credencial persistida: 1 API, **Maps JavaScript API**; Application restrictions **Websites**; exactamente `http://localhost:3001/*` y `http://127.0.0.1:3001/*`. Ningún wildcard Vercel ni dominio de producción.

La lista conserva Bidware con 35 APIs y Maps Platform API Key con 2 APIs, sin cambios. Se cerró el diálogo generado sin reproducir el valor de la nueva clave. No se copió, imprimió o almacenó el secreto; tampoco se abrió Show key. Evidencias visuales sin secretos: [nombre/API](B2_FCM_MAPS_WEB_LOCAL_2026-09-30.jpg) y [orígenes](B2_FCM_MAPS_WEB_LOCAL_ORIGINS_2026-09-30.jpg).

## Handoff privado y siguiente recorrido

Preparado **nuevo** apps/web/.env.local, ignorado por Git, con `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=` vacío. El usuario debe abrir Show key de **FCM Maps Web Local**, pegar sólo ese valor después de = y guardar. No utilizar la clave servidor Routes ni Bidware. El agente no debe leer/imprimir su valor tras la captura manual.

La configuración cloud está comprobada; **mapa real, restricciones en una carga real y flujo local SaaS autenticado aún no comprobados**. Las 234 pruebas del corte anterior siguen siendo evidencia local/simulada, no se repitieron por esta edición documental/configuración vacía. En este corte: cero cargas Maps JavaScript, cero solicitudes Routes, cero reintentos. No habilitación de APIs, cambio de cuotas/facturación, Auth/Neon/DB/usuarios/migraciones, producción, deploy, operaciones de negocio o IA de aplicación. No garantía de costo cero: saldo gratuito compartido no comprobado.

Siguiente único: configuración manual de browser key y autorización acotada para una carga de mapa más una consulta candidata, utilizando sesión/rol existentes y origen 3001. No activar backend real hasta ese paso. Tramo básico DRIVE no acredita camión; costos/peajes/ciclo no adoptados. B2 parcial, B1/E1 abiertos, cero adopciones y 0/4 gates.

## Confirmación de captura manual · 2026-09-30 19:02 GMT-6

Tras «listo» del usuario, comprobación local sin imprimir secretos: una entrada browser key, no vacía, formato compatible con el loader existente; distinta de la clave servidor Routes, que también está configurada. Ambos archivos permanecen ignorados por Git. Esto no verifica identidad del recurso Google, permisos efectivos, saldo de cuota, mapa o ruta reales. No se leyó el valor a la conversación ni se copió a otro archivo/proceso.

Rama/HEAD y worktree sin cambio; política y reglas web releídas, cambios ajenos conservados. Ningún listener detectado en los puertos locales inspeccionados 3000/3001/3002/4000/4317; no se iniciaron servidores ni se activó el backend. Cero solicitudes Google nuevas, sin repetir pruebas anteriores ni cambiar implementación. GPT-6.1 Sol · medio recomendado, no selector cambiado ni tokens medidos.

Siguiente decisión puntual: autorizar arranque local y una carga Maps más una consulta Routes Laredo, TX → Fort Smith, AR 72916, sin reintentos; saldo gratuito compartido no verificado, posible consumo facturable. Usar sesión existente sin cambios de Auth/datos/producción. Si no hay sesión válida, handoff de acceso al usuario; no sustituir por bypass o mock para declarar aceptación real. Tras la prueba, desactivar el backend local de revisión. Recuperación descrita abajo; no borrar la clave por esta confirmación.

## Recuperación específica (sin ejecutar)

Rollback no ejecutado. Si se decide cancelar, confirmar antes de deshabilitar/eliminar **únicamente** FCM Maps Web Local, identificador anterior, y sólo tras comprobar que no tiene consumidores. Nunca rotar/borrar Bidware ni Maps Platform API Key. Para retiro local, quitar sólo esta variable del archivo privado (sin afectar otras variables que el usuario añada), estas notas y las dos capturas; mantener cliente/evidencia anteriores y cambios ajenos. Ningún cambio de infraestructura o base de datos necesario.
