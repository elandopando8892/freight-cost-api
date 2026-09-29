# Vida y residual: referencias primarias para escenarios de capital

Consulta 2026-09-29. Base Git `a5575ec70ef065e6060c589d8844ba55da9e09f7`, rama `codex/cost-tires-release-s14`, worktree limpio en D:. Investigación documental; recomendación Astra alto para metodología. No se cambió el modelo ni se delegó.

## Referencias verificadas

| Fuente primaria | Alcance declarado | Vida / residual | Clasificación |
| --- | --- | --- | --- |
| Covenant, informe anual 2025 | Remolques nuevos dry van | 10 años / aproximadamente 25% del costo | Política contable específica por equipo |
| Werner, 10-K 2025 | Trailers, categoría agregada | 12 años / USD 6,000 | Política contable de flota; sin aislamiento dry van en esa tabla |

[Covenant 2025](https://www.sec.gov/Archives/edgar/data/928658/000100888626000092/ars.pdf), página PDF 79 (impresa 72), Property and Equipment; también PDF 58, Revenue Equipment. Declara depreciación lineal y revisión de estimaciones por experiencia/mercado. No garantiza residual de venta ni acredita un precio futuro para XBF. Separa refrigerados, por lo que no deben mezclarse con dry van.

[Werner 2025](https://www.sec.gov/Archives/edgar/data/793074/000079307426000071/wern-20251231.htm), Nota 1, Property, Equipment, and Depreciation, tabla en página impresa 34. Distingue sus estimaciones financieras de las fiscales. El importe residual es absoluto, no porcentaje. La edad media de flota no es el plazo de depreciación ni la vida restante de una unidad usada.

El PDF Knight-Swift localizado devolvió error al abrirse; no se incorporaron cifras suyas. Los snippets de otros informes no se adoptaron como evidencia revisada.

## Derivaciones candidatas, no parámetros publicados

Para un activo NUEVO comparable con costo puesto en servicio P, en USD:

- Escenario contable Covenant: N=120 meses; R=0.25×P; depreciación mensual D=(P−R)/N=0.00625×P.
- Escenario contable Werner: N=144 meses; R=6000 USD; D=(P−6000)/144. Exigir P≥R y justificar aplicabilidad de la categoría agregada.

Estas son transformaciones algebraicas de las políticas publicadas, no estimaciones económicas finales. No combinar N de una fuente con R de otra ni promediar ambas políticas como si fueran una muestra de transacciones. No se calcula una cifra mensual con el precio nuevo conflictivo de Nationwide.

Para un activo USADO comprado hoy, P corresponde a adquisición/puesta en servicio actual y N a vida restante estimada desde esa adquisición. No reiniciar automáticamente 10 o 12 años, ni inferir vida restante restando el año modelo: estado, uso y estrategia de tenencia importan. Tampoco usar precio anunciado de otra unidad usada como residual futuro.

## Conexión con CFU

D es solamente depreciación. El fijo mensual requiere tratamiento coherente del costo financiero y otros costos atribuibles; no sumar amortización de principal más depreciación como dos gastos del mismo activo. LEASE_RENT sigue por ruta separada y no agrega D encima de renta.

La asignación por tiempo/distancia del adaptador requiere además utilización propia del remolque, no del tractor. Por tanto este hallazgo aporta escenarios sustentados para capital de activo nuevo, pero no completa monthlyFixedUsd ni CFU. La vida contable sirve de referencia contrastable; no se afirma que sea vida física, vida fiscal o benchmark calibrado MX/US.

## Estado, siguiente entrega y rollback

Dos referencias primarias verificadas; cero valores adoptados. No cambió UI, motor, Preview, Auth, infraestructura ni datos. No se ejecutaron pruebas de software porque este corte es documental; git diff --check sin errores. Revertir únicamente este commit para rollback.

Siguiente entrega: representar escenarios de capital nuevo/usado con horizonte y fuente explícitos, derivados sin defaults, y producir sensibilidad local separada de los valores adoptados. No se necesita pedir información privada a XBF para continuar investigando, ni esperar a tener certeza absoluta para mostrar escenarios correctamente etiquetados.
