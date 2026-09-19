# C1: decisión operativa antes de modificar la base

Estado: propuesta, no ejecutada. Revisión local: 19 septiembre 2026, rama `codex/supabase-auth-slice`, HEAD `ea1a0f1c0db1e50696512a6bb4e14f738da3f2c7`, worktree D: limpio al comenzar. Modelo recomendado: Astra, esfuerzo alto.

## Decisión necesaria

¿XBF-XB-PILOT debe representar costos de flota propia/financiada con el mismo tractocamión cruzando México–EE. UU., o un servicio subcontratado/con intercambio de tractor?

No son perfiles equivalentes. `profileConsistencyIssues` actualmente sólo admite `OWNED_FINANCED`, `FULL_FLEET`, `Truck Trailer` y, para CROSS_BORDER, `THROUGH_TRACTOR`. Rechaza `BROKERED`, `LEASED`, `YARD_TRANSFER` y `PARTNER_HANDOFF` porque faltan sus modelos matemáticos. Que existan en el enum no demuestra soporte. No modificar etiquetas para hacer pasar una operación incompatible.

## Propuesta condicionada a la respuesta

Si corresponde al modelo de flota propia con cruce directo, preparar una nueva versión DRAFT clonada explícitamente de la versión histórica verificada de XBF-XB-PILOT. Conservar parámetros y política de cálculo originales; no asumir OPERATIONAL_V3 ni número de siguiente versión. Perfil candidato: CROSS_BORDER, MX/US, D2D Export e Import (el contrato exige ambas), Truck Trailer, Dry Van, Single, B1, One Way, OWNED_FINANCED, FULL_FLEET, THROUGH_TRACTOR. El responsable debe confirmar también equipo, operador y servicio; no ampliar automáticamente al perfil por defecto.

Si la operación requiere terceros o intercambio, este perfil no sirve: identificar los componentes reales del costo y presentar el cambio de alcance del motor para aprobación. Una simulación compatible no cerraría el MVP solicitado.

## Límites y preflight obligatorio

Esta propuesta NO autoriza crear, publicar ni activar versiones, ni guardar cotizaciones. Antes de solicitar ejecución: identificar entorno de datos real (preview no implica base aislada), organización, IDs exactos de base/versión, estado, política, perfil, parámetros y dependencias. Revisar impacto con la ruta GET existente y conservar evidencia sin secretos. No usar acceso directo a la BD para eludir el flujo gobernado.

Separar las autorizaciones: (1) crear/revisar borrador en destino identificado; (2) publicar/activar con impacto conocido; (3) crear y reabrir una cotización sintética QA-MVP-NO-ENVIAR en destino autorizado. Ningún envío ni operación comercial.

## Hallazgo de rollback: no activar todavía

`activateCostBaseVersion` exige perfil no nulo incluso al reactivar una versión anterior. Por ello **v1 sin perfil no es un rollback ejecutable mediante el flujo vigente**. No prometer “volver a v1” ni remover el guard para conseguirlo.

La activación desactiva la versión activa de la base, cambia el estado/política de la base y, si ésta es predeterminada, puede retirar la preferencia de otras bases del mismo alcance y organización. Esto excede una simple etiqueta de perfil.

Mientras no haya activación, conservar la versión histórica activa y el borrador sin activar mantiene el estado operacional previo; archivar un borrador, si se requiere, es una operación separada y autorizada. Antes de activar hay que demostrar un procedimiento de recuperación válido con los contratos actuales y la configuración afectada, o mantener la validación en un destino realmente aislado y autorizado. El rollback de código web/API no revierte datos.

## Evidencia y aceptación

Fuentes revisadas: `apps/api/src/modules/cost-bases/cost-base-profile.ts` (`profileConsistencyIssues`), `cost-bases.service.ts` (`createCostBaseVersion`, `updateCostBaseVersionProfile`, `publishCostBaseVersion`, `activateCostBaseVersion`, `resolveCalculationContext`). Evidencia del cálculo previo: `C1_CALCULATION_BLOCKER_2026-09-19.md`.

Después de resolver la decisión y autorizar efectos exactos: probar validación del perfil, revisión de impacto, cálculo con resultado explicable, guardado/reapertura consistente, consulta VIEWER y rechazo de escritura. No marcar A3 completo por aprobar solamente el esquema del perfil o el cálculo sin persistencia.
