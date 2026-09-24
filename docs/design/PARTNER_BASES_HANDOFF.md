# Bases de socios: persistencia, API y editor locales implementados

## Decisión de arquitectura — 2026-09-23

Objetivo: administrar las bases que alimentan el cálculo, no volver a capturar las tarifas en cada viaje. La pantalla Bases de costo será el punto de entrada común. Primera modalidad: D2D con línea mexicana y socio estadounidense. No inventar precios ni considerar una referencia escrita como evidencia verificada.

La implementación de flota propia exige 210 parámetros para publicar. No se relajará esa protección ni se etiquetará BROKERED como OWNED_FINANCED. El adaptador `partner-base-contract.ts` separa términos reutilizables de fecha/FX del viaje, consume el motor existente y devuelve identidad de base, versión y hash de términos. Cuenta con almacenamiento y endpoints locales en `partner-base.routes.ts` y editor en `/cost-bases/partners`; aún no hay despliegue remoto de este incremento.

Opciones: (1) forzar tarifas de terceros en los 210 parámetros: descartada por semántica incorrecta; (2) mantener únicamente estimaciones independientes: insuficiente para el objetivo; (3) modelo económico explícito con versiones de términos y despacho al motor de terceros: elegida. El almacenamiento usa PartnerTariffBase/PartnerTariffVersion, separado de CostBase/AssumptionSet: así las rutas V3 existentes nunca reciben versiones de terceros. Se reutilizan autenticación, roles, motor de terceros y snapshots de estimaciones; la pantalla común de Bases combinará ambos tipos explícitamente. Esta decisión reduce el riesgo de modificar todos los consumidores del catálogo V3 a costa de mantener dos repositorios de bases. No reutilizar defaultPolicy V3 como indicador de cálculo de terceros.

## Wireframe desktop (1280 px)

```text
Bases de costo                           [Nueva base]
[Flota propia] [Tarifas de socios]
Cobertura: contar sólo bases compatibles, publicadas y vigentes

Lista de bases          | D2D MX + socio US · Borrador / Publicada vN
Código / Ruta / Equipo  | Modelo: compra a terceros · viaje sencillo
                       | Origen → destino / dirección / patios / equipo
                       | MX: proveedor, referencia, vigencia, moneda, tarifa
                       | US: proveedor, referencia, vigencia, moneda, tarifa
                       | Combustible / peajes: pendiente, incluido, adicional
                       | Cruce / intercambio: responsable, cargo, vigencia
                       | Supuestos, condiciones y exclusiones
                       | [Guardar borrador] [Revisar para publicar]
Versión publicada      | Sólo lectura · fuente declarada, no verificada
                       | [Nueva versión] [Calcular con esta versión]

Calcular con BASE · vN · ruta/equipo bloqueados
Fecha del viaje [   ]   FX / fuente / fecha [   ]
Tarifas y supuestos heredados [ver detalle]
[Calcular] → desglose / faltantes / costo conocido de compra
[Guardar estimación] → conservar versión + términos + FX + resultado
```

## Wireframe móvil (390 px)

```text
Bases de costo  [Nueva]
[Modelo económico ▼]
[Base / ruta / equipo ▼]
Estado y versión
Aplicabilidad
Línea MX
Línea US
Cruce e intercambio
Supuestos y exclusiones
[Revisar para publicar]
Publicada: [Calcular con vN]
Fecha y FX del viaje
Desglose y procedencia
[Guardar estimación]
```

Reutilizar tokens MARKSMAN y componentes existentes, sin nuevo menú global. Desktop: lista lateral y editor; móvil: una columna y selector de base, sin tabla horizontal. Etiquetas persistentes, controles de al menos 44 px, foco visible y errores asociados al campo. No depender del color para estado. Texto largo ajustable; referencias completas consultables. Guardado/loading bloquean doble envío; errores no borran captura. Lista vacía ofrece creación sin precios precargados; error de carga no aparece como vacío. Confirmación con status; errores con alert. Publicación muestra resumen y requiere confirmación ADMIN. VIEWER sólo lectura; OPERATOR calcula con versiones publicadas, no publica.

## Contrato y límites

- Servidor obtiene versión por organización e ID: nunca aceptar un objeto publicado desde el navegador. El adaptador puro no sustituye autorización ni consulta persistente.
- Fecha y FX son las únicas entradas del viaje en esta primera modalidad de base por ruta/equipo exactos. Cambiar ruta, equipo o tarifas exige otra base/versión, no un override silencioso.
- Publicada y activa no significa tarifa vigente: comprobar vigencia para cada viaje; términos pendientes o vencidos producen INCOMPLETE sin total utilizable.
- Hash identifica términos; no es firma, aprobación ni prueba del proveedor. Historial debe guardar el snapshot completo y no recalcularse contra versiones futuras.
- La publicación comprueba conceptos completos y vigencias compatibles; registra autor, fecha y nota. Las referencias son declaradas, NO verificadas con proveedores. Mantener visible esa distinción. Publicar no implica aprobación comercial externa.
- Borradores también son revisiones inmutables: guardar cambios añade una versión. La publicación sólo admite la revisión más reciente y una expectativa explícita de versión activa. Calcular/guardar y publicar serializan sobre la misma base.

## Siguiente incremento y salida

1. Implementado local: persistencia versionada, bloqueos, autoría/publicación e inmutabilidad; separación de rutas V3.
2. Implementado local: lectura server-side para calcular por versionId, snapshot con lineage, editor integrado en Bases, procedencia en historial y navegación de cálculo sin recaptura. UI/API/DB tienen evidencia separada; pendiente probar el conjunto con sesión real.
3. Validación PostgreSQL desechable: revisar evidencia en `docs/PARTNER_BASES_PERSISTENCE_2026-09-23.md`.
4. Retiro/reactivación implementados localmente (ver evidencia de lifecycle). Antes de release: autorización específica para las dos migraciones aditivas y preview; después probar UI autenticada. No activar base real sin tarifas y fuentes comerciales.

## Implementación visual local

### Retiro / reactivación — wireframe implementado localmente

```text
Base · [Disponible / Retirada] · revisión de estado N
Retirada: consulta histórica habilitada; cálculo y publicación bloqueados.
[Administrar disponibilidad ▾] (ADMIN)
  Motivo [10–500 caracteres]
  [ ] Entiendo que no se borran versiones ni resultados.
  [Retirar base / Reactivar base]
  Solicitud confirmada → [Consultar estado actualizado]
Historial: acción · autor · fecha · motivo (últimos 20)
```

Misma secuencia desktop/móvil, tarjeta p-4, botones min-h-11 y tokens existentes. Durante respuesta incierta se bloquean captura y operaciones hermanas; reintento conserva cuerpo/clave. Conflicto exige releer el estado, nunca repetir automáticamente una transición obsoleta. Reactivar conserva la versión publicada seleccionada, no renueva tarifas; el motor sigue comprobando fecha del viaje. No se elimina evidencia.

Ruta `/cost-bases/partners` bajo el mismo hub; navegación Flota propia / Tarifas de socios también en la pantalla original. Lista lateral de 240 px a partir de lg; una columna por debajo. Ancho máximo 1440 px; separación gap-6, tarjetas p-4/p-5; colores `bg-card`, `bg-background`, `border`, `bg-primary`, `text-primary-foreground` y foco `outline-ring` del sistema existente. Tipografía y tokens de marca no se sustituyen. Nombre máximo 120 caracteres, código 32; referencias 240; supuestos 1500. Controles min-h-11. No se añadió movimiento ornamental.

Lista y detalle se leen en servidor; fallos se propagan al error boundary, no se representan como listas vacías. Crear/revisar conserva el mismo cuerpo y clave en un reintento incierto. Durante incertidumbre se bloquean captura y selección interna de versión; no se almacena la captura en localStorage. Tras guardar/publicar se ofrece enlace de lectura actualizada. El formulario de publicación requiere nota y checkbox de confirmación. La lectura histórica no ofrece una revisión manual que pierda procedencia.

Modelo recomendado: Astra, esfuerzo alto para integración; medio para comprobaciones focalizadas. Wireframes acompañan al editor local, no son evidencia de despliegue. No se llenaron bases comerciales ni se cambió producción. Rollback y límites de migración en los documentos de evidencia.
