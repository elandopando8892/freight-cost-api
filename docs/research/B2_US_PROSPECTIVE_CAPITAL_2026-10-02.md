# B2 · capital US prospectivo incorporado al presupuesto

2oct2026, revisión07:25:14UTC/01:25:14MX. Rama `codex/cost-tires-release-s14`, HEAD `4f5fc2de0c3d178dace917231e1092040dec21fd`; Git/worktrees/AGENTS verificados, trabajoD:\andre\worktrees\freight-cost-model\cost-tires-release-20260927, cambios anteriores preservados. Objetivo B2 completo permanece: costoD2D MéxicoDF–FortSmith por PuenteIII con relevo propioMXUS y misma caja53′, no inventario ni precio compra/venta.

## Qué cambió

El corte previo fue progreso: comparaba componentes contado/financiado, pero capital transaccional seguía pendiente. El usuario autorizó expresamente el cambio metodológico propuesto. [ADR010](../architecture/ADR-010-prospective-market-value-capital.md) define **pérdida económica de valor de un equipo de referencia ya en uso**, no compra real ni venta al final. No eliminar cargos desconocidos poniéndolos en cero; esos eventos no ocurren dentro de esta medición. El comparador anterior y originales se conservan como contraste.

Se reutilizan cálculo de residual incremental, cronograma de deuda y auditor de presupuesto; nuevo adaptador pequeño de metodología, sin otro engine/proveedor/infraestructura. Una filaUS de capital pasa a modelo documentado; su prima existente se conserva. Dos presupuestos separados para contado/financiado, no suma ni elección financiera real. El presupuesto heredado se etiqueta como base contado. Sin UI nueva; wireframes MARKSMAN siguen obligatoriosB3.

## Fuentes e hipótesis

[Ryder stock526505](https://www.ryder.com/en-us/used-trucks/inventory/oklahoma/oklahoma-city/tractor/tandem-axle-sleeper-tractor/2021/freightliner-mercedes/new-cascadia-px12664/526505): precio anunciado40495USD sin impuestos/cargos,2021 usado. Revalidado mediante lector web y hashHTMLoriginal; no precio negociado, propiedad, estado, supervivencia u odómetro certificado. Valor anunciado se usa como proxy actual de mercado.

[ANL21/4](https://publications.anl.gov/anlpubs/2021/05/167399.pdf): reutilizado método fijado y previamente revisado, anunciosUSsept2019 de sleeper; .9071edad anual y .999 por1000mi adicionales. No panel de ventas ni residual neto/supervivencia; no transferir aMX/caja.

[PAMT H12026](https://www.sec.gov/Archives/edgar/data/798287/000143774926025703/ex_998666.htm):84270mil millas/(1545company+454owner)/6×1.609344=11307.27187594km/mes. Se selecciona como **hipótesis de uso futuro**, no uso observado del VIN, US-only o días productivos. Esa misma distancia determina q y divisor del componente/km. OriginalHTTP de esa fuente no archivado; pin del expediente previo no prueba snapshot original ni población perfecta.

[USMFCU](https://www.usmfcu.org/auto-loans):9%APR desde/10%enganche/hasta72meses, revalidado. **9%nominal independiente es sensibilidad analítica, no APR convertido ni tasa bancaria aprobada**. Financiado supone deuda de referencia ya existente36445.50USD,72meses restantes/pagos nivelados sin gracia/balloon. No originar crédito, refinanciar o liquidar al mes36; saldo terminal no segunda depreciación. Cargos actuales/contrato completos no certificados. Etiqueta web24sept y original1oct ya divergen: no usar fecha dinámica para afirmar actualización de tasa. Contado no tiene deuda; rendimiento exigido al capital propio es política separada pendiente, no cero escondido.

La búsqueda previa a la autorización encontró [ATRI2026](https://truckingresearch.org/2026/07/analysis-of-the-operational-costs-of-trucking-2026-update/) gratis mediante formulario. Anuncio actual indexado, acceso directo403; informe completo2026 no descargado/verificado, sin enviar datos/contactar/subscribir. No mezclar su titular con coeficientes, costes, segmentos o nómina2024. Usuario autorizó capital durante esta revisión: se priorizó ese avance y no una nueva vuelta de permisos/costos indirectos. Texto parcialPDFATRI2025 fue exploratorio, no nueva evidencia aplicada al capital.

## Resultado monetario y límites

`D =40495×(1-.9071^(36/12)×.999^((11307.27187594/1.609344×36)/1000))/36`.

| Modo | Capital mensual exacto del modelo | Presupuesto mensual |
| --- | ---: | ---: |
| Contado |472.9918087706058USD|472.99USD|
| Financiado |691.4267942836491USD|691.43USD|

Interés medio218.43498551304322USD/mes, primeros36meses; mensualidad656.9497148662512USD es flujo de caja, no se suma. Saldo al mes36=20658.96974328453USD permanece referencia de deuda, no costo adicional ni prepago ejecutado. Ventana36 no vida útil; mes es promedio de ventana, no primer interés ni factura de octubre.49USD de anuncio en comparador previo no se carga: no anuncio/venta en esta medición. Correcciones/otroscostos/feesoriginales siguen null, no0.

Componente de capital/km hipotetizado0.04183076289USD contado/0.06114886083financiado; **no CFU completo del piloto** ni capacidad real. Redondeo único al final a centavos; no reconstruir promedios exactos desde valor redondeado.

Presupuesto: capitalUS+primaUS1055.42.2/10filas modeladas en cada alternativa,0calibradas; ocho importesnull,11condiciones; totalesfijos/CFU/CVU/costo/compra/ventanull. No interpretar2/10 como20%avance sprint. ModelFamilyResolved significa cierre de este alcance prospectivo, no costo all-in real, suficiencia de todos los supuestos ni cierreB2. MX/caja no cambian, administración no duplicada y capitalUS no absorbió seguro ni caja.

47pins. Ficha `cfcb00305f4ec09868ada9e40589ef57c8c4e58240e1634ead4c501700f2248a`; worksheetoriginal conserva `63629b174897277ce5501f833e9c24a40fdd24e4c2e323e8663366e2a1a24b80`; HTMLRyder `99708b73688f59d6d3d25fd1dbf9e0cb9ff2d703c32eee1e8946e05d529b7070`. No se afirma nueva descarga de esos originales ni nueva calibración.

## Pruebas y consumo

397pruebas PASS en10archivos: raíz198, exposición35, presupuesto30, contado/deuda25, tarjetas17, nuevo prospectivo10, seguro patronal33, comparadorUS16, prima15, caja18. TypecheckAPI y typecheckestricto de nuevohelper/script/pruebas, readback y diff-check. La guía `engineering:testing-strategy` concentró pruebas en integridad financiera: modos separados, sólo una fila cambiada, principal excluido, inexistencia de eventos vs costo0, copia/idempotencia, perfil/período/alcance y ocho importes desconocidos conservados. No flujo SaaS autenticado, factura, compra/deuda/venta ni cálculoD2D operativo comprobados.

Fallos: nombre/globdocumental no existente en búsqueda, sin edición; fuenteATRI2026direct403, búsqueda primaria identificó formulario pero no bypass/envío. Llamada aliasde dependencias no disponible; usada herramientaMCP soportada, sin instalación. Nuevas pruebas localizaron3expectativas heredadas de1fila en objetos completos; actualizadas a2 y rerunPASS. No fallo de fórmula ni desconocidos convertidos0. No imputar consumo0 a intentos fallidos.

Codex único responsable de investigación, implementación y verificación; GPT‑6.1Sol/high recomendado, modelo principal/esfuerzo efectivos no verificables por herramienta y selector sin cambios. Se evita duplicar contexto/calculador; ningúnClaude/agente llamado, beneficio esperado no cuantificado. Fable no necesario para aritmética verificable o superar falta de datos/registro de informe. ClaudeMaxx5 histórico declarado, ventanas5h/semanal/Fable/reposición/ruta incluida/extra desconocidas: no llamadas con facturación incierta.

Cuota automática Codex07:07:56UTC/01:07:56MX: ventana observable10080min100%usada, reinicio6oct13:08MX; ventana5h no disponible; crédito disponible y continuidad previamente autorizada, sin activar pagos. No registrar identificador de cuenta ni saldo. Tokens/cargos de este corte y reservas/ahorro porcentuales no observables. Límite25minhasta07:32:56UTC y un reintento por fallo diagnosticado; reservar tiempo de verificación, no repetir builds/papel completo ni escalar modelo por acceso403. No medición final de cuota ni afirmación de capacidad restante.

## Qué falta y rollback

Siguiente prioridad: capitalMX/caja con valoración pública propia compatible y conversión ya documentada, seguros/permisos/admin única y exposición; integrar variables y cicloMXUS/vacíos/cruce hasta costo piloto completo. No trasladar automáticamente qUS aMX/caja ni cambiar mercado a precio de compra pactado. B3SaaS/wireframes después de economía completa. B2 permanece activo; decisión metodológica pendiente anterior ya resuelta por usuario.

LocalD: sinDB/Auth/Neon/usuarios/migraciones/infraestructura/producción/deploy/Google/IAaplicación/operaciones de negocio/solicitud de crédito/anuncio. Sincommit/staging. RollbackporhunksADR010: retirar nuevoadaptador/pin/ficha/test yconexiones, restituir auditor de prima existente1fila/12condiciones yexpectativas sólo de estecorte. No restaurar archivoscompletos ni perder trabajosajenos; no editarworksheetoriginal.
