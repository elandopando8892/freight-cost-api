# ADR-004: expediente append-only para revisión de calibración de llantas

**Status:** Proposed
**Date:** 2026-09-27
**Deciders:** responsable económico de XBF, responsable técnico de FCM y revisor independiente

## Context

El Sprint 5 produce propuestas de calibración reproducibles, pero no conserva decisiones humanas. Sprint 6 necesita persistir el borrador completo, verificar que la fuente no cambió entre etapas, exigir separación de funciones y producir un paquete de evidencia. No existe autorización para migrar el esquema compartido, reutilizar producción ni publicar parámetros.

Requisitos no funcionales: trazabilidad inmutable, reintentos idempotentes, detección de concurrencia/manipulación, recuperación tras reapertura, rollback simple y cero efecto en cotizaciones.

## Decision

Implementar primero un adaptador local Node 24 con SQLite explícito y ledger append-only encadenado por SHA-256. Cada comando incluye `requestId`, revisión esperada, huella de propuesta y huella vigente de agregación. El flujo exige tres identidades distintas: analista, responsable económico y revisor independiente.

El estado `REVIEWED` sólo genera evidencia. El paquete mantiene constantes `publicationEnabled=false`, `parameterWriteAllowed=false` y `quoteEligible=false`, y enumera dos autorizaciones posteriores: persistencia en esquema compartido y publicación de parámetros en producción.

Este adaptador no se importa en rutas API ni representa almacenamiento multi-tenant. Una futura implementación productiva deberá conservar el mismo contrato dentro de una transacción que lea la huella vigente desde la fuente autoritativa.

## Options Considered

### Option A: ledger SQLite local append-only

| Dimension | Assessment |
|-----------|------------|
| Complexity | Media |
| Cost | Sin costo de infraestructura adicional |
| Scalability | Sólo validación local |
| Team familiarity | Patrón ya usado por expedientes de mantenimiento |

**Pros:** persistencia real y reabrible, rollback por archivo, sin migración, prueba de integridad y concurrencia.

**Cons:** sin Auth, tenant ni disponibilidad compartida; la frescura proviene de una huella entregada por el llamador.

### Option B: ampliar `ApprovalRequest` productivo

| Dimension | Assessment |
|-----------|------------|
| Complexity | Alta |
| Cost | Operación y migración del esquema compartido |
| Scalability | Adecuada para producción |
| Team familiarity | Infraestructura existente, pero acoplada a RateBooks |

**Pros:** Auth, tenant y consulta compartida existentes.

**Cons:** exige migración; `ApprovalRequest` requiere `rateBookId`, sus acciones no incluyen calibración y contempla excepción de administrador único incompatible con la separación requerida.

### Option C: estado sólo en memoria/fixture

| Dimension | Assessment |
|-----------|------------|
| Complexity | Baja |
| Cost | Nulo |
| Scalability | Ninguna |
| Team familiarity | Alta |

**Pros:** entrega rápida del wireframe.

**Cons:** no prueba persistencia, idempotencia, reapertura, integridad ni concurrencia; incumple el objetivo del sprint.

## Trade-off Analysis

La opción A prueba las propiedades difíciles sin pedir autoridad para modificar producción. Añade trabajo frente a un fixture, pero reduce el riesgo de diseñar la migración compartida sobre supuestos no verificados. No sustituye la solución productiva: produce el contrato que ésta deberá respetar.

## Consequences

- Se pueden validar secuencia, roles, huellas y paquete mediante pruebas deterministas.
- No existe excepción de autoaprobación, incluso si hubiera un solo administrador.
- La decisión de revisión no puede activar una base ni cambiar el motor.
- El futuro adaptador productivo tendrá que resolver modelo multi-tenant, índices, transacción de frescura, permisos y retención.
- Un cambio de cohorte invalida el uso del paquete; se requiere nueva propuesta/versionado.

## Action Items

1. [x] Añadir esquema estricto y verificación criptográfica de la propuesta completa.
2. [x] Implementar ledger local append-only con idempotencia y control de revisión.
3. [x] Exigir tres identidades distintas y orden de decisiones.
4. [x] Generar paquete no ejecutable con autorizaciones pendientes.
5. [x] Añadir wireframe para trazabilidad y vigencia.
6. [ ] Diseñar migración multi-tenant y RLS; requiere autorización separada.
7. [ ] Conectar Auth y directorio de usuarios; requiere decisión de roles.
8. [ ] Autorizar publicación productiva sólo después de pruebas autenticadas.
