# COST_TIRES · Sprint 21 · magnitud pública EE. UU.

## Wireframe UI/UX

```text
Benchmark público de llantas
├─ Observaciones de catálogo MX: precio histórico; 0 adoptados
├─ IMT MX: costo modelado por 1,000 veh-km; alcance interurbano
├─ Mapa de comparabilidad: 4 tramos MX condicionados, 5 sin contraste IMT
├─ TTI EE. UU.: 0.048 USD/vehículo-milla · 2024
│  ├─ Insignia: estimación agregada, no costo XBF ni drayage
│  └─ Fuente: Exhibit C-3; no convertir/aplicar a CVU
└─ Brechas por segmento: fuente y evidencia todavía necesaria
```

En móvil las tarjetas se apilan; la cifra, año y unidad quedan juntos; el enlace abre el PDF primario. La advertencia se ve sin desplegar detalles.

## Evidencia y frontera metodológica

- TTI, *2025 Urban Mobility Report*, Appendix C, Exhibit C-3, página PDF 7: llantas 0.048 USD por milla de camión comercial para 2024. La página PDF 8 explica la proyección basada en ATRI hasta 2023 y la mediana de crecimiento de costos no combustible/no mano de obra. Fuente: https://static.tti.tamu.edu/tti.tamu.edu/documents/mobility-report-2025-appx-c.pdf
- ATRI, comunicado de julio 2026: +6.4% para llantas en 2025, sin importe absoluto abierto. Fuente: https://truckingresearch.org/2026/07/new-atri-report-details-accelerating-costs-and-low-profitability-despite-cuts/
- El informe completo ATRI 2026 pide datos de contacto para descarga. No se envió el formulario ni se atribuyó una cifra de terceros al informe.
- El dato TTI es un benchmark externo de magnitud para examinar FTL Intra-EE. UU., no una calibración por segmento. No combina el porcentaje ATRI, no aplica FX, no se escribe en bases y no alimenta CVU/CFU/cotizaciones.

## Validación y rollback

Las pruebas del componente comprueban cifra, unidad, año, fuente y gobierno; el build comprueba la página. Reversión: retirar el bloque TTI, el archivo de referencia y su mención en fuentes excluidas en un commit de rollback del frontend; no hay migración ni cambio de datos.
