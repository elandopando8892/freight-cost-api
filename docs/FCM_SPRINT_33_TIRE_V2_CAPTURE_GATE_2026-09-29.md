# Sprint 33 — puerta de captura de llantas v2

Estado: **bloqueado para captura real en Preview; defensa técnica terminada**. Modelo recomendado: GPT-6 Sol, esfuerzo alto por seguridad multitenant y evidencia económica. No se cambió UI, por lo que no se añadió un wireframe.

## Evidencia del corte

El esquema de Neon staging `broad-art-99750179` tiene 46/46 migraciones y las dos tablas v2 con RLS habilitada y forzada. La inspección read-only con la conexión exacta de API Preview encontró que su rol efectivo tiene `BYPASSRLS`. Por eso la bandera `FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED` sigue apagada. La única cuenta limitada visible es `fcm_tire_s15_app`, creada para la base aislada del Sprint 15; en `neondb` no puede leer usuarios ni la tabla v2 y no sirve para este Preview. La ruta GET v2 del deployment existente respondió 404, coherente con la bandera apagada.

`apps/api/src/modules/cost-bases/tire-cohort-v2.routes.ts` ahora valida al registrar rutas habilitadas que el rol runtime no sea superusuario ni tenga `BYPASSRLS`, que existan las dos tablas con RLS forzada y que el rol tenga SELECT/INSERT/UPDATE. Un fallo impide registrar la captura. La bandera apagada no consulta la base en el arranque de estas rutas. Las pruebas de ruta v2 verificaron ambos casos: registro habilitado con rol seguro inyectado y rechazo cuando la comprobación falla.

La validación aislada con PostgreSQL 17 desechable y rol sin privilegios de bypass pasó 17/17 pruebas de RLS/persistencia, 46 migraciones, respaldo y restauración. Las pruebas unitarias enfocadas v2 pasaron 17/17 y el typecheck API pasó. Esto **no** demuestra aislamiento en el Preview actual ni una captura de datos reales.

## Brecha de datos

El contrato v2 representa **una llanta de un activo y un ciclo de uso**. Requiere identificador de carcasa, configuración/posición, país y operador que soporta el costo, fecha y lectura de instalación, desglose del costo instalado y su evidencia, y fecha/lectura e inspección al retirar la llanta. Las referencias públicas disponibles en el repositorio —IMT, TTI y catálogos— documentan magnitudes o precios de referencia; no prueban esos eventos de una flota. Construir un registro v2 a partir de ellas exigiría inventar datos. No se registró una muestra sintética en Neon ni se adoptó un importe a CFU, CVU o cotizaciones.

## Criterio para cerrar la captura real

1. Preparar un rol de aplicación sin `BYPASSRLS`, con acceso delimitado al staging verificado, y usarlo sólo en un par nuevo API/Web Preview. Volver a comprobar los grants y el rol efectivo antes de habilitar la bandera. No cambiar la conexión compartida ni el alias de producción.
2. Disponer de al menos un ciclo de llanta documentado con las evidencias anteriores y autorización para registrarlo como investigación. Las fuentes públicas pueden acompañar la comparación, pero no reemplazan el ciclo observado.
3. Hacer POST autenticado, repetirlo con el mismo request ID para comprobar idempotencia, releer por comparison key, comprobar la huella y `researchOnly=true`, y probar que otra organización no puede leerlo. La prueba local de dos tenants no sustituye esta aceptación.
4. Conservar `parameterWriteAllowed=false` y `quoteEligible=false`; documentar resultado y recuperación. Si la captura falla tras activar la bandera, deshabilitarla en ese Preview y conservar los snapshots para diagnóstico.

El sprint técnico de seguridad puede cerrarse con este commit. El sprint de captura autenticada queda pendiente de rol runtime seguro y de un ciclo documentado; una cifra pública por vehículo-km no satisface esa puerta.
