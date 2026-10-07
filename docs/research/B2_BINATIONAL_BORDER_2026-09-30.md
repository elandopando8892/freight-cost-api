# B2 · Cruce binacional del caso DF → Fort Smith

2026-09-30. Desarrollo local en `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927`; rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Estado Git inspeccionado antes de editar; cambios existentes conservados. GPT-6.1 Sol recomendado: alto para compatibilidad/doble conteo y medio para extracción documental/QA. No se cambió el modelo del chat; consumo exacto no disponible.

## Resultado y alcance

Antes: corredor confirmado, pero puente pendiente y expedientes orientados a intercambio de líneas independientes. Ahora: **Puente III / World Trade Bridge confirmado por el usuario**, caja seca 53′/cinco ejes; **misma empresa binacional es el supuesto solicitado**, no un transportista identificado ni una capacidad de circulación acreditada. Fecha de servicio, domicilios, tractor que cruza, cambio físico de tractor, vacíos y tiempos siguen pendientes. No se sobrescriben el caso histórico, pins SAKBÉ ni perfiles de intercambio con este supuesto.

Entregable: [anexo reproducible](B2_BINATIONAL_BORDER_2026-09-30.json) conectado al preparador/CLI existentes como `readiness.supportingBorderEvidence`. Separa confirmaciones, referencias, exclusiones y cuatro necesidades económicas; no crea parámetros canónicos, tarifas de servicio ni otro motor.

## Benchmark y elección mínima antes del código

| Enfoque | Evidencia y ajuste | Decisión |
| --- | --- | --- |
| Sumar peaje y tarifas comerciales genéricas | Peaje no equivale a traslado/custodia; unidades por envío, contenedor o rampa no prueban costo FTL binacional | Rechazar importación automática |
| Reutilizar CFU/CVU nacionales y remolque, añadiendo sólo frontera incremental sustentada | Calculador existente `benchmark-d2d.ts`; mantiene costos separados, cobertura fronteriza y vigencias | Adoptar como integración mínima, con validación del reparto de activos pendiente |
| Construir un nuevo cotizador/API de frontera | No se encontró una capacidad pública verificable que resuelva costo propio binacional y todos sus supuestos | No añadir infraestructura ni otro motor |

La capacidad estándar es separar conceptos, unidades e inclusiones. Nuestro trabajo diferencial sigue siendo enlazar evidencia comparable a supuestos nacionales y exposición física del viaje. No se justifica reconstruir rutas, FX, autenticación o cotizadores.

### Referencias verificadas

- **SICT Puente Nuevo Laredo III:** tabla C5 muestra MXN 144. Vista sin fecha de inicio, impuestos ni sentido explícito acreditados: observación documental, no peaje autorizado. El lector web permitió revisar la tabla; descarga directa agotó 15 s. Sin original archivado ni reintento. [Fuente primaria](https://app.sct.gob.mx/sibuac_internet/ControllerUI?action=cmdDatosOperRepDet&idVia=86).
- **Laredo:** PDF oficial final 2026-O-114, página 3 revisada visualmente. Es tráfico hacia México; muestra tarifa comercial vigente de USD 4.75/eje y primer incremento de USD 0.50/eje desde 2027-01-01. El título del registro legislativo conserva un cronograma diferente al adjunto final; no se usa ese título para fijar la vigencia. No se suma al tramo cargado MX→US ni se inventa retorno. [Documento oficial archivado](https://cityoflaredo.legistar.com/View.ashx?GUID=EBC8CE44-5BEF-446A-A2FA-CE782B0A8891&ID=15587923&M=F).
- **Saia:** documentación pública de servicios a México separa drayage fronterizo, despacho aduanal y adicionales de su tarifa base. Adoptamos esa separación, no su precio ni equivalencia con FTL propio binacional. No se creó BOL, cuenta, cotización ni solicitud de negocio. [Documentación primaria](https://www.saiasecure.com/webservice/bol/Create.asp).

Dos originales descargados y fijados por SHA-256 en el JSON; SICT se declara no archivado. La búsqueda pública acotada no produjo un costo de cruce/intercambio FTL 53′ comparable, completo y vigente para esta empresa aún no identificada. No se sustituyó por un importe inventado.

## Puente al resultado económico

| Concepto | Destino existente | Regla de aplicación |
| --- | --- | --- |
| Peaje del puente | Peajes del viaje **o** paquete de cruce | Una sola vez; no ambos. Fecha, sentido, clase, impuestos y FX sustentados |
| Tractor/operador, combustible y tiempo fronterizo propios | CFU/CVU por exposición nacional | No repetirlos en un paquete adicional; empresa binacional no prueba un solo tractor habilitado en ambos países |
| Servicio adicional de cruce | `borderServicesUsd / CROSSING` | Sólo costo incremental no incluido en las etapas nacionales |
| Cambio de tractor/custodia, inspección o patio | `INTERCHANGE` con alcance documentado | Puede ser interno; no cargar tarifa de dos líneas independientes ni asumir cero |
| Remolque compartido | CFU/CVU de remolque único | Un ciclo físico; validar también identidad/reparto del tractor antes de usar las fichas históricas |

El compositor conserva `costo de producción = CFU + CVU + servicios fronterizos`. Sólo se llegará a esa salida con entradas compatibles completas. La matriz anterior es **control documental de inclusión**, no un nuevo detector automático de doble conteo en importes: las pruebas verifican que el anexo no rellena entradas ni habilita el cálculo. Riesgo, margen y precio de venta continúan fuera de este corte. Binacional no significa cruce gratuito ni elimina por sí mismo el cambio físico de tractor.

## Validación y límites

CLI ampliado con un cuarto archivo opcional; uso anterior intacto:

```powershell
node node_modules/tsx/dist/cli.mjs apps/api/scripts/run-d2d-readiness-case.ts docs/research/B2_D2D_READINESS_CASE_2026-09-30.json docs/research/B2_D2D_SAKBE_ROUTE_LINK_2026-09-30.json docs/research/B2_MX_TOLL_FOLLOWUP_2026-09-30.json docs/research/B2_BINATIONAL_BORDER_2026-09-30.json
```

Criterios comprobados: confirma puente sin convertir supuesto de empresa en hecho; verifica caso y originales por bytes; rechaza handoff monetario incluso cero, aprobación, cambio de sentido/contexto y fuentes inconsistentes; conserva linaje, peajes, 41 incidencias económicas y costo null. **88/88 pruebas focalizadas en cuatro archivos, 13 nuevas; typecheck API y scripts/test PASS; CLI real local exit 2 INCOMPLETE esperado**, 3 pins verificados, puente ya no pendiente, compositor false y 0 adopciones/gates. Dos fallos iniciales del arnés (espacios HTML y lector textual demasiado restringido) corregidos y suite reejecutada después de la última modificación. Invocación inicial del typecheck de scripts usó CommonJS incompatible con import.meta; se corrigió a ESNext/bundler y pasó. API conserva su configuración propia. SHA-256 del anexo: `5a6cce075e02b2dd1e7df2d6339f9f374618e22d950a3f73ccf7541390338827`. No hay UI nueva (por tanto no se rediseña ni se sustituye su wireframe MARKSMAN), persistencia, sesión real ni aceptación comercial verificadas aquí.

Matehuala (125 SICT frente a 144 SAKBÉ) y Carbonera (cero sin respaldo) siguen abiertas; 12 coincidencias numéricas no son 12 peajes aprobados. No se reiteraron llamadas Google/SAKBÉ ni se modificó DB, Auth, usuarios, producción, infraestructura, motor activo o cupos. Lecturas públicas de fuentes no equivalen a operación de negocio ni consumo de IA de la aplicación.

## Cierre del siguiente resultado y rollback

**Siguiente único:** completar el escenario de exposición/ciclo binacional y reparto de costos, con fuente pública aplicable y sensibilidad; cerrar peajes/vigencias necesarios antes de una estimación CFU/CVU. No abrir otro sprint de índices genéricos. La fecha del viaje sigue siendo decisión del usuario; no se toma la fecha de investigación como fecha de servicio. No solicitar históricos privados para sustituir el benchmark público exigido.

Rollback local: omitir cuarto argumento para obtener el mismo preflight previo; retirar únicamente el import/parámetro/adjunto/decisión condicional de este corte y la ampliación del CLI si se descarta. Conservar archivos y cambios anteriores, sin reset ni eliminación masiva. No hay rollback remoto ni monetario porque no hubo adopción, escritura de datos o despliegue.
