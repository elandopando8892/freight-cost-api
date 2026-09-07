# ADR-002: trazabilidad persistente de propuestas derivadas

- Estado: **Propuesto; no implementado**
- Fecha: 2026-09-07
- Alcance: Freight Cost Model Web/API y Neon/Prisma
- Dependencias: flujo actual `/quote?quoteId=...`, guardado de cotizaciones y auditoría existente

## Contexto

El MVP permite volver a cotizar desde el detalle de una cotización. La nueva captura
se prellena y el resultado muestra `Reapertura · ...`, pero esa relación hoy sólo queda
visible mediante la etiqueta y el contexto de pantalla. El registro guardado no tiene
un vínculo estructural con la cotización de origen.

La etiqueta es útil para la operación, pero no alcanza para reconstruir una genealogía
de propuestas, comparar derivaciones ni auditar quién partió de qué versión. Esta ADR
propone el vínculo sin cambiar todavía el esquema, la API ni datos existentes.

## Decisión propuesta

Agregar una relación opcional y auto-referenciada en `Quote`:

```prisma
sourceQuoteId String?
sourceQuote   Quote?  @relation("QuoteDerivation", fields: [sourceQuoteId], references: [id], onDelete: Restrict)
derivedQuotes Quote[] @relation("QuoteDerivation")

@@index([sourceQuoteId])
```

La relación debe ser opcional para conservar todas las cotizaciones históricas y las
creadas fuera del flujo de reapertura. `onDelete: Restrict` evita eliminar una fuente
que todavía tiene propuestas derivadas.

## Contrato de API propuesto

### Crear cotización

`POST /quotes` acepta `sourceQuoteId?: string` sólo para roles `ADMIN` y `OPERATOR`.

El servidor debe:

1. Buscar la fuente por `id` y `orgId` del token; nunca aceptar una fuente de otra organización.
2. Responder `404` si la fuente no pertenece a la organización o no existe.
3. Mantener la cotización fuente inmutable; la derivada recibe su propio `id`, snapshot,
   estado y evento de auditoría.
4. Escribir en el evento `CREATED` `{ sourceQuoteId, sourceSnapshotChecksum }` cuando exista.
5. Conservar la etiqueta humana `Reapertura · ...` como ayuda operativa, no como clave.

### Detalle e historial

El detalle puede devolver un resumen mínimo:

```json
{
  "sourceQuote": { "id": "...", "label": "...", "status": "DRAFT" },
  "derivedQuoteCount": 2
}
```

No debe devolver automáticamente toda la cadena ni datos de otra organización. Un
enlace de “Ver origen” sólo se muestra si la fuente pertenece al mismo `orgId` y el
usuario tiene permiso de lectura.

## Reglas de negocio y seguridad

- Una derivada puede volver a derivarse; la cadena se limita en UI a un nivel inicial
  y ofrece navegar al origen para evitar una vista recursiva difícil de leer.
- `VIEWER` puede leer la relación si ya tiene acceso al detalle, pero no puede crear
  una derivada ni confirmar/compartirla.
- El vínculo no cambia `costBaseId`, `assumptionSetId`, `laneId` ni el snapshot de
  la derivada; esos valores se copian y luego pueden cambiarse antes de recalcular.
- La fuente no se actualiza al crear la derivada. No se envían correos, Rateware,
  Gmail ni otras comunicaciones.
- La autorización se mantiene en `orgId`/rol del servidor; nunca en metadata editable
  del usuario ni en un query param confiado.

## Migración aditiva propuesta

1. Añadir `sourceQuoteId` nullable, la relación auto-referenciada y el índice.
2. Verificar que no existan IDs huérfanos; la migración no rellena históricos.
3. Actualizar Zod/API, selección de detalle, auditoría y pruebas de aislamiento.
4. Publicar primero código compatible con columna ausente sólo si Prisma lo permite
   en la ventana acordada; de lo contrario, aplicar esquema y código en una única
   ventana reversible.
5. Activar el botón de derivación después de comprobar que la fuente pertenece al
   mismo tenant.

## Validación y rollback

### Gates antes de aplicar

- `npm run db:validate -w freight-cost-api`.
- Prueba de creación sin `sourceQuoteId` (compatibilidad histórica).
- Prueba de creación con fuente propia y rechazo con fuente de otra organización.
- Prueba `VIEWER` rechaza POST aunque conozca un ID válido.
- Prueba de eliminación de fuente con derivadas devuelve conflicto y no borra datos.
- Repetir matriz `AUTH-03`, `AUTH-04`, `AUTH-07` y `AUTH-10` con datos sintéticos.

### Rollback

Primero desactivar el envío de `sourceQuoteId` desde Web y volver al flujo actual de
etiqueta. Mantener la columna nullable durante la observación; no borrar la relación
en la misma ventana. Si la migración debe revertirse, exportar los valores no nulos,
retirar código que los lea y eliminar la columna sólo con autorización explícita y
respaldo verificado.

## No realizado en este desarrollo

- No se modificó `schema.prisma`.
- No se creó una migración Prisma.
- No se cambió Neon, Auth, usuarios, API desplegada ni producción.
- No se declaró trazabilidad persistente validada; la implementación vigente sigue
  siendo contextual mediante etiqueta y UI.

## Modelo y esfuerzo

- Diseño de contrato y aislamiento: GPT-6 Astra · esfuerzo alto.
- Revisión de migración y rollback: GPT-6 Astra · esfuerzo alto.
- Implementación posterior Web/API y pruebas: GPT-5.6 Sol · esfuerzo alto.
