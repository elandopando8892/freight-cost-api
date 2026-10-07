# B2 · referencia numérica de capacidad y conciliación del denominador

## Resultado y alcance

Antes había millas de flota y conteos separados, sin contraste numérico por tractor. Ahora el consolidado local calcula seis candidatos condicionados y explica por qué no son capacidad calibrada del piloto. El expediente anterior conserva sus bytes y hash; este suplemento añade evidencia, no reescribe la historia.

Objetivo: disponer de una referencia pública reproducible para formular la hipótesis de utilización del tractor US, manteniendo separados presupuesto, población y días productivos. Flujo de revisión: fuente → periodo y población → proxy y sensibilidad → revisión económica; nunca publicación automática de una base. Sin cambio de UI, arquitectura, API ni infraestructura: se reutiliza el reporte local existente. Cuando se lleve al SaaS deberá conservar etiqueta de hipótesis y wireframe MARKSMAN antes de implementar.

## Comparación previa y decisión

| Enfoque | Ajuste y riesgo | Decisión |
|---|---|---|
| Millas totales / tractores company-driver | Excluye owner-operators sólo del divisor; sus millas no están segregadas | Rechazado como capacidad de activos propios; mostrar sólo sensibilidad aritmética |
| Millas totales / promedio company-driver + owner-operator | Misma tabla operativa; conteo semestral corroborado. Unión completa de millas, tractores y días aún no demostrada | Recomendado como proxy condicionado, no adoptado |
| Mantener sólo total de flota | Conservador, pero no permite comparar la magnitud por tractor | Conservar como input documental, no como único entregable |

Se reutiliza PAMT frente a Werner/Schneider por la comparación vigente del [expediente anterior](B2_US_DRYVAN_CAPACITY_2026-10-01.md). Fuentes públicas, sin licencia nueva ni cargos activados. La aritmética es estándar; la parte específica es su trazabilidad y compatibilidad con recursos del D2D, no un nuevo motor.

## Evidencia y discrepancia

El [10-Q presentado el 7 agosto 2026](https://www.sec.gov/Archives/edgar/data/798287/000143774926026560/ptsi20260630_10q.htm), MD&A pp16–18, distingue servicios por activos propios/contratistas. Corrobora promedios H1 de 2,132 y 1,999 tractores, iguales a las sumas de las dos columnas del comunicado. Sus conteos Q2 de 2,083/1,994 son al cierre: no reemplazan los promedios 2,084/1,994. Reporta productividad +12.0% Q2 y +8.9% H1, pero no aporta aquí días productivos absolutos ni una unión inequívoca de millas con activos.

El [comunicado del 4 agosto 2026](https://www.sec.gov/Archives/edgar/data/798287/000143774926025703/ex_998666.htm) reporta +12.8% Q2. Nuestra división combinada produce +12.8322% Q2 y +10.1822% H1. Coincidir con un porcentaje redondeado no demuestra el denominador; tampoco resolvemos por preferencia el desacuerdo Q2 o igualamos tractores en servicio con tractores ocupados.

Extracción estructurada del lector web, no copia HTML original ni tabla operativa auditada. Fechas, localizadores y afirmaciones preservados en el JSON del mismo nombre. No nuevas descargas tras el 403 ordinario documentado en el expediente anterior.

## Candidatos calculados

`q = millas totales × 1.609344 / meses / (promedio company-driver + promedio owner-operator)`

| Periodo | Promedio combinado | q condicionado km/tractor-mes | Divisor sólo company-driver, no capacidad propia |
|---|---:|---:|---:|
| FY2024 | 2,289 | 10,466.48 | 13,149.16 |
| FY2025 | 2,095 | 10,483.59 | 13,787.27 |
| H1 2025 | 2,132 | 10,262.34 | 13,480.78 |
| H1 2026 | 1,999 | 11,307.27 | 14,629.93 |
| Q2 2025 | 2,084 | 10,387.89 | 13,710.17 |
| Q2 2026 | 1,994 | 11,720.88 | 15,176.25 |

Preferir **H1 2026 para el contraste condicionado** por amplitud reciente y corroboración del conteo; FY2025 y Q2 2026 son sensibilidades temporales, no límites probabilísticos ni periodos sumables. Ninguno prueba utilización mensual de un tractor 2021 específico, US-only o relevo binacional propio. No se adopta q ni se usa con presupuesto de otra población.

`UTILIZATION` obtiene una hipótesis cuantificada; `GENERAL_BASE` separa tipo/conteo de población. `COST_CAPITAL`, `COST_PAYROLL` y `COST_COMPANY` deben mantener el mismo ámbito al formular el presupuesto. Días productivos de MX/US/caja, capacidad de la caja y presupuesto completo siguen pendientes. No inferir días desde semanas de ingresos ni copiar los 268 días ATRI.

El costo fijo por recurso conserva `C × MAX(km_ciclo/q, días_ciclo/p)`. Falta p y C compatibles: **no calcular ni llamar piso al término por distancia solo**. La misma caja se costea una vez en su ciclo serial; el factor publicado de vacíos no determina el retorno DF–Fort Smith.

## Criterios de cierre y siguiente entregable

Este corte cierra si: seis divisiones reproducibles, conteos H1 cotejados, diferencias de productividad visibles, ninguna sustitución promedio/cierre, preservación de pins anteriores y ninguna adopción/CFU artificial. No cierra B2 ni el MVP.

Siguiente entrega económica agrupada: perfil público modelado con supuestos revisables y presupuesto/exposición compatibles para MX, US y caja única. Mantener ambos escenarios contado/financiado y el caso ya elegido; no volver a pedir históricos privados ni abrir otro sprint genérico de validadores. Después, ciclo/variables y piloto SaaS con wireframe. No hay decisión nueva del usuario para esta conciliación.

## Modelo, disponibilidad y consumo · registro 2026-10-01

| Superficie / fuente | Evidencia observada | No demostrado |
|---|---|---|
| Codex Desktop: conversación y catálogo de herramientas | Sesión Codex activa; catálogo anuncia OpenAI `gpt-6.1-sol` con low/medium/high/xhigh/max/ultra | ID/esfuerzo principal exactos y acceso efectivo a cada opción del catálogo |
| Codex CLI local, `codex --version` | 0.159.2, instalado | Inferencia con otro modelo, cuotas o precios |
| Claude Code local, `claude --version`, `auth status --json` | 2.1.286; login claude.ai first-party; subscriptionType max | Acceso efectivo a versión concreta de Sonnet/Fable/Haiku, cuota restante, excedentes desactivados |
| Claude Code `--help`, lectura local | CLI enumera esfuerzos y alias; no se ejecutó inferencia | Esfuerzos admitidos por cada modelo; alias no prueba versión ni acceso |
| AGENTS del usuario, política Fable fechada | Declaración de condiciones y fuente oficial proporcionadas | No revalidada en este corte porque no se selecciona ni ejecuta Fable |

Recomendación por actividad: OpenAI GPT-6.1 Sol, high para comparabilidad (incertidumbre de población con riesgo de subestimar CFU); medium para integrar aritmética/pruebas con contrato acotado. No cambio principal aplicado: la superficie actual no ofrece un selector para esta ejecución. Codex actual resuelve sin auxiliar; una llamada Claude repetiría contexto sin resolver datos ausentes. Ninguna llamada Claude/modelo nuevo, router o agente creado.

Consumo relativo: menor trabajo adicional esperado al reutilizar extracción/consolidado que al duplicar una revisión auxiliar; ahorro total no estimable, pues desconocemos tokens, caché, cuota y precios efectivos. Esfuerzo alto puede consumir más razonamiento que medio; se acota al juicio de comparabilidad. Presupuesto desde la definición de este corte: 20 minutos de implementación/QA, dos intentos máximos por fuente inaccesible, una corrida dirigida y una reparación si falla. Parar ante falta de evidencia, no probar múltiples modelos para sustituirla. Revisar recomendación ante contradicción nueva, falla de razonamiento o expansión; no escalar por 403/permisos.

## Verificación y rollback

**102/102 pruebas dirigidas PASS**: 37 consolidación (incluye pin nuevo y cuatro casos económicos), 35 exposición y 30 presupuesto. Typecheck estricto PASS. CLI releído: 15 pins, seis candidatos, H1 2026 11,307.27187593797; exit 2 esperado por incompletitud, no error de ejecución. Presupuesto 15 condiciones, exposición 41 incidencias, 10 importes completos nulos, todos los outputs económicos nulos, cero adopciones y efectos externos false. Pruebas focalizadas de integridad/unidades/no adopción conforme a `testing-strategy`; no build completo repetido. Son pruebas de una proyección local sobre evidencia pública, no login, persistencia, utilización o aceptación del SaaS.

Rollback selectivo: quitar sólo el pin `dryVanDenominator`, bloque `denominatorReview` y pruebas de este suplemento; revertir sólo los encabezados añadidos a documentos de estado. Dejar intactos expediente/pin `dryVanCapacity` y cambios ajenos. Sin DB, Auth, usuarios, migraciones, deploy, operaciones de negocio o consumo de IA de aplicación.
