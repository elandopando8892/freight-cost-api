# Revisión comercial real y ajuste responsive local

Base de trabajo: `7bca641`, rama `codex/supabase-auth-slice`, checkout en D: limpio
al iniciar. Preview web/API probado: `7a3d92d` (no se redesplegó en esta entrega).

## Narrativa del recorrido real

El 2026-09-08 se retomó la sesión ADMIN existente del preview alineado. El historial
mostró 11 registros; se inspeccionaron cinco detalles, de los cuales uno estaba
confirmado y cuatro pendientes. Se detuvo la búsqueda al encontrar una fuente
utilizable. No se creó ni confirmó ninguna cotización.

La fuente confirmada pertenece al piloto existente. No se afirma que sea un
registro sintético creado para QA. Sólo los datos de cliente introducidos fueron
ficticios: “Cliente QA — no enviar”, luego “Cliente QA móvil — no enviar”, vigencia
2026-09-10 y una nota de prueba sin envío. No se completaron correos de terceros.

Resultados observados:

- Captura → petición pendiente con controles bloqueados → vista comercial real.
- Cliente, fecha civil, ruta, equipo, distancia y tarifa visibles; sin costos ni
  márgenes internos dentro de la vista comercial. Foco en el nombre del cliente.
- Editar retiró el resultado, conservó campos y devolvió el foco al cliente.
- Segunda revisión con nombre modificado funcionó a 390 × 844 CSS px.
- Escape cerró y devolvió foco al disparador; reabrir mostró todos los campos vacíos.
- Logs Vercel del API `dpl_BtSengsPxH5MrRHwNFxJKuthZpKQ`, consultados a las
  16:59 UTC, agrupando `customer-proposal-draft/preview`: dos respuestas 200.

La prueba valida el flujo ADMIN sobre una fuente existente. No sustituye la matriz
OPERATOR/VIEWER, prueba entre organizaciones, renovación por expiración ni una
prueba con fuente enteramente sintética. No se ejecutaron guardar, confirmar,
eliminar, enviar, paquete Rateware ni herramientas de IA.

## Incidencias preservadas

La entrada inicial de fecha por el adaptador Playwright no se retuvo. El formulario
impidió enviar un campo obligatorio vacío. La entrada accesible `setValue` sobre
el control date sí retuvo 2026-09-10 y permitió continuar. No se atribuye este
fallo del método de automatización al servidor ni se eliminó la validación nativa.

La revisión móvil sí cabía, pero la página detrás tenía `scrollWidth=1197` frente
a `innerWidth=390`. La inspección DOM identificó una fila de acciones de 1185 px
con `shrink-0`: el detalle completo no pasa QA responsive en el preview actual.

## Corrección local y wireframe

Se reutilizó el diseño existente, sin añadir librerías ni cambiar decisiones de
negocio. El wireframe `docs/design/proposal-review-wireframe.html` incorpora el
detalle responsive: contexto y acciones comparten fila cuando caben; en móvil las
acciones envuelven debajo del contexto y nunca se recortan para ocultar el problema.

- Contexto: `min-w-0 max-w-full`.
- Acciones: se sustituye `shrink-0` por `min-w-0 max-w-full`, conservando flex-wrap,
  gap-2 (8 px), orden DOM y controles/permisos originales.
- Confirmación: ancho máximo 100%, mínimo 0 y break-words para correo/nota largos.
- Se conservan tokens MARKSMAN, tipografía y estados; no se añaden animaciones.

Prueba local reproducible: `node apps/web/scripts/quote-detail-layout-fixture.mjs`.
El servidor se limita a loopback. Renderiza contenido ficticio y obtiene las clases
del encabezado/acciones/confirmación directamente del código con CSS Tailwind real.
`/before` conserva el defecto anterior; `/` utiliza las clases corregidas.
No es la página completa ni una prueba de autenticación local.

Comparación observada en navegador:

| Caso | innerWidth | scrollWidth | Resultado |
|---|---:|---:|---|
| Fixture anterior, correo y nota largos | 520 | 1421 | Desbordamiento reproducido |
| Fixture corregida | 520 | 520 | Sin desbordamiento |
| Fixture corregida estrecha | 389 | 389 | Sin desbordamiento |
| Fixture corregida escritorio | 1280 | 1280 | Sin desbordamiento |

Se registran anchos CSS efectivos, no sólo los solicitados: el origen loopback
presentó una relación de escala distinta. Se restauró el override de viewport.
Las capturas/observaciones están en los resultados del navegador de esta tarea;
no se afirma haber creado archivos PNG versionados.

Validación local adicional: lint web, TypeScript y build web aprobados. El build
mantiene el aviso existente de deprecación del Node local 20 para Supabase; no se
cambió el runtime. No se repitió la suite API porque no cambió código del servidor.

## Alcance pendiente y rollback

El ajuste CSS es local. El preview sigue en `7a3d92d` y conserva el desbordamiento
del detalle hasta publicar el ajuste. No se cerró el sprint ni QA responsive completo.
Siguiente: publicar una pareja frontend/API del commit de corrección y repetir la
medición del detalle completo en el preview, no sólo la fixture.

Rollback local: revertir exclusivamente el commit de CSS/fixture/wireframe/evidencia;
sin tocar datos, Auth ni los deployments actuales. No hubo cambios de esquema,
base de datos, infraestructura o configuración compartida.

Guías utilizadas: testing-strategy separa prueba real, fixture y pendientes;
design-handoff documenta ancho, envoltura, estados y orden de foco. Recomendación:
GPT-5.6 Sol, esfuerzo medio para CSS/wireframe y alto para revisar límites de la
prueba autenticada. Ejecución en Codex sin delegación; selector efectivo no verificado.
