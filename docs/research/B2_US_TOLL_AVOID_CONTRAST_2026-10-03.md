# B2 — contraste de peajes US y cobertura CAPUFE

## Qué cambió

La comprobación pública identifica un itinerario Google de693mi con evitar peajes activado frente al benchmark CommercialTruck de734.4mi. Es evidencia nueva sobre una alternativa, **no** una tarifaUS confirmada para las734.4mi. El costo base, sus79pins, CFU/CVU y archivos anteriores permanecen intactos. No se convirtió ausencia de tarifa en cero ni se declaró cerradoB2.

El objetivo sigue siendo una estimación D2D completa, por recurso, una caja y una administración, con fuentes y supuestos explícitos. Este contraste permite descartar una mezcla de itinerarios que habría generado un costo engañoso.

## Benchmark antes de adoptar una ruta

Fuentes primarias observadas3oct2026UTC:

- [FreightSidekick](https://freightsidekick.com/tools/route-planner), selección CommercialTruck visible y un CalculateRoute, no Optimize:734.4mi/11h36min. Archivo anterior registra734.4mi/11h37min; diferencia de un minuto no cambia el snapshot fechado. La interfaz no ofrece instrucciones textuales de calles ni certifica restricciones. Revisión de [términos](https://freightsidekick.com/terms): acceso público no acredita integración o redistribución comercial; no se consultó estado privado, backend ni se extrajeron rutas en lote.
- [GoogleMaps, referencia pública](https://www.google.com/maps/dir/18702+Metropolitan+Road,+Laredo,+TX+78045/72916,+Fort+Smith,+AR/): ambos textos de extremo visibles. Antes y después de activar AvoidTolls, primera alternativa693mi/10h55min. CheckboxAvoidTolls=1, Driving=1, AvoidHighways=0 y AvoidFerries=0 comprobados después del resultado. DRIVE, no TRUCK; reloj con tráfico usual, no jornada real.
- Contraste por [Eufaula](https://www.google.com/maps/dir/18702+Metropolitan+Road,+Laredo,+TX+78045/Eufaula,+OK/Fort+Smith,+AR+72916/):714mi/11h7min. Se investigó si un corredor diferente explicaba las734.4mi; **no las reproduce**, por lo que se rechaza esa explicación. Eufaula no es un nuevo stop del usuario y no se carga servicio/parada.

Los mismos textos de origen/ZIP no prueban centroide ni geometría idénticos. Origen público de patio no equivale a patio contratado; ZIP no equivale a muelle. No se adopta la opción más barata sólo por ser más corta. No se conservan polilíneas, instrucciones cartográficas, coordenadas de resultado ni datos de cuenta. La navegación pública no fue una llamada MapsPlatform con clave; tampoco es una integración aprobada del proveedor.

Alternativas evaluadas: (a) aplicar ceropeajeUS a734.4mi por analogía — rechazado, mezcla rutas; (b) reemplazar automáticamente por693mi — rechazado, DRIVE y extremos sin equivalencia; (c) conservar benchmark y documentar alternativa con sensibilidad económica — elegida. Sin dependencias, API pagada o tecnología nueva. No UI propia ni cambio de branding/wireframe.

## Impacto cuantificado, sin falsa suma completa

Reutilización de tasas ya fijadas en `reference-pilot-variable.ts`: diésel5.955USD/gal÷7.9mpg, mantenimiento0.212USD/mi, llantas0.048USD/mi, remuneración reportada0.817USD/mi. No salarios/base nueva, caja duplicada ni tasa por eje inferida.

| Contraste contra734.4mi | Diferencia de ida | Cuatro componentes US de ida | Red, vacío7.61% | Dedicado, regreso simétrico |
| --- | ---: | ---: | ---: | ---: |
|693mi, DRIVE evita peajes|−41.4mi|−75.79501519USD|−82.03811580USD|−151.59003038USD|
|714mi, vía puntoEufaula|−20.4mi|−37.34826835USD|−40.42457880USD|−74.69653671USD|

Fórmula: diferencia de millas×suma de cuatro tasas; red divide por0.9239, dedicado×2. **No es ahorro completo deCVU oD2D**: DEF, ralentí, jornada, capacidad, CFU, puente/peajes y otros gastos requieren recomposición conjunta antes de sustituir ruta. Cifras calculadas no elevan la precisión del readout ni representan intervalo estadístico/mercado. La diferencia no se aplicó al presupuesto.

## Carbonera/OjoCaliente: vía adicional agotada

Se descargó en memoria el [original de transparenciaCAPUFE2026](https://pot.capufe.mx/gobmx/Transparencia/Doc/TransparenciaF/Tarifas/Vigentes/2026/Tarifas-vigentes-2026.pdf): SHA256`89166b501dd5b9f75bc9572e3da841b854e6942c35d89dae1d06747ac399cbf1`, idéntico al originalIAVE archivado. Se renderizó y revisó la página1 íntegra: filaLibramientoOrienteSaltillo/OjoCaliente, vigencia13abr2026, C2–C9 blancos; LosChorrosC5=306 es otra fila. No es una segunda tabla independiente que resuelva la ausencia. El cero2024/SAKBE previo sigue sin probar exención vigente.

La tabla legalCoahuila1993 encontrada en búsqueda no prueba vigencia2026, identidad de plaza/clase ni actualización monetaria y no se adopta. Se inspeccionó la páginaIAVE pública y su script; su mapa regional no aportó una nueva tarifaC5. No se siguieron búsquedas genéricas sobre plazas homónimas ni se llamó a una API para rellenar el hueco.

## Verificación, límites y próximo resultado

Manifiesto nuevo `B2_US_TOLL_AVOID_CONTRAST_2026-10-03.json`: hechos observados, comparación cuantificada, fuente previa fijada, lectura vigente CAPUFE, no adopción ni geometría. Comprobaciones locales PASS: SHA256 de la referencia postal y el original CAPUFE; unidades y aritmética de las dos diferencias; tasas y proporción de vacío contrastadas con el consolidado existente; outputs completos `null`, efectos externos `false` y 79 fuentes fijadas conservadas. Regresión de cobertura MX, cadena de seguro de carga y consolidado: **264 pruebas PASS, tres archivos, salida 0**. `git diff --check` y comprobación de espacios finales en los dos archivos nuevos PASS. No son pruebas de circulación, autenticación, persistencia, aprobación de carretera, cuenta o producción.

Próxima acción necesaria para cerrar el costoUS: comprobar el corredor de la referencia734.4mi y sus movimientos de peaje, **o** definir un nuevo escenario vial coherente y recalcular juntos distancia, reloj, vacíos, productividad, CFU y CVU. No sumar el precio de una ruta al kilometraje de otra. Para completarB2 también sigue pendienteCarbonera actual/servicios y supuestos no equivalentes; no abrirB3 con una cifra presentada como completa.

## Modelo, consumo y recuperación

Elección humana registrada2oct16:46:22UTC: Codex `gpt-6.1-sol/high`; selector principal no cambiado/modelo y esfuerzo efectivo no reobservables. Claude no seleccionado ni invocado; Fable no tiene ventaja demostrada para completar esta evidencia ausente. SkillsPDF: revisión visual de tabla; computer-use: navegación pública sólo por el browser soportado, sin Windows nativo; claude-review: elección/snapshot/escritor único, sin inferenciaauxiliar.

Cuota soportada leída3oct01:58:47UTC: semanal11%utilizada/10080min, próxima reposiciónUnix1791580450; ventana5h desconocida, no0. Claude5h/semanal/Fable desconocidos. No se infieren cargos, ahorro de cuota o consumo fallido cero. MáximoB2 autorizado240hglobal, sin deadline añadido por corte;80pasos, contexto6000bytes, cero retry/fallback de proveedor, dos reparaciones locales antes de reevaluar. Tres casos públicos comparados; cuatro cálculos si se cuenta la recomputación automática al activar evitar peajes. Se registra esa diferencia respecto del límite de tres del contrato y se detienen nuevos cálculos; no se oculta el conteo ni se amplía por defecto. Sin gasto extra activado.

Un botón públicoOpenInGoogleMaps no abrió pestaña ni cambió estado; no se repitió ciegamente: se abrió directamente la consulta pública de los mismos extremos. WebscreenshotPDF no devolvió imagen utilizable; se revisó el original local mediante Poppler y hash común. Herramienta de dependencias antigua devolvió no disponible; se utilizó el entrypointMCP soportado, sin instalar nada. Estos resultados no son ejecución exitosa ni consumo cero de sus primeros intentos.

Rama`codex/cost-tires-release-s14`, HEAD`4f5fc2de0c3d178dace917231e1092040dec21fd`, worktreefísicoD, dirtywork conservado. Sólo dos nuevos archivos del incremento. No SQL/Auth/usuarios/Neon/infra/migración/deploy/commit/push/PR/operación de negocio. Rollback: no consumir este manifiesto nuevo; no hay cambio monetario/runtime que revertir. Si se retiran los dos artefactos tras comprobar ausencia de cambios posteriores, conservar fuentes y archivos anteriores. No limpieza destructiva ni revisión de sesiones privadas.
