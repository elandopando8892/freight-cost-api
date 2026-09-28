# ADR-006: revisión económica con un único responsable

Fecha: 2026-09-28. Estado: aceptado para el preview por instrucción del usuario: «no hay segundo revisor, continua».

## Decisión

Un autor ADMIN/OPERATOR puede asignar un ADMIN distinto del mismo tenant en modalidad explícita `ECONOMIC_ONLY`. Una decisión económica ENDORSED deja el expediente en `ECONOMIC_REVIEWED`; RETURNED conserva el significado de devolución. La bitácora registra la modalidad, responsables, fundamento, revisión y huellas.

No se crea una segunda identidad, no se reutiliza al autor como revisor y no se afirma un dictamen independiente. La bitácora de tres eventos y el expediente constituyen la evidencia de revisión individual; no se genera `TireCalibrationApprovalPackage`, que conserva su significado de evidencia con revisión independiente. Publicar parámetros, activar bases y habilitar cotizaciones permanecen fuera de estas rutas.

Los expedientes existentes conservan `DUAL_REVIEW` por default. Sólo una asignación explícita en DRAFT selecciona revisión individual. La modalidad no puede cambiarse durante una decisión ni convierte expedientes históricos. La migración es aditiva y mantiene RLS forzada, restricciones de tenant y evidencia append-only.

Esta decisión reemplaza el requisito universal de tres personas en ADR-004/ADR-005 para la modalidad individual. Los requisitos anteriores siguen aplicando a DUAL_REVIEW.

## Aceptación

La evaluación de preview utiliza dos identidades diferentes cuando reviewMode es ECONOMIC_ONLY: autor y ADMIN económico. Exige migración específica, login, recarga, renovación, fuente vigente, decisión persistida y lectura posterior. Debe declarar en falso los indicadores de dictamen independiente y paquete independiente. No basta con que el despliegue responda 200.

## Acceso al preview

Se copian sólo los tres vínculos de identidad ya verificados de staging a la base desechable, preservando IDs, orgId, supabaseId y roles. No se crean usuarios en Supabase. `FCM_PREVIEW_EXISTING_USERS_ONLY=true`, condicionado a VERCEL_ENV=preview, impide altas automáticas y la creación de supuestos económicos por defecto al autenticarse. No modifica otros deployments.

## Rollback

Retirar el deployment del preview y conservar los eventos de revisión. No revertir la migración ni eliminar la columna mientras existan expedientes ECONOMIC_ONLY. Para una base desechable que deba retirarse, respaldar primero la evidencia que se decida conservar. La credencial del rol exclusivo se rotó; cualquier redeploy anterior necesita la credencial vigente. No se toca `neondb`, Auth ni producción.
