# B2 · Relevo propio MX/US con la misma caja

## Resultado y alcance

Antes faltaba elegir la variante física de referencia. El usuario eligió **relevo entre tractores propios MX/US conservando la misma caja seca 53′** para México DF → Fort Smith AR 72916 vía Puente III / World Trade Bridge. El preflight ya registra esa elección y no vuelve a pedirla. No acredita transportista, permisos, operación observada, fecha, tiempos, retornos ni importes.

## Reutilización y trazabilidad

Se reutilizaron el expediente y el compositor existentes: versión nueva frente a sobrescribir evidencia o construir otro modelo. La revisión previa está en [reparto binacional](B2_BINATIONAL_CYCLE_ALLOCATION_2026-09-30.md); no se repitió investigación para registrar una decisión del usuario.

La nueva versión [B2_BINATIONAL_OWN_RELAY_SELECTED.json](B2_BINATIONAL_OWN_RELAY_SELECTED.json) conserva el corte de fuentes anterior y sólo agrega la elección y un pin del original. SHA-256 nuevo: `9e169339515fb467f5207748d3c0676bed1dbb6cfb30b01f0696b56ccfd4a775`. El original permanece intacto: `5a6cce075e02b2dd1e7df2d6339f9f374618e22d950a3f73ccf7541390338827`. El revisor rechaza alteraciones de investigación encubiertas como selección. Los campos de operación real siguen sin confirmar; la elección está separada explícitamente.

## Validación y límites

42/42 pruebas dirigidas (16 de cruce y 26 de readiness), typecheck estricto de scripts/test y diff check PASS. CLI local con los cuatro anexos devuelve exit 2 esperado, B2 PARTIAL, 0/4 gates y selección física resuelta; cuatro pins de cruce verificados. Sin costos habilitados, adopción ni compositor monetario. Las 136 pruebas del corte anterior son evidencia histórica, no reejecutadas aquí. No UI ni wireframe nuevos, persistencia de negocio, despliegue, DB, Auth o llamadas de proveedor.

## Siguiente y recuperación

Completar exposición/ciclo y presupuestos compatibles de tractor MX, tractor US y caja compartida, con fuentes públicas e inclusiones del grupo sin duplicar administración; después CFU/CVU. Fecha de servicio sigue pendiente. Cualquier UI llevará wireframe MARKSMAN. Recomendación: GPT-6.1 Sol medio para esta selección; alto para calibración y doble conteo. Sin cambio verificable de modelo ni tokens medidos.

Rollback documental: pasar `B2_BINATIONAL_BORDER_2026-09-30.json` como cuarto argumento al CLI restaura el estado previo sin selección. No hay efecto remoto que revertir; no tocar cambios ajenos.
