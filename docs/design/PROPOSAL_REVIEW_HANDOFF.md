# Entrega: revisión comercial desde una cotización

Fecha: 2026-09-07. Base: `3b4f6a8`, rama `codex/supabase-auth-slice`.
Trabajo en `D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830`.

## Narrativa del desarrollo

Antes existía un preview API sin entrada desde la pantalla. El BFF omitía la
cabecera que ese endpoint exigía. Ahora el usuario abre “Revisar propuesta” desde
una cotización confirmada, captura datos del cliente, revisa ruta/equipo/tarifa y
puede corregirlos. El resultado está identificado como vista previa sin guardar.
La interacción reutiliza Dialog, Button, Input y los tokens MARKSMAN existentes.

El guardado comercial persistente no forma parte de esta entrega. No hubo llamadas
de negocio, cambios de esquema, Auth, Neon, usuarios, infraestructura ni despliegues.

## Wireframe y especificación

- Objetivo visual: [wireframe de revisión](proposal-review-wireframe.html), continuidad
  de “Ruta directa” y del ADR-003. La creación de borradores del wireframe anterior
  queda identificada como una propuesta futura.
- Desktop: modal `sm:max-w-2xl` (672 px), dos columnas desde `sm` (640 px).
- Móvil: ancho disponible menos 32 px; una columna, máximo `90dvh`. Encabezado y
  acciones no se contraen; el cuerpo tiene desplazamiento independiente.
- Espaciado: `p-5` (20 px) para contenido/encabezado y `p-4` (16 px) para acciones;
  `gap-4` (16 px) entre campos. Controles del formulario y acciones ≥44 px.
- Color: tokens `primary` #ea5e27, `foreground` #1e1e1e, `muted-foreground` #484848,
  `background` #efefef; texto oscuro en el botón naranja. Sin fuentes/activos nuevos.
- Texto: cliente 2–200 caracteres; contacto 160; email 254; notas 4000. Cliente y
  fecha obligatorios. Las notas son exclusivamente comerciales y no se precargan
  desde evidencia interna. El contenido largo envuelve; la tarifa incluye USD.
- Vigencia: fecha civil posterior a hoy en México. El formato de envío es
  `YYYY-MM-DD`; la visualización conserva el día sin conversión por zona horaria.

## Estados e interacción

| Estado | Resultado observable |
|---|---|
| Captura | Foco en Cliente; validación nativa de fecha/email y límites |
| Petición pendiente | Campos y envío bloqueados, anuncio `status`; cancelar disponible |
| Revisión | Fuente/versión/modo de respuesta validados; foco en nombre del cliente |
| Editar | Conserva campos, retira resultado anterior y requiere una nueva petición |
| Error | Anuncio `alert`, foco en mensaje; conserva campos y ofrece reintento |
| Reintento | Misma clave para los mismos datos; nueva clave al cambiar contenido |
| Cerrar / Escape | Aborta petición, descarta captura y devuelve foco al disparador |
| VIEWER / DRAFT / ARCHIVED | Acción deshabilitada con motivo visible; API mantiene sus permisos |

La UI no almacena datos de cliente en URL, localStorage o sessionStorage. Los
checksums internos no se renderizan. Cancelar y editar no realizan escrituras.
Las animaciones existentes de Dialog duran 100 ms; el indicador respeta reduced-motion.

## Evidencia reproducible

- API: pruebas focalizadas `customer-proposal-draft`, `customer-proposal-draft-route`
  y `bff-request-headers`. Usan autorización y cálculo/snapshot reales con Prisma
  simulado; incluyen 401/403/404/409, aislamiento, manipulación, cabeceras,
  cambio de día y ausencia de escrituras. Fechas fijadas para evitar caducidad.
- Navegador: `apps/web/scripts/proposal-review-smoke.mjs` compila el componente y
  el CSS reales, sirve sólo en loopback y sustituye el API con datos ficticios.
  Usa fallback tipográfico Arial/Courier sin descargar fuentes.
- Viewports: 1440×900, 1280×800, 390×844. Se comprueban captura/revisión/edición,
  foco, Escape, dimensiones, errores, reintentos, fuente incorrecta, bloqueos y
  cancelación pendiente. No es una prueba de login ni de API desplegado.
- Artefactos generados (fuera de Git): `tmp/proposal-review/*-capture.png`,
  `*-review.png`, `390-error.png`, `results.json`.
- Ejecución: `node apps/web/scripts/proposal-review-smoke.mjs`; si Playwright no
  está en el checkout, `FCM_PLAYWRIGHT_MODULE` acepta la ruta del paquete incluido
  en el host. `FCM_BROWSER_CHANNEL=msedge` usa un perfil desechable de Edge.

La prueba detectó y se corrigieron: etiqueta de fecha mezclada con la ayuda y
reenvío accidental al cambiar el botón Editar por el botón Submit. La aserción
de retorno de foco espera la finalización asíncrona del cierre, con límite de 2 s.
Se conserva `tmp/proposal-review/failure.png` de la última sonda fallida junto a
las capturas finales; no se presenta aquella sonda como exitosa.

Resultado final local: 54 archivos / 461 pruebas aprobadas en la suite API;
25 pruebas focalizadas incluidas en ese total. Builds API y web, comprobación
TypeScript web y lint web aprobados. Smoke de navegador: 12 comprobaciones
aprobadas, sin errores JavaScript ni desbordamiento horizontal en los tres tamaños.
El build conserva el aviso existente de Supabase sobre la retirada de soporte de
Node 20; no se cambió el runtime en esta entrega.

SHA-256 de las capturas finales, conservadas localmente fuera de Git:

- `390-review.png`: `C825650C2C0151A8C37114F39131353ADF06F92F6C200C3CEEFA5AE9159750C6`.
- `1440-review.png`: `559DC28F4740521D0F8265C268B1DDEB5B39EF9126C0D081E80E7BCDFD30ADD0`.

## Release y rollback

Antes de publicar este código, frontend y API deben incluir este mismo incremento
y pasar AUTH-11/12 con sesión de prueba. La revisión necesita el endpoint de preview
y el reenvío de cabecera. Un build local o un HTTP 200 simulado no cierra ese gate.

Rollback de esta entrega: revertir sólo su commit de UI/BFF/API/tests/docs; conserva
el endpoint de preview anterior de `3b4f6a8`. No requiere rollback de datos ni Auth.
No borrar propuestas ni revertir otros commits del worktree.

## Modelo y esfuerzo por actividad

Ejecución de esta entrega: Codex, sin delegación. El identificador efectivo del
modelo y el selector de esfuerzo no se verificaron desde el entorno.
Asignación recomendada: GPT-5.6 Sol con esfuerzo medio para UI/wireframes/handoff;
el mismo modelo con esfuerzo alto para contrato/BFF/permisos/fechas y pruebas de
integración. Es una recomendación por complejidad, no una afirmación de cambios
del selector ni de ejecución de ese modelo.
