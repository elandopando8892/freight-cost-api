# Sprint 18 — referencia oficial IMT para COST_TIRES

Modelo recomendado: GPT-6 Sol; esfuerzo medio-alto por interpretación económica y trazabilidad de unidades.

## Resultado

La pantalla de investigación muestra tres costos de llantas modelados por el Instituto Mexicano del Transporte para configuraciones interurbanas T3-S3, T3-S2 y T3-S2-R4. Es una referencia externa para contrastar magnitudes de un vehículo completo en tramo mexicano comparable. Se conservan la unidad, el año de precios, las tablas y la huella SHA-256 del PDF; se muestra la conversión exacta de MXN/1,000 veh-km a MXN/veh-km dividiendo entre 1,000. [Wireframe](design/tire-imt-benchmark-wireframe.md) y [datos versionados](FCM_TIRE_IMT_PT881_2025.json).

## Fuente y extracción

Fuente primaria: IMT, *Costos de operación base de los vehículos representativos del transporte interurbano 2025*, Publicación Técnica 881, https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf. PDF descargado del dominio oficial el 28 de septiembre de 2026, HTTP 200, 89 páginas y SHA-256 `816728964103158f0a99f44c41bbe5d2bb7240c33e35651fcbd90c0b391412f4`.

| Configuración | Llantas de modelo | Llantas nuevas equivalentes / 1,000 veh-km | Costo de llantas MXN / 1,000 veh-km | Página PDF; tabla |
| --- | ---: | ---: | ---: | --- |
| T3-S3 | 22 | 0.39 | 1,141.73 | 60; 4.1 |
| T3-S2 | 18 | 0.33 | 969.96 | 61; 4.2 |
| T3-S2-R4 | 34 | 0.56 | 1,637.71 | 62; 4.3 |

El insumo del modelo para T3-S3 (tabla 3.22, página PDF 39) usa llanta nueva de MXN 2,926.73, relación de precio renovado/nueva 0.33 y coeficiente máximo de renovados 3.57. Este último no debe interpretarse como conteo físico observado. Las salidas redondean el número de llantas equivalentes a dos decimales; por eso el costo reportado por el IMT, y no el producto del conteo redondeado por el precio, es el numerador de la conversión a MXN/veh-km.

## Aplicabilidad

El estudio modela vehículos interurbanos mexicanos cargados a capacidad límite con llanta 1100-20.00 normal y precios 2025. Podría servir como contraste condicionado en Intra-Mex interurbano o en el tramo MX interurbano de D2D, una vez verificada la configuración y la operación. No describe MX Drayage, MX Local, el tramo estadounidense ni el producto Roadmaster 11R22.5 de las observaciones comerciales.

El costo agregado del vehículo no revela vida útil por posición, aceptación de carcasa, costo entregado/instalado ni renovados observados por etapa. Por ello el resultado permanece `EXTERNAL_MODEL_SANITY_CHECK`, con cero parámetros adoptados, sin escritura al motor de costos y sin elegibilidad de cotización. Una diferencia contra el futuro CVU deberá investigarse; no se corrige automáticamente sustituyendo el supuesto con la cifra del IMT.

## Verificación y rollback

El PDF y sus tablas se confrontaron con el registro JSON y coincidió el SHA-256. Pasaron 8 pruebas focalizadas (7 del workbench y 1 nueva que comprueba la presentación, unidades, fuente y no adopción). `npm run build -w freight-cost-web` compiló el frontend. La UI sólo lee ese registro, sin DB ni migración. Revertir el bloque de referencia y el archivo versionado devuelve la pantalla previa; no hay datos de usuario que transformar. La revisión visual y el estado de despliegue se registran después de ejecutarse.

## Preview y límites de aceptación

- Frontend de revisión: https://freight-cost-ixrj0wy81-elandopando8892s-projects.vercel.app/cost-bases/tires, deployment `dpl_9n22D8ag2kXvugRjJy2zuKpKCcyH`, `READY`, SHA funcional `2fddfb92867a5b9b377e58e16a1d0a47807c8d98`, sin promoción a producción.
- API existente y sin cambios: https://freight-cost-p6i5zd05x-elandopando8892s-projects.vercel.app, `/health` HTTP 200 y release `192f8577a8442d407c61b907e37c4decd40a0a01`. La revisión es web-only porque la API no cambió y no se obtuvo de forma segura la credencial de su base exclusiva para redeplegarla; por tanto el par no comparte SHA en este incremento.
- En navegador, OAuth Google con un OPERATOR existente regresó al mismo origen del nuevo preview; se abrió `/cost-bases/tires`, se observaron las tres cifras, `0 parámetros adoptados`, `0 expedientes` y el mensaje de que ninguna cifra entra al motor. La recarga conservó la sesión y la pantalla. Esto comprueba acceso autenticado de esta ruta, no renuevo de token a largo plazo, cálculos ni aceptación productiva.
- Captura visual: `D:\andre\apps\codex-home\visualizations\2026\08\26\01a03cbb-7378-7dc0-9dd0-24077f169b51\tire-imt-benchmark-preview.png`.
- El build de Vercel reportó 13 avisos de vulnerabilidades en el árbol npm completo (2 low, 4 moderate, 6 high, 1 critical), sin cambio de dependencias en este sprint. Se requiere triage aparte; no se ejecutó `npm audit fix` ni se alteró el lockfile.
