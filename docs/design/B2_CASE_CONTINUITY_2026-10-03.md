# Continuidad del expediente D2D · corte local

## Objetivo y alternativas verificadas antes del código

Retomar los inputs de un caso sin volver a capturarlos y recalcularlos con la sesión vigente. Se revisaron la calculadora, su contrato de formulario, el endpoint stateless, los snapshots de cotizaciones y las descargas JSON existentes en `quote-confirmation.tsx`. La base económica completa de septiembre sigue pendiente; este corte no la inventa.

| Opción | Ajuste, costo y seguridad | Decisión |
| --- | --- | --- |
| Usar directamente una cotización persistida | Ya existe persistencia, pero requiere una base publicada y snapshot de cotización reproducible; el benchmark incompleto no cumple ese contrato | No forzar ni debilitar controles |
| Guardar automáticamente en localStorage | Poco código, pero mezcla potencial de cuentas, retención y estado obsoleto en equipos compartidos | Rechazada |
| Archivo local versionado con reapertura explícita | Reutiliza descarga JSON, validación y BFF; no introduce DB/infraestructura ni guarda totales que puedan pasar por válidos | Implementar como puente local, no persistencia SaaS |

Se conserva el stack y la dirección MARKSMAN documentada en `MARKSMAN_UI.md`, junto con el benchmark de reutilización del 3 de octubre. No hay producto externo nuevo ni costo recurrente incorporado. El contrato de cálculo sigue siendo la fuente de verdad; el archivo conserva sólo captura, no certificación económica.

## Wireframes A/B y dirección elegida

A, recomendada: acciones junto al recorrido existente, sin nueva pantalla.

```text
ESCENARIOS D2D · no calibrado
1 Capturar → 2 Calcular → 3 Guardar y retomar
[Iniciar caso México–Fort Smith] · sólo ruta y relevo confirmados
Resumen visible: origen → destino / cruce MX-US
Fecha / remolque / Ruta | Capital | Utilización
[Calcular escenarios] [Guardar expediente] [Abrir expediente] [Limpiar]
Aviso: archivo en tu equipo; no cotización ni base publicada
Resultado actual: CFU / CVU / fronterizos / costo productivo

Al elegir archivo:
Expediente verificado · guardado FECHA
Reemplazará la captura; los resultados requieren recálculo
[Reemplazar expediente] [Cancelar apertura]
```

B: una pantalla separada de archivos con lista y detalle. Se descarta: añade navegación y aparenta un repositorio SaaS que no existe. El usuario ya pidió continuidad y menos fragmentación; se aplica A dentro de la calculadora actual.

Mobile: botones con ajuste de línea, bloques verticales, aviso sin tabla ancha. Se mantienen colores, controles, tipografías con fallback y logo del shell existentes; no se redefine el manual ni se cambia login.

## Contrato y aceptación

- Capturar o calcular → guardar JSON versión 1 con esquema y checksum SHA-256 → recargar → elegir archivo → comprobar acceso al formulario actual → confirmar reemplazo → recalcular en servidor.
- El archivo nunca contiene resultados guardados, credenciales, IDs de sesión u organización, ni afirmaciones de aprobación. Sólo los campos de captura permitidos; rechazo de claves extra, versión desconocida, tamaño excesivo, estructura incompatible o checksum discordante.
- Un checksum detecta corrupción, **no autentica al autor ni certifica fuentes**. No confiar en archivo como benchmark aprobado; validación económica y permisos quedan en el servidor.
- Blancos permanecen blancos, no cero. No se calculan fórmulas en React, ni se rellenan importes de muestra.
- El inicio del caso confirmado carga únicamente extremos, Puente III y relevo propio/misma caja; no decide fecha exacta, activo real, FX, financiación o importes. No reemplaza un caso ya capturado sin limpiarlo antes.
- Reapertura no llama automáticamente al cálculo. Cancelar conserva la captura actual. Reemplazar invalida totales anteriores; una respuesta tardía o sesión vencida no los recupera.
- Sin almacenamiento automático, envío a terceros, mutación de negocio, nueva API o migración. El archivo local es portable y deliberadamente no tenant-owned; abrirlo es una acción del usuario y calcular siempre exige sus permisos actuales.
- Verificación: contrato, interacción guardar/reabrir, recarga, duplicación idempotente de inputs, manipulación, incompatibilidad de esquema, error/403, cancelación, sesión vencida y respuestas tardías; inspección desktop/mobile. Datos sintéticos se etiquetan y no cierran B2.

## Ejecución y presupuesto

Elección conservada del trabajo: OpenAI/Codex `gpt-6.1-sol`, esfuerzo alto solicitado; runtime exacto no observable. Se consideró Claude para UX e implementación: incertidumbre baja, cambio acotado y tests locales hacen suficiente la continuidad de contexto actual, sin transferencia ni inferencia auxiliar. No se cambia modelo ni proveedor. Responsable único Codex, mismo checkout D: y HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`.

Corte máximo 60 minutos desde implementación, hasta dos reparaciones diagnosticadas. Consumo y cuota atribuibles desconocidos; sin habilitar uso extra/API/cargos ni reconsultar una observación anterior como garantía de facturación. Skills `ux-copy` y `testing-strategy`: claridad de acciones y verificación del recorrido, no sólo helpers.

Cierre del corte: continuidad local desarrollada y verificada. Cierre del MVP completo pendiente: evidencia económica suficiente del caso México–Fort Smith, integración de septiembre, guardado SaaS compatible con base/snapshot y sesión real. No presentar este puente como cotización operativa ni como B2 cerrado.
