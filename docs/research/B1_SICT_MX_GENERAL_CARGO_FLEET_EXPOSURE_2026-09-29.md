# B1 · parque y exposición pública del autotransporte mexicano de carga general

Fecha de revisión: 29 sep 2026 · checkout `D:\andre\worktrees\freight-cost-model\cost-tires-release-20260927` · rama `codex/cost-tires-release-s14` · HEAD revisado `4f5fc2de0c3d178dace917231e1092040dec21fd`.

## Resultado

La SICT sí publica un denominador de **tamaño de flota** por servicio federal y clase de vehículo; también publica una estimación de **vehículos-kilómetro** por clase amplia de tránsito para la red estudiada. Ninguno es todavía un denominador compatible para dividir los gastos EAT 2024 de SCIAN 4841 y obtener CFU/CVU por tractor, remolque o km. El hallazgo mejora la selección de una cohorte de equipo, pero **no** calibra una base ni autoriza un costo unitario.

## Parque de carga general federal

La Estadística Básica DGAF-SICT reporta para 2024 1,231,482 vehículos de carga general: 621,681 unidades motrices, 609,707 unidades de arrastre y 94 grúas industriales. La suma concilia exactamente. Dentro de las motrices reporta 401,923 tractocamiones T-3 (64.651% de las motrices); el conjunto de equipo de arrastre incluye 501,404 S-2 y 100,673 S-3. Son distribuciones marginales; no enlazan un T-3 específico con un S-2, y no representan exclusivamente tractocamión con caja seca.

El reporte 2025 eleva el parque general a 1,300,107: 656,399 motrices, 643,613 de arrastre y 95 grúas. La suma también cierra; el parque creció 5.573% interanual. La publicación 2025 sirve como actualización del tamaño del universo, pero para contrastar gastos EAT 2024 se conserva el corte 2024 como año alineado, sin asumir que sus poblaciones son iguales. Ambos cortes están en las publicaciones oficiales [SICT/DGAF 2024](https://micrs.sct.gob.mx/images/DireccionesGrales/DGAF/EST_BASICA/EST_BASICA_2024/Estad%C3%ADstica%20B%C3%A1sica%20del%20Autotransporte%20Federal%202024.pdf) y [SICT/DGAF 2025](https://micrs.sct.gob.mx/images/DireccionesGrales/DGAF/EST_BASICA/EST_BASICA_2025/Estadistica%20Basica%20del%20Autotransporte%20Federal%202025.pdf).

La SICT separa la clase de servicio carga general. Por tanto, es mejor que VMRC —que cuenta camiones/camionetas registrados sin enlazar al carrier de EAT— para caracterizar el parque federal. Sin embargo, EAT mide actividad económica por SCIAN a nivel nacional, no sólo prestadores con permiso federal; comparar gasto EAT con el parque SICT no es una unión estadística válida.

## Vehículos-kilómetro

La publicación DGST-SICT de 2024 estima para la **red nacional estudiada** 41,404,037,329 vehículos-km de camiones de un total de 272,771,959,675 vehículos-km. Desglosa 22,377,105,798 en carretera federal libre, 12,706,364,158 federal de cuota, 4,962,128,987 estatal libre y 1,358,438,386 estatal de cuota. La SICT define el indicador como cantidad de vehículos por distancia recorrida; la publicación incluye el detalle por régimen en [Vehículos-kilómetro 2024](https://micrs.sct.gob.mx/images/DireccionesGrales/DGST/Vehiculos_Kilometro/V-Km_DV2025-ENT.pdf).

Es una referencia de exposición de tránsito e infraestructura; “camiones” no identifica carga general vs. especializada, configuración tracto-remolque, propiedad del equipo, corredor D2D, empresa, carga/vacío o días productivos. Tampoco está documentado en este tabulado un cruce con las observaciones empresariales de EAT. En consecuencia, tampoco se divide el gasto EAT por este total.

| Denominador | Cobertura útil | Uso permitido ahora | No acredita |
|---|---|---|---|
| Parque SICT por servicio y clase, año 2024/2025 | Carga general federal; motrices, arrastre, T-3, clases S | Elegir cohorte candidata y dimensionar universo | Km por unidad, utilización, combinación de equipo, costos por unidad o población EAT |
| Vehículos-km SICT 2024 | Camiones en redes federal/estatal estudiadas, libres/cuota | Contexto macro de exposición; control de magnitud de tráfico | Km de un carrier o segmento, kilometraje productivo, combustible/peajes por viaje |
| EAT 2024/SCIAN 4841 | Gastos e ingresos de empresas/establecimientos de la rama | Contrastes agregados por familia | Unidades compatibles SICT ni kilometraje por servicio/equipo |

## Dictamen metodológico

1. Mantener EAT 4841 para contrastar familias económicas y SICT para contexto de flota y tráfico, en conjuntos de evidencia separados.
2. No calcular `gasto EAT / flota SICT`, `gasto EAT / camión-km SICT` ni `CFU por unidad` a partir de esos cocientes: sus poblaciones y granos difieren.
3. Para el piloto D2D con tractor-tráiler, solicitar un ancla de productividad pública con el mismo segmento y tipo de vehículo: km anuales/cost-bearing miles, loaded/empty, días disponibles/productivos y vínculo de cohortes. Si sólo se obtiene flota censal, conservar el parámetro como `MISSING`.
4. Para seleccionar equipo, T-3 es candidato de cohorte frecuente por conteo, no prueba de la configuración T-3/S-2 ni representatividad de un carrier tercero del piloto. Caja seca y emparejamiento deben quedar declarados como alcance, no inferirse de “carga general”.

Registro reproducible de cifras, operaciones y estado de adopción: [JSON de observaciones](B1_SICT_MX_GENERAL_CARGO_FLEET_EXPOSURE_2026-09-29.json). EAT permanece en su [cruce previo](B1_INEGI_EAT_2024_4841_CROSSWALK_2026-09-29.md). Cero parámetros adoptados; B1/E1 continúan abiertos.

## Validación y rollback

Se verificaron dos conciliaciones exactas del parque por clase: `621,681 + 609,707 + 94 = 1,231,482` (2024) y `656,399 + 643,613 + 95 = 1,300,107` (2025). Las cuatro filas de vehículos-km suman `41,404,037,329.032` en 2024. Cambio interanual de parque general: `(1,300,107 / 1,231,482 − 1) × 100 = 5.573%`. Las fracciones se redondean sólo para presentación; el JSON conserva los conteos íntegros.

Trabajo sólo documental: no se ejecutó suite de aplicación. `git diff --check` se usa como verificación del parche documental. No se cambiaron fórmulas, motor, UI, wireframes, DB, Neon, usuarios, Auth, infraestructura, parámetros, bases, rutas, cotizaciones ni despliegues. Rollback: retirar este informe y su JSON, y revertir sólo las referencias nuevas en estado/plan; no hay dato externo que restaurar.

Modelo para este corte: GPT-6 Luna · esfuerzo alto para extracción y conciliación pública; GPT-6.1 Sol · alto para validación metodológica. Astra no era necesario: la conclusión de comparabilidad resulta directamente de la definición de población y grano de las fuentes.
