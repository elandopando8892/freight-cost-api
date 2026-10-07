# B2 — candidatos públicos para caja financiada

2026-10-02 16:26:43–16:30UTC, continuación de investigación local con Codex previamente elegido; no implementación asignada sin confirmación de modelo/esfuerzo. Límite10min, sin reintentos de acceso, llamadas de negocio, solicitudes de crédito o formularios. El propósito es completar la evidencia monetaria del modo financiado del mismo caso B2, no crear otro sprint o cambiar el perfil de caja.

Workspace/rama/HEAD revalidados: D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; codex/cost-tires-release-s14;4f5fc2de0c3d178dace917231e1092040dec21fd. Política vigente del usuario aplicada; no escritura de código ni cambios Auth/DB/Neon/usuarios/infra/producción.

## Comparación dirigida

| Fuente primaria | Capacidad o importe observado | Compatibilidad / decisión |
| --- | --- | --- |
| [TIP, crédito simple](https://www.tipmexico.com/leasing/otros-financiamientos/) | Adquisición de vehículos con enganche, tasa fija y plazo; no valor numérico de tasa/plazo aplicable en esta página | Producto no equivale a parámetro: no calcular interés como0 ni copiar tasa de otro tractor |
| [Fultra Rent, unidades](https://fultrarent.mx/unidades/) | Remolques nuevos/seminuevos, cajas secas; referencia comercial a tasas/seguro sin precio numérico | Compatible en tipo de servicio, insuficiente para cuantificar deuda o seguro; no solicitar cotización |
| [Financiera Reyes, ficha de crédito simple](https://www.financierareyes.com.mx/wp-content/uploads/2024/10/FICHA-TECNICA-CREDITO-SIMPLE-21-oct-24.pdf) | Hasta1millónMXN, hasta60meses,16%anual+IVA, CAT19.81%+IVA; apertura sin comisión; intereses mensuales, capital por calendario o al vencimiento | Crédito general de necesidades específicas, no oferta identificada de caja usada. Sólo candidato, no adopción ni nominalidad/calendario inventados |
| [NAFIN, micro/pequeña empresa transportista](https://www.gob.mx/nafin/acciones-y-programas/micro-y-pequena-empresa-transportista) | Extracto oficial indexado histórico2019 muestra límite17.5%para seminuevos; lectura directa403 | No demuestra vigencia2026 ni aplicación a la caja: rechazado como tasa actual |
| [Solvimás, prendario fijo](https://solvimas.com/content/gnp-solvimas/es/mx/inicio/soluciones-financieras/credito-simple-con-garantia-prendaria-tasa-fija.html) / [IFIT](https://ifit.condusef.gob.mx/ifit/ft_general_final.php?b=1&idnc=4212&t=19) | Lecturas directas502; extracto IFIT corresponde a crédito auto variable | No mezclar tasa fija/variable ni una ficha de auto con la caja. Sin cantidad económica adoptada |

## Lectura PDF y límite de evidencia

La skill `pdf` exigió inspección completa y visual antes de tratar la ficha como fuente monetaria suficiente. El lector extrajo una página con características, requisitos y documentación: buen historial/evaluación, antigüedad y avalúo cuando corresponda. La instrumentación tiene un renglón incompleto en la extracción. El encabezado no acredita fecha efectiva;2024-10 aparece en ruta/nombre, no como vigencia contractual2026.

El screenshot del lector falló por Cache miss. Descarga HTTP ordinaria con20segundos de timeout falló por Host desconocido y no creó FINANCIERA_REYES_CREDIT_SIMPLE_20261002.pdf. No hay original, hash o inspección visual que puedan declararse. No se editó/reexportó PDF ni se instaló software. La distinción interés16%/CAT19.81% proviene de texto público extraído, no de una cuota calculada ni de términos nominales verificados. No usar CAT como interés mensual ni convertir una tasa anual en nominalidad contractual sin una hipótesis de medición revisada.

## Qué resuelve y qué sigue abierto

El candidato muestra un importe/tasa/plazo públicos separados en MXN, no una tasa inventada ni importada de crédito US o de tractores. Pero **no cierra caja financiada**: alcance del activo, referencia de deuda existente frente a nueva originación, base de tasa/devengo, calendario/balloon, tratamiento fiscal y pertinencia temporal necesitan revisión explícita. La metodología prospectiva ya autorizada evita inventar una compra/apertura real; no vuelve cero cargos desconocidos de una originación que no se modela.

Antes de integrar una hipótesis de financiación, conservar la misma caja física y sus dos alternativas fiscales; mostrar fuente, razón de transferencia y sensibilidad por separado. Reutilizar el cronograma y contrato económico existentes, sin sumar principal/pago total a pérdida de valor e interés. Si el candidato no es suficiente, no rellenar el importe ni afirmar que todos los parámetros están calibrados.

La búsqueda fue dirigida y no exhaustiva: ausencia de tasa en estas páginas no demuestra ausencia de una fuente pública compatible. No se aceptó ningún precio de préstamo personal, remolque ligero US o crédito automotriz de otra clase. No fue necesario pedir documentos privados XBF ni identificar un transportista.

Cuota conocida sólo por lectura anterior2026-10-02 16:14:51UTC, no nueva captura: Codexsemanal100%usada/5hno disponible; créditos existentes sin activación. ClaudeMaxx5/5h/semanal/Fable/usoextraOFFdesconocidos, no invocado. Modelo/esfuerzo efectivo principal no observable; nueva implementación propuesta6.1Sol/alto pendiente de confirmación humana. Consumo/costo real/cache y equivalencia de cuota de esta investigación desconocidos; intentos fallidos no contados como consumo0.

## Verificación y rollback

Lecturas web primarias y relectura de política de caja en disco: no pruebas de implementación nuevas ni estimación completa. Único archivo añadido: esta ficha; no se cambió política JSON, consolidado ni fórmulas. Rollback: retirar solamente esta ficha si no recibió ediciones posteriores. B2 queda activo e incompleto, y B3persistencia/UI no empieza sobre estos candidatos parciales.

Cierre de lectura: 2026-10-02 16:34:33 UTC. Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`, trabajando en el worktree físico de D:. Se verificó que la política de caja conserva SHA-256 `c5a709e3bb96b399de1e7286ca1834959e317596e2c93117a622771c24fdc1bf` y el consolidado `18553c7768d97843cc67914be3fe055f7f0dd8911093a90cadd0d348c301cf7c`. La descarga PDF sigue ausente; la ficha nueva fue releída. Sin reintentos de acceso, sin pruebas repetidas y sin cambios a archivos ajenos.
