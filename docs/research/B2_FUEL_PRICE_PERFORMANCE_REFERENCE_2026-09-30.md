# B2 · combustible MX/US: precio y rendimiento
Fecha del corte: 2026-09-30. Estado: investigación acotada completada; **FUEL no calibrado**, B2 parcial, cero parámetros adoptados y 0/4 gates de negocio cerrados.

## Resultado de negocio y decisión
Hay dos referencias públicas de precio fechadas y cuatro contrastes reproducibles de rendimiento. No hay pareja cargado/vacío compatible con el perfil del piloto D2D caja seca, dos transportistas terceros con intercambio y sin transbordo. No se fabrica un CVU de combustible ni se convierten estos contrastes en inputs.

La guía de análisis separa referencia, contraste e input aplicable. La revisión visual de PDF confirmó las unidades y notas de las tablas: el grupo ligero estadounidense no acredita vacío y ambas filas mexicanas declaran carga. Una publicación reciente no rejuvenece sus observaciones históricas.

**Siguiente corte único: mantenimiento y llantas, costo exclusivo por km y frontera de inclusiones.** Entregable: fichas MX/US que separen tracto, remolque, llantas, recape/casco, intervalos/vida y exclusiones; puente a COST_MAINT/COST_TIRES sin duplicación, o faltante económico concreto. Se reutiliza el inventario existente. No otra ronda genérica de MPG ni un nuevo sprint de schemas. Después: fijo/exposición/remolque, caso D2D, recorrido SaaS con wireframes y release autorizado.

FUEL sólo se reabre ante un estudio público específico compatible o un modelo de planificación explícito, sustentado y revisado. No se exige información privada para investigar; tampoco se inventa una pareja faltante.

## Fuentes, vigencia y límites
- [Profeco, comunicado del 28 sep](https://www.gob.mx/profeco/prensa/profeco-presenta-mapa-de-calor-para-identificar-los-precios-de-los-24-productos-de-la-canasta-pacic-por-cadena-comercial): extracto oficial indexado reporta diésel nacional **27 MXN/L al 25 sep 2026**. Acceso directo web 403; respuesta de shell HTTP 200 fue Challenge Validation, no contenido. **Confirmación directa pendiente**, sin snapshot de página. No es precio de corredor, contrato ni compra neta; grado y fiscalidad no establecidos.
- [EIA PADD3 Gulf Coast](https://www.eia.gov/dnav/pet/PET_PRI_GND_DCUS_R30_W.htm): lectura directa, **5.955 USD/gal US al 28 sep 2026**, publicación 29 sep. On-highway ULSD ≤15 ppm, impuestos incluidos. No es estación/terminal ni tarifa descontada del transportista; respuesta cruda no archivada.
- [IMT PT881](https://imt.mx/archivos/Publicaciones/PublicacionTecnica/pt881.pdf), publicación 2025: Anexo 2, tabla A.2, página impresa 71 / página física PDF 81. Registros de cursos **2001–2014**, dos T3S2 de modelos 1995/1996, rutas distintas. No perfil 2021 ni split cargado/vacío por dirección; carrocería caja seca no acreditada en la tabla.
- [ORNL TM2011/471](https://info.ornl.gov/sites/publications/files/Pub33386.pdf), octubre 2011: tabla principal 7, página impresa 29 / física PDF 41; metodología pp.3–5. Datos **2006–2008**, seis Volvos 2005, aproximadamente 65 mph y pendiente entre −1% y +1%. Pesos medidos/estimados; grupos no equivalen a estados vacío/cargado certificados. No ciclo completo con ralentí/espera.
- [NIST, conversión de unidades](https://www.nist.gov/document/2023-nist-handbook-44-appendix-c-0): 3.785411784 L/gal US y 1.609344 km/milla internacional. No galón imperial.

Los originales IMT y ORNL se conservaron en sources/ con SHA-256 en el JSON. Se extrajeron texto y páginas; se revisaron visualmente las dos tablas citadas. La primera selección IMT fue una página en blanco, corregida a la física 81 antes de extraer valores. No se usan el apéndice C ni coeficientes redondeados de una figura ORNL.

## Sensibilidad aritmética, no costo observado del piloto
Combina precios 2026 con rendimientos históricos de poblaciones distintas. Las filas NO son un experimento pareado, intervalo estadístico ni tarifas adoptables.

| Contraste | Evidencia de rendimiento | Rendimiento km/L | Combustible por km, moneda nativa |
| --- | --- | ---: | ---: |
| MX T3S2 30 t | Veracruz–Perote–Veracruz; 1.47 km/L | 1.4700 | 18.3673 MXN |
| MX T3S2 20 t | Veracruz–Casablanca–Veracruz; 2.01 km/L | 2.0100 | 13.4328 MXN |
| US peso total 30–40 mil lb | MPG publicado 9.5; no vacío certificado | 4.0389 | 0.3895 USD |
| US peso total 70–80 mil lb | MPG publicado 7.9; no carga objetivo certificada | 3.3586 | 0.4684 USD |

No comparación monetaria MX↔US sin FX. No se atribuye la diferencia mexicana al peso: cambia ruta, vehículo y año. El MPG impreso ORNL es redondeado; no se sustituye por divisiones reconstruidas de sus agregados.

## Puente a la metodología existente
- USD/gal US ÷ 3.785411784 = USD/L; aquí 1.5731445718 USD/L.
- MPG × 1.609344 ÷ 3.785411784 = km/L.
- Precio mexicano MXN/L ÷ FX MXN/USD = USD/L; FX no seleccionado en este corte.
- Fórmula existente: precio USD/L × (km cargados ÷ km/L cargado + km vacíos ÷ km/L vacío).

Las claves del motor diesel-mx, diesel-us-border, tipo-de-cambio, rendimiento-cargado y rendimiento-vacio están conciliadas. **El input US ya es USD/L**: no introducir 5.955 directamente ni convertir dos veces. No se editó el motor ni se sustituyeron defaults. Si otro bloque ya incluye combustible/surcharge, no se suma otra vez. Ralentí/auxiliares requieren frontera explícita, no cero por ausencia de evidencia.

## Faltantes que impiden calibrar
MX: pareja cargado/vacío compatible, confirmación directa del precio o referencia oficial alternativa, región/producto/fiscalidad del escenario y FX aplicable.
US: estados operativos compatibles, perfil/ruta/velocidad/pendiente/espera/ralentí y tratamiento de inclusiones. PADD3 no selecciona corredor.
Ambos: rendimientos, costo de combustible piloto por km y por viaje permanecen null. No subtotal monetario completo elegible ni compra/venta inferida.

## Validación y evidencia
- **297/297 pruebas focalizadas en 11 archivos**, 22 nuevas de combustible. No certificación de suite general, login ni aceptación operativa.
- Typecheck API y comprobación estricta del script: PASS.
- Revisor offline: salida 2 esperada por NO-GO económico; seis archivos fijados coinciden (dos PDF y cuatro expedientes previos). Primera invocación sin argumento produjo uso/salida 1; corregida con el JSON explícito, sin interpretar error como readiness.
- Auditor canónico: salida 0 sin incidencias documentales; 135/135, 3 candidatos, 47 contrastes, 85 faltantes, cero adoptadas. El auditor no aprueba costo económico.
- Análisis Python independiente: cuatro contrastes, equivalencia USD/milla↔USD/km, redondeo publicado, seis hashes y nulls verificables PASS.
- [Notebook reproducible](B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.ipynb): cuerpo ejecutado por archivo con Python de sistema; salidas capturadas. Invocación inline empaquetada no produjo salida utilizable; no instalación ni reparación extensiva. **No ejecución de kernel Jupyter ni inspección renderizada certificadas**.
- [JSON de evidencia](B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json); revisor apps/api/scripts/review-fuel-reference.ts y prueba apps/api/tests/benchmark-fuel-reference-evidence.test.ts, offline y sin motor nuevo.

## Alcance, modelo y rollback
Trabajo explícito en D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14, HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. AGENTS aplicables revisados antes de actuar; worktrees verificados. Árbol ya sucio, cambios previos conservados; no staging ni commit.

Modelo recomendado: GPT-6.1 Sol · alto para investigación, conciliación económica y pruebas; medio para empaquetado documental. No se afirma cambio automático de selector ni necesidad de Astra.

Sin DB/Neon/Auth/usuarios/infra/deploy/producción/operaciones de negocio/IA de aplicación ni UI. No adopción de bases. El cambio documental no requiere nuevos wireframes; el futuro corte SaaS sí.

Rollback: retirar únicamente los nuevos JSON/MD/ipynb, revisor y prueba de este corte y los dos PDF públicos archivados; quitar sólo los párrafos nuevos de estado/plan. No restaurar archivos enteros ni revertir cambios ajenos. Los originales públicos permanecen en sus enlaces; sus hashes permiten comprobar recuperación. No se ejecutó eliminación ni rollback.

