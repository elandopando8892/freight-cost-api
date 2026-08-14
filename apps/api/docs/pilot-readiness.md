# Preparación de piloto

`GET /pilot/readiness` es una compuerta de release de solo lectura. Evalúa el
perfil de carrier, base activa, ruta productiva, snapshots reproducibles de
cotizaciones confirmadas, RateBook publicado, colas de aprobación y escenarios,
migraciones aplicadas, configuración AI y evidencia de staging.

Un `BLOCK` impide pasar a QA controlado. `WARN` no bloquea por sí mismo; por
ejemplo, Rateware puede quedar fuera del alcance del piloto.

`GET /pilot/evidence.csv` descarga un registro por control con organización,
release, verificaciones seleccionadas, estado, detalle y módulo. No contiene
secretos, prompts, importes ni datos de cotizaciones. Esta evidencia local no
prueba despliegue, conectividad, recepción Rateware ni comportamiento E2E.

## GO adaptado al roster del tenant

Un administrador puede registrar `NO_GO` inmediatamente. Cuando el tenant tiene
un único ADMIN, esa identidad puede crear ambas verificaciones y cerrar GO tras
confirmar el `RELEASE_SHA` exacto. Con dos o más ADMIN, se conserva la doble
aprobación y ningún aprobador puede ser autor de la evidencia seleccionada.

- Un ADMIN único crea la decisión GO con `201` en una aprobación.
- Con varios ADMIN, la primera aprobación responde `202`, repetirla con la
  misma identidad responde `409` y la segunda crea GO con `201`.
- Si cambia release, verificación, timestamp, responsable o check, cambia la
  huella y las aprobaciones anteriores no cuentan.
- `NO_GO` cierra cualquier ronda pendiente.

Cada aprobación conserva razón, snapshot y responsable. La decisión final
conserva las aprobaciones requeridas. Ningún registro despliega, publica, activa o envía
datos a Rateware/Gmail.

## Protocolo operativo

1. Ejecutar `npm run verify:release` desde la raíz. Para un piloto con Rateware,
   usar `npm run verify:release:rateware`. Un resultado local no comprueba
   Vercel, Neon, Kinde, OAuth ni integraciones remotas.
2. Mantener secretos exclusivamente en el gestor autorizado y registrar las
   constancias de rotación requeridas sin imprimir valores.
3. Respaldar la base y comprobar conectividad real antes de aplicar migraciones.
4. Ejecutar smoke y recorrido humano en staging con el ADMIN del tenant.
5. Descargar el CSV, adjuntar evidencia E2E y confirmar el SHA al registrar GO,
   o registrar NO-GO.

Para respaldo, migración, despliegue y rollback consultar
[`production-cutover-runbook.md`](./production-cutover-runbook.md).
