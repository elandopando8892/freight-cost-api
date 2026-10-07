# B2 - Tiempo de movimiento versus ciclo y reparto administrativo

Revisión1oct2026 22:06MX. Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927, rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`. Estado/historial/AGENTS leídos antes de editar; cambios ajenos preservados. Corte anterior: progreso (cantidad administrativa calculada e integrada). Este corte: progreso de evidencia/cálculo, no cierre B2.

## Qué cambió y por qué

El costo de administración no se puede repartir por una flota inventada ni combinando salarios MX con camiones PAMT. El 10-Q primario de PAMT fue reabierto: salarios/beneficios agregados y segmentos de truckload/brokerage no aíslan la nómina administrativa del escenario mexicano. El expediente existente ya advertía que empleados no conductores no equivalen a siete roles administrativos. No se volvió a intentar convertir ese agregado en pool completo.

El siguiente insumo necesario es exposición del servicio. Antes el resumen económico no conciliaba el detalle SAKBÉ retenido con horas de conducción/pausa. Ahora incorpora dos contrastes de reloj explícitos, verifica que las sumas de67 segmentos coincidan y separa tiempo nominal, pausa y descanso entre días. No modifica `allocateFixedCost`, trailer attachment, engine publicado, ruta operativa o datos del viaje.

## Benchmark/reuso y decisión previa al código

| Alternativa | Ajuste y riesgo | Decisión |
| --- | --- | --- |
| Minutos ideales /24 = ciclo | Omite pausas, descanso y demás ocupación; no es tiempo medido de camión | Rechazar |
| Reloj por bloques y pausas explícitas | Resuelve una etapa reproducible reutilizando detalle retenido y normas públicas; no resuelve ciclo ni validación de carretera | Adaptar como sensibilidad, no adoptar exposición |
| Optimización/solver de despacho | No hace falta para mapear rutas y estimar costo; duplicaría alcance/infraestructura | Rechazar |

Capacidad estándar (reloj), sin declarar innovación ni nueva arquitectura. TypeScript/Zod existentes; no dependencia ni tecnología nueva. Criterios de este corte: conservación de conducción, pausas correctas, descanso intermedio, límites móviles24h del patrón sintético, fuentes íntegras, no convertir resultados en ciclo/costo completo. No UI alterada; no wireframe nuevo. B3 sigue requiriendo wireframe MARKSMAN y validación del recorrido SaaS.

## Evidencia pública y límites

- [NOM087 texto oficial](https://sidof.segob.gob.mx/notas/docFuente/5529381), secciones4.1/4.2/4.6/4.7/8.3.2: pausa30min por5h de conducción, cap14h por24 y descanso continuo8h para14h. Original HTML archivado con SHA256 `50b74e73ecdc5e242f5af5441d918e86ee242c07490dcb34479b4c053ffcbea2`.
- [Catálogo oficial de Economía](https://platiica.economia.gob.mx/normalizacion/nom-087-sct-2-2017/): Vigente, revisión2023 confirmación. Archivo SHA256 `a984de8ebab7c149164b4b2f085b8bf9eb32b250ad8e0bd9f2a4be7d28aae3b7`. Programa2026 contempla reemplazo; no confundir proyecto con norma publicada y vigente distinta.
- [FMCSA resumen oficial](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations), columna de carga:11h conducción/14h ventana/10h reset, pausa después8h conducción y límites60/70 por7/8 días. Lector web revisado, descarga directa fallida; no original archivado. No copiar reglas de pasajeros ni aplicar estos números al tramoMX. No nueva investigación reglamentaria genérica.
- [PAMT 10-Q](https://www.sec.gov/Archives/edgar/data/798287/000143774926026560/ptsi20260630_10q.htm): revisión de alcance, no nueva cifra para el pool.
- Detalle SAKBÉ30sep2026 original local: pin `731cb21c1f7bfe2196ab90b12d56a91d4ebd4b1ef5b698ce73209341958b2970`; total1124.5764209526735km,709.8829924923754 minutos ideales. Sigue candidato, no geometría/endpoints confirmados ni ruta de truck aprobada. No se promueven sus peajes observados, ceros o anterior trazo SICT.
- Recibo Google30sep2026: pin `38ac14333857627c86defeaa76ef82f604fc307837234929b2dd5c5e218980f8`, valida contrato real en memoria pero `routeContentPersisted:false`; no distancia/duración US recuperables del JSON. Se comprobó cliente/CLI: no imprimir/cachear contenido cartográfico en reporte retenido. No llamar de nuevo al proveedor ni leer claves para rellenarlo. El presupuesto y alcance de una **nueva** consulta requieren autorización puntual según expediente previo; cuota gratuita de la cuenta desconocida, no promesa de costo cero.

## Dos contrastes, no un intervalo de confianza

Hipótesis: tratar minutos ideales SAKBÉ como conducción nominal para sensibilidad; conductor fresco al inicio. No afirma que esa igualdad sea tiempo real ni cota inferior. El bloque de diez horas es política de planeación explícita, no un promedio observado. El de catorce usa el tope de conducción, no permiso de jornada laboral ni recomendación operativa.

```text
D = 709.8829924923754 /60 = 11.831383208206257 horas nominales
Pausas dentro de un bloque = (ceil(conducción/5)-1) *0.5
Inicio del siguiente bloque completo = inicio anterior +24h
```

| Política explícita | Bloques | Pausas | Descanso intermedio | Movimiento condicionado |
| --- | ---: | ---: | ---: | ---: |
| Diez horas/24h | 2 | 0.5h | 13.5h | 25.831383208h |
| Catorce horas/24h | 1 | 1h | 0h antes de llegada | 12.831383208h |

Con bloque completo14h, conducción14+pausas1 =15h, descanso intermedio9h hasta la siguiente frontera24h: no reiniciar automáticamente después de8h y violar el cap móvil. No agregar pausa o descanso ficticio después de llegar cuando no continúa la conducción. El modelo excluye otras actividades: no demuestra jornada laboral, horas previas, seguridad, parqueo o viabilidad de agenda.

`supportingCaseCycle` vincula pin34 al caso elegido MéxicoDF-NuevoLaredo, PuenteIII/relevo propio/misma caja. Conserva segmentos/pins; sin reemplazar request/readiness históricos. `actualCycleDays`, ciclos de tractores, caja serial, flota, reparto administrativo y monto por viaje siguen null. No asumir retorno vacío, regreso de caja, días productivos o tiempo de frontera cero. Ni distancia ideal ni horas de conducción definen por sí solas presupuesto/denominadores CFU.

## Validación y auditoría del objetivo

257 pruebas únicas aprobadas en4 archivos: resumen167, exposición35, presupuesto30, etapaMX25. Typecheck strict PASS. CLI reproducido: exit2 esperado,34pins verificados, cifras de tabla confirmadas,0/10 partidas completas,0adopciones y seis outputs null. No build general ni pruebas autenticadas/producción: cambio en investigación local. Guía de pruebas concentró integridad de datos, conservación/ventanas móviles y no promoción de fixture a benchmark.

| Requisito del objetivo B2 | Evidencia actual | Estado |
| --- | --- | --- |
| Fijos y variables públicos completos | Componentes documentados; presupuesto0/10 completo | Incompleto |
| Capacidad, distancia/tiempo/vacío/cruce | DetalleMX condicionado; US sin contenido retenido; demás fases pendientes | Incompleto |
| Recursos y caja/admin una vez | Compositor/attachment/MAX probados con síntesis, no caso económico completo | Soporte local, aceptación pendiente |
| Estimación D2D completa reproducible | Componentes y etapas reproducibles, CFU/CVU/costo del piloto null | NO logrado |
| SaaS seleccionar/calcular/guardar/reabrir | B3 posterior, no sustituye el resultado económico | Pendiente |

Siguiente crítico: recuperar **una observación US permitida y un plan de uso transitorio autorizado**, sin evadir términos/cartografía; completar fases carga/frontera/retorno y relacionar exposición compatible con pool y presupuestos. No abrir nuevos sprints por cada artículo fiscal. Las hipótesis deben ser visibles y documentadas, no hechos del carrier ni importes inventados. No solicitar documentos privados XBF para sustituir fuentes públicas. El objetivo B2 se conserva íntegro y activo.

## Gobierno, consumo y rollback

Responsable/escritor/verificador: Codex actual. Recomendación GPT-6.1 Sol alto para conciliación; medio suficiente QA acotado. Modelo/effort servido no observable, selector intacto. Actual suficiente: aritmética verificable y fuentes acotadas; no llamada auxiliar. Fable/Astra no aportan ventaja necesaria para reloj/integridad, no disponibilidad/costo asumidos. Claude Max x5 declarado históricamente, cuotas5h/semanal/Fable/reset/usoextra/ruta suscripción actuales desconocidos, no CLI/API o lectura de credenciales.

Codex: lectura automática soportada21:57:46MX, semanal100% usado/duración10080min/ordinaryUsageAllowed=false/créditos disponibles; reset6oct2026 13:08MX. Autorización previa de continuidad con posible consumo adicional, sin cambios de facturación; cargos/tokens del corte desconocidos. Presupuesto previo25min,1reintento, reserva5min para verificación. Descarga FMCSA fallida no repetida; dos rutas de archivos exploradas no existían, búsqueda acotada corrigió localizadores. Fallos no contados como consumo cero. No porcentaje de ahorro ni equivalencia tokens/cuota inventados. Cierre: mantener distribución única Codex; próximo trabajo no requiere escalar por ausencia de datos.

Sólo D: local. Sin DB/Neon/Auth/usuarios/migración/infraestructura/publicación/operaciones/IA de aplicación;0Google calls este corte. Rollback: retirar únicamente nuevo import/pins3/bloque de validación de archivos oficiales y proyección `supportingCaseCycle` en consolidator; tests nuevos de integración; helper/test/JSON/MD/originales HTML de este corte tras comprobar rutas exactas. Retirar encabezados actuales de status/plan, conservar toda cronología y cambios previos. No reset/checkout global ni borrado recursivo. Los registros SAKBÉ/Google originales no cambiaron y la clave privada no fue leída.
