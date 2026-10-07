# B2 · economía variable de septiembre conectada con LABOR

## Resultado de negocio

Antes, el expediente de septiembre sólo reconstruía LABOR. El resto del viaje seguía expresado en dólares con FIX del 1 de octubre y no podía agregarse sin mezclar valoraciones. Ahora el mismo CLI existente reconstruye **13 partidas no laborales por ciclo** a partir de cantidad × precio/tasa nativa y las integra con LABOR en sus 12 comparaciones. No se creó otra pantalla, otro motor ni un reporte desconectado del cálculo laboral.

Las partidas son combustible de carretera MX/US, mantenimiento/lubricantes/llantas adheridos MX, mantenimiento y llantas adheridos US, cuatro partidas de desgaste bobtail MX y reserva de ralentí MX/US. Los salarios kilométricos históricos no se agregan: se sustituyen por LABOR reconstruido. Comida directa va una vez; la cuota patronal fija queda fuera del subtotal variable. No hay segundo cargo por caja, lubricante US ni mezcla con asignaciones fijas de octubre.

Ejemplo reproducible con la observación FIX del **28/09**, sin elegirla para el motor, bajo `RATE_EXCLUDES_WEEKLY_REST`:

| Ciclo | Componentes no laborales conocidos USD | LABOR variable + comida/M&IE conocidos USD | Subtotal variable conocido USD |
|---|---:|---:|---:|
| Red con vacíos esperados | 2,298.32 | 1,197.97 | 3,496.28 |
| Retorno vacío dedicado | 4,347.64 | 2,384.29 | 6,731.93 |

Son **componentes de una proyección pública bajo hipótesis**, no CVU íntegro, precio de venta, cotización, costo observado ni límite inferior demostrado. El programa conserva también las observaciones del 29/09 y 30/09 y ambas interpretaciones del descanso; ninguna se selecciona automáticamente. No se añade la cuota fija del operador a esos subtotales.

## Benchmark, alcance y criterio de cierre

Se reutilizó la investigación documentada y verificada por hashes. Comparación proporcional:

1. Reescribir el motor: más retrabajo y riesgo; no resuelve las fuentes faltantes.
2. Convertir el total histórico USD: opaco; mezcla monedas y asignaciones fijas, y permite duplicar conductores.
3. **Reutilizar cantidades/tasas originales y reconstruir partidas**, con regresión del histórico: elegida por trazabilidad y menor cambio.

La capacidad diferencial conserva reparto por tractor MX, tractor US y caja compartida, kilometraje adherido/bobtail y exposición del ciclo. Se reutilizan Zod, los calculadores, fuentes y componentes salariales existentes; no se introduce tecnología, dependencia o servicio.

Flujo: fuentes fijadas/recalculadas → perfil y FIX fechados → cantidades/tasas originales → partidas reconstruidas → LABOR una vez → subtotal parcial y remanentes visibles. No cambia la UI; no corresponde abrir un nuevo wireframe para este corte puramente económico.

Criterios cumplidos: 13 identidades únicas por ciclo; conservación de distancias/monedas; rechazo de fecha/valor FX discordantes; no copia de sumas USD/fijos históricos; reemplazo único del mantenimiento US; LABOR/comida/cuota fija sin duplicación; importes desconocidos no convertidos en cero; salida histórica y snapshot existentes conservados.

## Evidencia y límites de las fuentes reutilizadas

- Diésel MX: 27 MXN/litro, observación 25/09 del [comunicado oficial Profeco](https://www.gob.mx/profeco/prensa/profeco-presenta-mapa-de-calor-para-identificar-los-precios-de-los-24-productos-de-la-canasta-pacic-por-cadena-comercial?idiom=es-MX), **extracto indexado**, no cuerpo directo archivado ni precio facturado. Se conserva esa limitación, sin nuevo acceso ni captura.
- Diésel US: 5.955 USD/US-gal, observación 28/09 de [EIA Gulf Coast](https://www.eia.gov/dnav/pet/PET_PRI_GND_DCUS_R30_W.htm), leído en la investigación previa; no precio de corredor/terminal ni nueva lectura live en este corte.
- Eficiencia, desgaste IMT/TTI y reserva DOE conservan sus períodos y poblaciones originales. El uso prospectivo no los convierte en mediciones de septiembre, un par carga/vacío observado o una cohorte conjunta del equipo objetivo. Desgaste bobtail C3 es sensibilidad no emparejada, no tasa calibrada del Cascadia.
- Mantenimiento US usa el agregado histórico 2024 de 0.198 USD/milla del [ATRI Operational Costs 2025](https://truckingresearch.org/wp-content/uploads/2025/07/ATRI-Operational-Costs-of-Trucking-07-2025.pdf). **Reemplaza** TTI una vez. Lubricación incluida es interpretación de planificación ya documentada, no microcategoría medida; llantas y DEF quedan separados. Se comprobó el hash del PDF archivado además del JSON de política.
- No hay actualización por inflación, ajuste de IVA general, homogeneidad fiscal o cotización de transportista inferidos. Los valores nativos conservan el alcance fiscal de su fuente.

La aritmética de diésel, kilómetros y LABOR es reconstruida localmente; distancias, capacidad, relevo y ralentí siguen como hipótesis declaradas. Ningún importe ficticio alimenta el resultado público. Las modificaciones negativas de prueba son sólo corrupción sintética de entradas para comprobar rechazo.

## Verificación y estado

- **155/155 pruebas PASS en siete archivos**: piloto público 63, bobtail 12, variables 18, fluidos 11, septiembre LABOR 10, septiembre economía 18, expediente B2 23. Vitest 1.6.1, salida 0. Primera ejecución: 132 pruebas/seis archivos; se corrigió el nombre del archivo del expediente y se ejecutó explícitamente su suite en la segunda.
- TSC estricto del CLI, nueva prueba y bibliotecas importadas: salida 0 con ESNext/Bundler. Primer intento NodeNext falló por `import.meta` en scripts interpretados como CommonJS; se corrigió el comando, no se cambiaron módulos del proyecto. Una reparación diagnosticada, sin reintento de proveedor.
- CLI existente: salida **2 deliberada** por referencia incompleta; 12 comparaciones, 86 pins, 13 filas no laborales por comparación. Argumento de precio inyectado: salida 1, rechazado. Se comprobó el código del proceso hijo directamente; el código 0 del comando resumen/pipeline no se usa para afirmar cierre.
- Las pruebas de expediente verifican el snapshot anterior, SHA-256 `99594a2ee1e31c67351a77d1124e75ec53d8d5ccbee593c7a5fce2baa264059f`; regresión de variables de octubre exacta. Políticas históricas sin cambios.
- Es cálculo local de evidencia fijada, no prueba Supabase, UI, persistencia SaaS, publicación, operación real ni aceptación humana. No se afirma que la suite integral del repositorio pase; los fallos previos de fixtures de rutas quedan fuera del corte.

**Desarrollado y probado localmente; no desplegado ni adoptado. B2/E1 permanecen abiertos.** CFU, CVU y costo de viaje completos siguen `null`; adopción 0. DEF, peajes/cargos incrementales y demás conceptos aún no reconstruidos para septiembre siguen en la lista de remanentes. También faltan prestaciones completas/riesgo, pernocta mixta MX/US y capital/seguros/empresa del presupuesto fijo. Esto no declara todas las secciones calibradas.

Comandos locales desde `apps/api`:

```powershell
node --import tsx scripts/review-b2-september-labor.ts
npx vitest run tests/benchmark-b2-september-economics.test.ts tests/benchmark-b2-september-labor.test.ts tests/benchmark-pilot-variable.test.ts tests/benchmark-operating-fluids.test.ts tests/benchmark-mx-bobtail-wear.test.ts tests/benchmark-public-pilot-cost.test.ts tests/b2-evidence.test.ts
npx tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --resolveJsonModule scripts/review-b2-september-labor.ts tests/benchmark-b2-september-economics.test.ts
```

## Cambios y rollback

Checkout físico `D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927`, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; inspeccionados antes de editar. Worktree sucio preservado. No se creó rama/worktree/commit/PR.

Modificados: `apps/api/scripts/review-b2-september-labor.ts` y entrada de este corte en `docs/SPRINT_STATUS.md`. Nuevos: `apps/api/scripts/lib/reference-september-operating-components.ts`, `apps/api/tests/benchmark-b2-september-economics.test.ts` y este entregable. El CLI laboral era trabajo previo no rastreado: **no borrarlo completo**.

Rollback selectivo: retirar sus imports y conexión nuevos, comprobación de archivo de mantenimiento, campos `operatingComponents`, `knownVariableComposition`, `selectedVariableCostsRebuiltForSeptember` y pin adicional; restaurar sólo el estado previo `LABOR_REFERENCE_REBUILT_UNDER_DECLARED_HYPOTHESES_E1_OPEN` y comentario. Retirar sólo los tres archivos nuevos de este corte y su entrada de estado. Repetir LABOR/octubre/snapshot. No ejecutar reset/clean contra archivos ajenos; no hay rollback de producción, DB o Auth porque no se tocaron.

## Modelo, consumo y siguiente resultado

Responsable único: Codex. Proveedor OpenAI; elección explícita conservada `gpt-6.1-sol`, esfuerzo solicitado alto. Modelo/versión nativos exactos y esfuerzo efectivo **no observables**; no se cambió el selector. Reutilización y verificabilidad favorecieron continuidad frente a otra implementación/revisión por Claude; no se invocó Claude/Fable/Astra/Luna ni agentes. No se implementó ni activó una política de selección.

Presupuesto del corte: hasta 60 minutos, hasta dos reparaciones diagnosticadas; una reparación de comando TSC. Cuota, tokens y cargos reales no observables; no se presupone uso extra ni costo cero. Sin llamadas de IA auxiliares, APIs nuevas, gasto autorizado, credenciales, Auth, DB, infraestructura, despliegue u operaciones de negocio. La skill `engineering:testing-strategy` orientó pruebas de conservación, duplicados, corrupción e integración, no sólo cálculo unitario.

Siguiente resultado concreto: reconstruir **el presupuesto fijo de septiembre** desde sus componentes nativos para poder unir CFU y este subtotal variable bajo la misma valoración, conservando remanentes explícitos; después resolver suficiencia de las fuentes pendientes. No investigar cada tarifa carretera como condición para validar las fórmulas. No se necesita otra decisión humana para este corte; adopción metodológica material o publicación requerirían autorización específica.
