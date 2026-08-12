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

## GO con segregación de funciones

Un administrador puede registrar `NO_GO` inmediatamente. Un `GO` requiere dos
administradores distintos sobre la misma huella de readiness; ninguno puede ser
el autor del smoke o recorrido humano seleccionado.

- La primera aprobación responde `202` y queda pendiente.
- Repetirla con la misma identidad responde `409`.
- La segunda identidad crea la decisión GO con `201`.
- Si cambia release, verificación, timestamp, responsable o check, cambia la
  huella y las aprobaciones anteriores no cuentan.
- `NO_GO` cierra cualquier ronda pendiente.

Cada aprobación conserva razón, snapshot y responsable. La decisión final
conserva ambas aprobaciones. Ningún registro despliega, publica, activa o envía
datos a Rateware/Gmail.

## Protocolo operativo

1. Ejecutar `npm run verify:release` desde la raíz. Para un piloto con Rateware,
   usar `npm run verify:release:rateware`. Un resultado local no comprueba
   Vercel, Neon, Kinde, OAuth ni integraciones remotas.
2. Mantener secretos exclusivamente en el gestor autorizado y registrar las
   constancias de rotación requeridas sin imprimir valores.
3. Respaldar la base y comprobar conectividad real antes de aplicar migraciones.
4. Ejecutar smoke y recorrido humano en staging con cuentas controladas; sus
   autores no deben ser los aprobadores GO.
5. Descargar el CSV, adjuntar evidencia E2E y obtener dos aprobaciones GO de
   administradores independientes sobre la misma huella, o registrar NO-GO.

Para respaldo, migración, despliegue y rollback consultar
[`production-cutover-runbook.md`](./production-cutover-runbook.md).
