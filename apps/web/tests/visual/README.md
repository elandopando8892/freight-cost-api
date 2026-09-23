# QA local de continuidad de cotización

Fecha: 2026-09-22 (sesión America/Mexico_City). Base: `2a0d6ca`, rama `codex/quote-integrity-sprint`.

## Ejecutar sin Auth ni servicios reales

Desde `apps/web`, con Node >=22: `node tests/visual/server.mjs`.
Abrir `http://127.0.0.1:4317/tests/visual/viewports.html`.
Para el selector de bases por segmento: `http://127.0.0.1:4317/tests/visual/viewports.html?page=segments`. Los catálogos y borradores de esa pantalla son igualmente sintéticos; la acción Crear sólo registra el cuerpo en el visor local.
Para el diálogo de calibración: `http://127.0.0.1:4317/tests/visual/viewports.html?page=calibration`. Dos grupos y sus valores son sintéticos; no representan el catálogo completo ni guardan evidencia real.
Servidor limitado a loopback, puerto fijo 4317, sin cargar archivos de entorno. El fixture reemplaza fetch sin fallback: sólo responde a tres rutas sintéticas; las demás fallan. CSP limita conexiones al mismo origen. No es una ruta Next, no desactiva autenticación, no simula una sesión y no se integra al build del producto.

Se montan QuoteModes, ambos formularios, resultado y estilos reales. Next Link se sustituye por un anchor sólo en este visor. Base/versión, importes y respuestas son ficticios: no acreditan motor, BD, permisos reales ni aprobación. Las piernas MEX/US son null; esas tablas no quedan cubiertas visualmente. Tipografía usa Arial como fallback explícito; no acredita fuentes de marca licenciadas.

## Evidencia observada

| Comprobación | Resultado |
| --- | --- |
| Captura guiada, equipo y revisión | Ruta Monterrey → Dallas y remolque conservados al avanzar |
| Guiado → Rápido → Guiado | Valores DOM y contexto conservados; un cálculo antes y después del cambio |
| Guardar y cambiar modo | Enlace `/quotes/fixture-quote-1`; asociación conservada |
| Copia con rechazo 403 | Mensaje específico de rol; reintento produce `/quotes/fixture-quote-2` |
| Doble Ctrl+Enter inmediato | Contador pasó de 3 a 4, no a 5 |
| Cambio de equipo durante cálculo de 7s | Tras completar demora: cero botones Guardar y cero enlaces al guardado anterior |
| Limpiar en móvil | Ambos inputs vacíos y alerta eliminada |
| Tab desde Abrir cotización | Foco visible en Ver historial |
| Error 422 antes | Mensaje genérico de fallo |
| Error 422 después | Revisa los datos del cálculo; indica origen, destino, base, servicio y FX; conserva captura |
| Formatos y linaje | FX 18.75, utilidad 0.48, márgenes sintéticos 9/17/23%, base QA-SINTETICA y v7 visibles |

## Dimensiones

El override de navegador no fue fiable: pidió 1440×900 pero el DOM reportó 1920×1200. Se descartó como evidencia dimensional y se usaron iframes del mismo origen con tamaños explícitos. No es una prueba del shell autenticado ni de dispositivo físico. Scrollbar vertical de 20 px:

| Iframe | clientWidth | scrollWidth | clientHeight |
| --- | --- | --- | --- |
| 1440×900 | 1420 | 1420 | 900 |
| 1280×800 | 1260 | 1260 | 800 |
| 390×844 | 370 | 370 | 844 |

No hubo scroll horizontal del documento probado. Inspección visual parcial de formularios, revisión y guardado; no equivale a revisión exhaustiva de todas las combinaciones. Capturas en `evidence/`: móvil guardado, escritorio 1280 con rechazo, escritorio 1440 captura. El recorte del navegador puede incluir margen del host; el tamaño CSS se acredita con las medidas anteriores, no con píxeles del PNG. Hubo timeouts intermitentes de captura/CDP; no se cuentan como comprobaciones exitosas.

## Límites y siguiente dependencia

Pendientes: dashboard real con errores parciales; página real de detalle y recarga; sesión/renovación y permisos reales; piernas MEX/US y matriz completa de estados/resoluciones. El enlace correcto sí se inspeccionó, pero **no se abrió un detalle real**. Las pruebas de API/PG del incremento anterior siguen siendo evidencia separada.

Sin deploy/push, cambios de Auth, migraciones ni consultas de negocio. Recomendación de modelo para esta actividad: Astra, esfuerzo alto; no certifica el modelo anfitrión ni consume IA desde FCM.

Rollback: revertir el cambio de copy y tests junto con el visor; no hay esquema que revertir. Detener el proceso iniciado con `node tests/visual/server.mjs` al finalizar la revisión.

Validación final: 14/14 tests web; 6/6 tests API focalizados de presentación/control de solicitud; lint web, typecheck web y build Next satisfactorios. No se repitió la suite completa API de 511 en este incremento. Se dejó el visor local corriendo en 127.0.0.1:4317 para revisión del usuario.
