# ADR-003: contrato controlado entre cotización interna y Quote Desk

- **Estado:** Propuesto; preview técnico implementado, persistencia no implementada
- **Fecha:** 2026-09-07
- **Decisores:** producto MARKSMAN, ingeniería FCM y responsable humano de la propuesta
- **Ámbito:** Freight Cost Model MVP, mismo `orgId`

## Contexto

FCM tiene dos objetos distintos:

1. `Quote` conserva el cálculo interno, el piso de costo, el linaje de la base,
   la explicación y la decisión operativa.
2. `CustomerQuote` de Quote Desk es el borrador comercial que puede pasar por
   revisión, aprobación y preparación de correo.

El detalle de una cotización interna ya permite copiar un resumen y descargar un
handoff, pero no existe un contrato que transforme una cotización en un borrador
comercial. Un puente improvisado en el navegador podría exponer costo interno,
aceptar un `quoteId` de otro tenant o saltarse la confirmación humana. El POST
actual de `/customer-quotes` recibe líneas comerciales completas y no conoce el
linaje de `Quote`.

Este documento define el límite para una futura integración. No crea un borrador,
no envía correo, no cambia Auth, Neon, Prisma, producción ni infraestructura.

## Decisión propuesta

Cuando se autorice la implementación, la integración será una acción explícita
server-side desde el detalle de una cotización interna. El navegador sólo enviará
la intención y los datos de contacto/propuesta que el operador haya capturado; el
servidor cargará la cotización por `id` **y `orgId`**, validará su estado y
construirá las líneas comerciales a partir de la fuente gobernada.

El contrato preferido es una acción separada, por ejemplo:

```http
POST /quotes/:quoteId/customer-proposal-draft
Idempotency-Key: <uuid>
Content-Type: application/json
```

El incremento actual implementa únicamente el endpoint reversible
`POST /quotes/:quoteId/customer-proposal-draft/preview`. Devuelve
`mode: PREVIEW_ONLY`, un `idempotencyFingerprint` determinista y el payload
redactado; no llama a `customerQuote.create`. El endpoint de persistencia de
arriba sigue bloqueado hasta resolver el vínculo persistente de fuente y la
idempotencia en el modelo comercial.

Payload mínimo permitido (propuesta, no vigente):

```json
{
  "clientName": "Cliente capturado por el operador",
  "contactName": "Contacto opcional",
  "contactEmail": "contacto@example.com",
  "quoteType": "Spot",
  "validUntil": "2026-09-30",
  "notes": "Condiciones comerciales capturadas por el operador"
}
```

El servidor derivará de `Quote` y sus relaciones:

- origen y destino de la ruta gobernada;
- equipo, configuración, operación y servicio;
- tarifa comercial recomendada (`commercial.recommendedSellUsd`) y moneda;
- cruce/distancia sólo si están presentes en la evidencia compatible.

No se copiarán al borrador comercial `freightBaselineUsd`, `costFloorUsd`,
`minSellUsd`, márgenes, `assumptionSet`, `costBase`, notas internas, alertas de
riesgo, checksums ni el desglose técnico. El borrador resultante nacerá en
`DRAFT`, conservará el `sourceQuoteId` en un campo de linaje aprobado o en un
registro de auditoría equivalente y devolverá el `CustomerQuote` creado. Si el
modelo necesita un campo persistente, será una migración aditiva separada y
aprobada; este ADR no la aplica.

## Permisos y compuertas

- `ADMIN` y `OPERATOR` pueden preparar un borrador únicamente dentro de su
  organización.
- `VIEWER` recibe `403` y no debe ver un botón accionable.
- La cotización fuente debe estar `CONFIRMED`, tener explicación/snapshot válido,
  base gobernada y decisión distinta de `NO_GO`; si no, la acción responde `409`
  con una razón legible.
- La acción sólo prepara un borrador. No aprueba, no prepara email y no envía
  comunicaciones. La aprobación sigue la máquina de estados existente de Quote
  Desk y el envío requiere confirmación humana separada.
- La interfaz futura debe mostrar el origen, el alcance de lo que se copiará y
  una confirmación antes del POST. Primero se actualizará el wireframe desktop y
  mobile; no se aceptará una acción escondida dentro de un query string.

## Opciones consideradas

### A. Copia directa en el cliente — rechazada

Duplicaría reglas, permitiría manipular tarifa o `quoteId` y arriesgaría la
exposición del piso de costo y del margen.

### B. Handoff por query string hacia Quote Desk — rechazada

No es durable ni auditable, es fácil de falsificar y no garantiza aislamiento de
tenant. Puede seguir existiendo como referencia visual de lectura, pero no como
creación de `CustomerQuote`.

### C. Comando server-side explícito — recomendada

Centraliza autorización, derivación, redacción de datos internos, idempotencia y
auditoría. Mantiene separadas la cotización técnica y la propuesta comercial y
permite apagar la capacidad sin alterar el cálculo.

## Requisitos no funcionales

- **Aislamiento:** todas las lecturas/escrituras incluyen `orgId`; nunca confiar
  en un `orgId` del payload.
- **Idempotencia:** `Idempotency-Key` y/o una huella de fuente + intención deben
  impedir duplicados accidentales por doble clic o reintento de red. El preview
  actual sólo calcula la huella; no afirma prevenir duplicados sin almacenamiento.
- **Auditoría:** registrar actor, fuente, resultado, versión de contrato y
  motivo de rechazo; no registrar secretos ni texto sensible innecesario.
- **Redacción:** pruebas que fallen si el payload de `CustomerQuote` contiene
  costo, margen, base o evidencia interna.
- **Compatibilidad:** no cambiar el Site URL, Supabase Auth ni el contrato de
  otras aplicaciones; el endpoint vive en el mismo API y organización de FCM.
- **Reversibilidad:** feature flag o retiro del botón y del endpoint sin borrar
  cotizaciones; los borradores ya creados permanecen trazables y no se envían
  automáticamente.

## Validación requerida antes de activar

1. Pruebas de contrato para `ADMIN`, `OPERATOR`, `VIEWER`, otro `orgId`, fuente
   `DRAFT`, fuente `NO_GO`, fuente sin snapshot y doble `Idempotency-Key`.
2. Prueba de redacción del payload y de conservación del `sourceQuoteId`.
3. Prueba UI desktop/mobile contra wireframes, incluida confirmación y estados
   de error/loading.
4. Recorrido manual: cotización confirmada → preparar borrador → revisar en
   Quote Desk → aprobar manualmente → preparar email sin enviar.
5. Evidencia separada: la cobertura de configuración no equivale a login real,
   sesión renovada o entrega de correo autenticada.

## Rollback

Antes de una migración o despliegue, desactivar el feature flag y ocultar la
acción. Si ya existen borradores, dejarlos en `DRAFT` y conservar su auditoría;
no borrarlos en cascada ni enviar comunicaciones. Revertir sólo el endpoint/UI
de integración y mantener intacta la cotización fuente.

## No realizado en este incremento

- No se modificó `schema.prisma`, Neon, Supabase Auth ni datos de negocio.
- No se llamó a `/customer-quotes`, no se creó `CustomerQuote`, no se ejecutó
  persistencia desde el preview y no se envió ningún correo.
- No se añadió botón funcional; el wireframe existe, pero la UI queda bloqueada
  hasta que haya una autorización específica para activar persistencia.

## Próximo paso

Tras aprobación puntual, añadir el vínculo persistente de fuente y la idempotencia
al modelo comercial, implementar el comando server-side y conectar la UI contra
el contrato probado. La preparación de una propuesta seguirá siendo una acción
humana confirmada.
