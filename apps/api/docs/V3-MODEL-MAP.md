# Freight Cost Model V3.0 — Complete Coverage Map

> Auto-generated from `Freight Cost Model V3.0.xlsx`. Single source of truth for what the backend covers.
> Status legend: ✅ implemented/seeded · ⚠️ present but not yet consumed by base path · ❌ not mapped

## 1. Workbook overview (18 sheets)

| # | Sheet | Dim | Role | Backend |
|---|---|---|---|---|
| 1 | cusCatalog | A1:AB9336 | zip→location→market catalog | ✅ seeded ZipMarket |
| 2 | Assumptions | A1:M54 | high-level params | ✅ implemented + seeded |
| 3 | Inputs | A1:J147 | editable cost cards (Qty/PU) | ✅ 134 seeded · ⚠️ 13 extra |
| 4 | Outputs | A1:M219 | derivations (cost + commercial) | ✅ cost + commercial |
| 5 | Factors | A1:F47 | factor tables | ✅ engine.factors |
| 6 | Equipments | A1:F6 | equipment factors | ✅ engine.factors |
| 7 | mexLaneProd | A1:CP25138 | MX per-lane calc | ✅ formula engine.mex |
| 8 | usaLaneProd | A1:BZ18484 | USA per-lane calc | ✅ formula engine.usa |
| 9 | mexLaneData | A1:H3225 | MX lane km/expenses | ✅ seeded mexLaneExpense |
| 10 | usaLaneData | A1:E27169 | USA lane miles | ✅ seeded usaLaneData |
| 11 | usaLaneMktPrice | A1:B19844 | market RPM | ✅ seeded usaLaneMktPrice |
| 12 | usaDATbenchmark | A1:AI13584 | DAT spot market | ✅ seeded UsaDatBenchmark |
| 13 | usaMktCondition | A1:G1000 | market condition by trailer | ✅ seeded usaMktCondition |
| 14 | usaFSCindex | A1:D1000 | FSC by diesel price | ✅ seeded FscIndex |
| 15 | usaFuelcurrent | A1:B12 | current diesel by region | ✅ seeded RegionDiesel |
| 16 | usaFuelpast | A1:K837 | EIA diesel history | ✅ DieselHistory (EIA API v2) |
| 17 | usaFSCtrend | A1:E837 | diesel/FSC trend | ✅ getDieselTrend() |
| 18 | usaFuel | A1:D993 | state diesel/FSC | ✅ seeded UsaFuel |

## 2. Assumptions (high-level) — ✅ all implemented & seeded

| Section | Field | Value | Unit | Low | High |
|---|---|---|---|---|---|
| General_Base | Gasto Adicional sobre Ruta | 0.05 | % route expenses | 0 | 0.1 |
| General_Base | Periodo de Operación | 26 | days/month | 24 | 28 |
| General_Base | Tamaño de Flota | 50 | tractors | 25 | 100 |
| General_Base | Índice de Operatividad | 0.9 | ratio | 0.85 | 0.93 |
| General_Base | Operadores | 52 | operators | 50 | 58 |
| General_Base | Kilómetros promedio x operador | 22000 | km/month/operator | 14000 | 22000 |
| Fuel | Diesel MX | 28 | MXN/L | 25 | 31 |
| Fuel | Diesel US Border | 1.49 | USD/L | 1.25 | 1.6 |
| Fuel | Fuel Purchase Mix MX | 0.3 | ratio | 0.1 | 0.6 |
| Fuel | Fuel Purchase Mix US | 0.7 | ratio | 0.4 | 0.9 |
| Fuel | Rendimiento Cargado | 2.8 | km/L | 2.2 | 3.1 |
| Fuel | Rendimiento Vacío | 3.2 | km/L | 2.7 | 3.7 |
| Fuel | Fuel Escalation Buffer | 0.05 | % fuel cost | 0 | 0.15 |
| Labor | Sueldo Base Operador MX | 500 | MXN/day | 350 | 650 |
| Labor | Tarifa Operador MX | 0.18 | USD/mile | 0.15 | 0.22 |
| Labor | Tarifa Operador US | 0.6 | USD/mile | 0.55 | 0.7 |
| Labor | Carga Social | 0.3 | % payroll | 0.25 | 0.35 |
| Labor | Viáticos MX | 350 | MXN/day | 250 | 500 |
| Labor | Team Driver Premium | 0.35 | % labor uplift | 0.25 | 0.5 |
| Labor | Hazmat Driver Premium | 0.35 | % labor uplift | 0.05 | 0.2 |
| Finance | Tipo de Cambio | 17.5 | MXN/USD | spot-3% | spot+3% |
| Finance | Cost of Capital MX | 0.14 | annual rate | 0.12 | 0.18 |
| Finance | Cost of Capital US | 0.1 | annual rate | 0.08 | 0.14 |
| Finance | Carrier Payment Days | 14 | days | 7 | 30 |
| Finance | Customer Collection Days | 30 | days | 21 | 60 |
| Finance | Inflation Buffer | 0.04 | annual rate | 0.02 | 0.08 |
| Utilization | Deadhead Base | 0.15 | % loaded miles | 0.08 | 0.3 |
| Utilization | Trailer Utilization | 0.85 | ratio | 0.75 | 0.95 |
| Utilization | Truck Utilization Days | 23 | productive days/month | 18 | 26 |
| Utilization | Load Time | 2 | hours | 1 | 6 |
| Utilization | Unload Time | 2 | hours | 1 | 6 |
| Utilization | Free Time | 2 | hours/event | 1 | 4 |
| Utilization | Detention Rate | 85 | USD/hour | 60 | 125 |
| Border | Border Friction Time | 0.75 | days/trip | 0.25 | 2 |
| Risk | MX Security Risk Reserve | 0.025 | % MX linehaul | 0 | 0.08 |
| Risk | Tight Market Premium | 0.1 | % uplift | 0 | 0.25 |
| Risk | Expedited Premium | 0.2 | % uplift | 0.1 | 0.4 |
| Risk | Flatbed Complexity Factor | 0.25 | % uplift | 0 | 0.15 |
| Risk | Hazmat Premium | 0.35 | % uplift | 0.1 | 0.35 |
| Risk | Weather Disruption Buffer | 0.02 | % uplift | 0 | 0.08 |
| Risk | Config Risk Premium Tandem | 0.1 | % uplift |  |  |
| Config | Tandem Toll Premium | 0.3 | % uplift |  |  |
| Config | Tandem Fuel Penalty | 0.12 | % uplift |  |  |
| Config | Tandem Maint/Tires Factor | 1.35 | % uplift |  |  |
| Config | Tandem CFU Factor | 1.2 | % uplift |  |  |
| Technical Margin | UT Rate One Way | 0.3 | % uplift |  |  |
| Technical Margin | UT Rate Backhaul | 0.1 | % uplift |  |  |
| Technical Margin | UT Rate Roundtrip | 0.2 | % uplift |  |  |

## 3. Inputs — editable cost cards

Engine derives Monthly Fixed Cost & Maint/Tires from these (engine.outputs.ts).

| Section | Field | Value | Unit | Low | High |
|---|---|---|---|---|---|
| 10000kms | Aceite de Motor | 60 | L | 45 | 65 |
| 10000kms | Filtros de Aceite | 1 | piece | 1 | 2 |
| 10000kms | Filtros de Diesel | 2 | pieces | 1 | 2 |
| 10000kms | Mano de Obra, lavado y engrasado | 1 | event | 1 | 1 |
| 10000kms | Aceite de Motor | 5 | USD/L | 4 | 6.5 |
| 10000kms | Filtros de Aceite | 65 | USD/piece | 50 | 80 |
| 10000kms | Filtros de Diesel | 40 | USD/piece | 30 | 50 |
| 10000kms | Mano de Obra, lavado y engrasado | 250 | USD/event | 180 | 350 |
| 100000kms | Aceite de Caja de Cambios | 19 | L | 18 | 22 |
| 100000kms | Aceite de Caja de Transmisión | 19 | L | 18 | 22 |
| 100000kms | Filtros | 1 | piece | 1 | 2 |
| 100000kms | Aceite Hidráulico para Dirección | 19 | L | 12 | 22 |
| 100000kms | Filtros de Aire y Compresora | 2 | pieces | 2 | 3 |
| 100000kms | Aceite de Caja de Cambios | 8 | USD/L | 5.5 | 11 |
| 100000kms | Aceite de Caja de Transmisión | 15 | USD/L | 10 | 18 |
| 100000kms | Filtros | 60 | USD/piece | 40 | 80 |
| 100000kms | Aceite Hidráulico para Dirección | 8 | USD/L | 5.5 | 11 |
| 100000kms | Filtros de Aire y Compresora | 95 | USD/piece | 70 | 130 |
| Maintenance Reserve | DEF / Urea | 0.025 | USD/km | 0.015 | 0.04 |
| Maintenance Reserve | Top-off Lubricants | 0.005 | USD/km | 0.002 | 0.01 |
| Maintenance Reserve | Coolant / Anticongelante | 120 | USD/100000 km | 80 | 180 |
| Maintenance Reserve | DPF / Aftertreatment Reserve | 0.015 | USD/km | 0.005 | 0.03 |
| Maintenance Reserve | PM Unscheduled Reserve | 0.03 | USD/km | 0.015 | 0.06 |
| 250000kms | Cambio de baterías | 4 | pieces | 3 | 4 |
| 250000kms | Calibración de inyectores | 1 | event | 1 | 1 |
| 250000kms | Clutch | 1 | event / kit | 1 | 1 |
| 250000kms | Frenos | 1 | event | 1 | 1 |
| 250000kms | Cambio de baterías | 175 | USD/piece | 115 | 450 |
| 250000kms | Calibración de inyectores | 1200 | USD/event | 300 | 3600 |
| 250000kms | Clutch | 2750 | USD/event | 1800 | 3500 |
| 250000kms | Frenos | 1800 | USD/event | 800 | 3000 |
| Tires | Life KM Dirección | 180000 | km | 140000 | 220000 |
| Tires | Life KM Tracción | 220000 | km | 160000 | 260000 |
| Tires | Life KM Remolque | 250000 | km | 180000 | 300000 |
| Tires | Life KM Recapeadas | 160000 | km | 100000 | 200000 |
| Tires | Llantas de Dirección | 2 | pieces | 2 | 2 |
| Tires | Llantas Recapeadas | 8 | pieces | 0 | 8 |
| Tires | Llantas Tracción | 8 | pieces | 8 | 8 |
| Tires | Llantas Remolque | 8 | pieces | 8 | 8 |
| Tires | Llantas de Dirección | 600 | USD/piece | 450 | 750 |
| Tires | Llantas Recapeadas | 225 | USD/piece | 175 | 300 |
| Tires | Llantas Tracción | 550 | USD/piece | 400 | 700 |
| Tires | Llantas Remolque | 450 | USD/piece | 350 | 600 |
| Insurance | Periodo de Poliza de Seguros | 12 | months | 12 | 12 |
| Insurance | Prima Anual por Vehículo | 1 | policy / vehicle | 1 | 1 |
| Insurance | Poliza x Vehículo | 12000 | USD/year/tractor | 8000 | 20000 |
| Insurance | Cargo Insurance Annual Allocation | 2000 | USD/year/tractor | 0 | 6000 |
| Insurance | Cargo Insurance Per Shipment Rate | 0.005 | % cargo value | 0.0025 | 0.01 |
| Insurance | Excess / Umbrella Liability Allocation | 3000 | USD/year/tractor | 0 | 8000 |
| Insurance | Trailer Physical Damage Insurance | 1000 | USD/year/trailer | 500 | 2000 |
| Insurance | Deductible / Loss Reserve | 0.02 | USD/km | 0 | 0.06 |
| Insurance | Insurance Inflation Factor | 0.08 | annual rate | 0.04 | 0.15 |
| Insurance | Siniestralidad Factor | 1 | factor | 0.85 | 1.5 |
| Insurance | Hazmat Insurance Factor | 1.25 | factor | 1.1 | 1.75 |
| Insurance | High Value Cargo Factor | 1.15 | factor | 1 | 1.5 |
| Administrative Payroll | Despachador | 2 | FTE | 1 | 4 |
| Administrative Payroll | Despachador | 2200 | USD/month/FTE | 1500 | 3000 |
| Administrative Payroll | Jefe de Trafico | 2 | FTE | 1 | 3 |
| Administrative Payroll | Jefe de Trafico | 2750 | USD/month/FTE | 2000 | 3500 |
| Administrative Payroll | Gerente de Operaciones | 1 | FTE | 1 | 1 |
| Administrative Payroll | Gerente de Operaciones | 5500 | USD/month/FTE | 4000 | 7000 |
| Administrative Payroll | Gerente de Comercial | 0.5 | FTE | 0 | 1 |
| Administrative Payroll | Gerente de Comercial | 4500 | USD/month/FTE | 3000 | 6000 |
| Administrative Payroll | Safety / Compliance Manager | 0.5 | FTE | 0 | 1 |
| Administrative Payroll | Safety / Compliance Manager | 4500 | USD/month/FTE | 3000 | 6000 |
| Administrative Payroll | Tracking / Customer Service Coordinator | 2 | FTE | 1 | 4 |
| Administrative Payroll | Tracking / Customer Service Coordinator | 1800 | USD/month/FTE | 1200 | 2500 |
| Administrative Payroll | Accounting / Billing Admin | 1 | FTE | 0.5 | 2 |
| Administrative Payroll | Accounting / Billing Admin | 2200 | USD/month/FTE | 1500 | 3000 |
| Company Expenses | Agua | 1 | account | 1 | 1 |
| Company Expenses | Luz | 1 | account | 1 | 1 |
| Company Expenses | Telefonia Fija | 1 | account | 0 | 1 |
| Company Expenses | Telefonía Celular | 60 | lines | 50 | 70 |
| Company Expenses | Internet | 2 | connections | 1 | 3 |
| Company Expenses | Renta Patio con Oficina | 1 | facility | 1 | 1 |
| Company Expenses | Licencias de Software | 1 | bundle | 1 | 1 |
| Company Expenses | Capacitaciones | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Gastos de Representación | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Utiles de Oficina | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Imprenta | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Seguros de Otros Vehículos | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Mantenimiento de Otros Vehículos | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Combustibles de Otros Vehículos | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Depreciación de Otros Vehículos | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Depreciación de Equipos de Oficina | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Gestorías | 1 | monthly reserve | 1 | 1 |
| Company Expenses | Agua | 250 | USD/month | 100 | 400 |
| Company Expenses | Luz | 900 | USD/month | 500 | 1500 |
| Company Expenses | Telefonia Fija | 50 | USD/month | 0 | 100 |
| Company Expenses | Telefonía Celular | 30 | USD/line/month | 20 | 45 |
| Company Expenses | Internet | 250 | USD/connection/month | 100 | 400 |
| Company Expenses | Renta Patio con Oficina MX | 3000 | USD/month | 1500 | 6000 |
| Company Expenses | Licencias de Software - Admon | 1250 | USD/month | 500 | 2500 |
| Company Expenses | Capacitaciones | 2000 | USD/month | 500 | 3000 |
| Company Expenses | Gastos de Representación | 500 | USD/month | 150 | 1000 |
| Company Expenses | Utiles de Oficina | 150 | USD/month | 50 | 300 |
| Company Expenses | Imprenta | 200 | USD/month | 50 | 400 |
| Company Expenses | Seguros de Otros Vehículos | 400 | USD/month | 150 | 700 |
| Company Expenses | Mantenimiento de Otros Vehículos | 250 | USD/month | 50 | 500 |
| Company Expenses | Combustibles de Otros Vehículos | 500 | USD/month | 150 | 900 |
| Company Expenses | Depreciación de Otros Vehículos | 300 | USD/month | 0 | 700 |
| Company Expenses | Depreciación de Equipos de Oficina | 250 | USD/month | 0 | 500 |
| Company Expenses | Gestorías | 300 | USD/month | 100 | 600 |
| Company Expenses | Office Cleaning / Janitorial | 300 | USD/month | 100 | 600 |
| Company Expenses | Security / CCTV / Alarm | 800 | USD/month | 300 | 2000 |
| Company Expenses | Banking / Payment Fees | 250 | USD/month | 50 | 750 |
| Company Expenses | Legal / Corporate Admin Reserve | 500 | USD/month | 100 | 1500 |
| Company Expenses | Subscriptions / Data Services | 750 | USD/month | 250 | 2500 |
| Company Expenses | Office Equipment Replacement Reserve | 250 | USD/month | 100 | 600 |
| Finance Expenses | Asset Financing Enabled | 1 | enabled flag | 0 | 1 |
| Finance Expenses | Working Capital Financing Enabled | 1 | enabled flag | 0 | 1 |
| Vehicle Depreciation | Periodo de Depreciacion | 60 | months | 48 | 72 |
| Vehicle Depreciation | Valor de Tracto | 1 | unit | 1 | 1 |
| Vehicle Depreciation | Valor de Remolque | 1 | unit | 1 | 1 |
| Vehicle Depreciation | Valor de Dolly | 0 | unit | 0 | 1 |
| Vehicle Depreciation | Valor de Tracto | 220000 | USD/unit | 180000 | 250000 |
| Vehicle Depreciation | Valor de Remolque | 55000 | USD/unit | 40000 | 90000 |
| Vehicle Depreciation | Valor de Dolly | 25000 | USD/unit | 15000 | 35000 |
| Rescue Value | Valor de Reposición de Tracto | 1 | unit | 1 | 1 |
| Rescue Value | Valor de Reposición de Remolque | 1 | unit | 1 | 1 |
| Rescue Value | Valor de Reposición de Tracto | 60000 | USD/unit | 35000 | 80000 |
| Rescue Value | Valor de Reposición de Remolque | 20000 | USD/unit | 10000 | 35000 |
| Profit Determination | Tasa de Rendimiento Esperado | 0.3 | % | 0.15 | 0.35 |
| Crossborder Compliance | Registro y doble matrícula | 3500 | USD/year/tractor | 1500 | 5000 |
| Crossborder Compliance | Seguros adicionales - liabilities | 3000 | USD/year/tractor | 0 | 8000 |
| Crossborder Compliance | Certificacion CTPAT | 5000 | USD/year/company | 1500 | 10000 |
| Crossborder Compliance | Inspecciones FMCSA | 1500 | USD/year/company | 500 | 5000 |
| Crossborder Compliance | Ajustes Regulatorios | 5000 | USD/year/company | 2000 | 15000 |
| Crossborder Compliance | SCAC / Carrier Codes Allocation | 1000 | USD/year/company | 500 | 2500 |
| Crossborder Compliance | BOC-3 / Process Agent Allocation | 500 | USD/year/company | 100 | 1000 |
| Crossborder Compliance | Safety Audit / PASA Reserve | 2500 | USD/year/company | 0 | 7500 |
| Crossborder Infrastructure | Renta de Oficinas y Patios Logísticos | 2500 | USD/month | 1000 | 6000 |
| Crossborder Infrastructure | Costos de Comunicacion | 700 | USD/month | 300 | 1500 |
| Crossborder Infrastructure | Sistema de monitoreo GPS | 1500 | USD/month | 750 | 2500 |
| Crossborder Infrastructure | Capacitacion de Operadores | 1000 | USD/month | 300 | 2000 |
| Crossborder Infrastructure | Mantenimientos | 750 | USD/month | 250 | 1500 |
| Crossborder Infrastructure | Sistema de Gestión de Transporte | 2500 | USD/month | 1000 | 5000 |
| Crossborder Infrastructure | Border Yard Minimum Guarantee | 1000 | USD/month | 0 | 5000 |
| Crossborder Transactional | Border Crossing Fee | 175 | USD/shipment | 150 | 450 |
| Crossborder Transactional | Border Admin Buffer | 0 | USD/shipment | 50 | 300 |
| Crossborder Transactional | Yard / Transfer Buffer | 150 | USD/shipment | 50 | 250 |
| Crossborder Transactional | Gestión Aduanera/Broker | 0 | USD/shipment | 75 | 175 |
| Crossborder Transactional | ACE / eManifest / PAPS | 25 | USD/shipment | 15 | 75 |
| Crossborder Transactional | PAPS / PARS Processing | 0 | USD/shipment | 10 | 50 |
| Crossborder Transactional | In-Bond Processing | 0 | USD/shipment | 0 | 150 |
| Crossborder Risk | Inspection / Delay Reserve | 0.02 | % linehaul | 0 | 0.05 |

## 4. Factors — ✅ implemented (engine.factors.ts)

| Group | Name | Value |
|---|---|---|
| LANE FACTOR | Mostly Straight | 1 |
| LANE FACTOR | Mixed Lane | 1.1 |
| LANE FACTOR | Mostly Curvy | 1.2 |
| LANE FACTOR | Straight & Danger | 1.05 |
| LANE FACTOR | Mixed & Danger | 1.2 |
| LANE FACTOR | Curvy & Danger | 1.3 |
| EQUIPMENT FUEL EFFICIENCY | 1.5 tons | 3.5 |
| EQUIPMENT FUEL EFFICIENCY | 3.5 tons | 2.85 |
| EQUIPMENT FUEL EFFICIENCY | Rabon | 1.75 |
| EQUIPMENT FUEL EFFICIENCY | Thorton | 1.33 |
| EQUIPMENT FUEL EFFICIENCY | Truck Trailer | 1 |
| OPERATION FACTOR | MX Northbound | 1 |
| OPERATION FACTOR | MX Southbound | 0.7 |
| OPERATION FACTOR | Intra-Mex | 1 |
| OPERATION FACTOR | Local | 1 |
| OPERATION FACTOR | D2D Export | 1.15 |
| OPERATION FACTOR | D2D Import | 0.85 |
| OPERATION FACTOR | Drayage | 1.15 |
| SERVICE FACTOR | One Way | 1 |
| SERVICE FACTOR | Backhaul | 0.6 |
| SERVICE FACTOR | Roundtrip | 1.6 |
| SERVICE FACTOR | Expedited | 1.4 |
| MODE FACTOR | Single | 1 |
| MODE FACTOR | Tandem | 1.3 |
| TRAILER FACTOR | Dry Van | 1 |
| TRAILER FACTOR | Flatbed | 1.3 |
| TRAILER FACTOR | Overdim | 1.8 |
| TRAILER FACTOR | Hazmat | 1.2 |
| TRAILER FACTOR | Reefer | 1.5 |
| TRAILER FACTOR | Chassis | 1.15 |
| TRAILER FACTOR | Power Only | 0.8 |
| DRIVER FACTOR | Intrastate | 0.9 |
| DRIVER FACTOR | Interstate | 1 |
| DRIVER FACTOR | B1 | 1.15 |
| DRIVER FACTOR | CDL | 1 |
| DRIVER FACTOR | Licencia E | 1.35 |
| DESTINATION REPOSITION | Very Tight | 0.03 |
| DESTINATION REPOSITION | Moderately Tight | 0.05 |
| DESTINATION REPOSITION | Balanced | 0.1 |
| DESTINATION REPOSITION | Slightly Loose | 0.15 |
| DESTINATION REPOSITION | Very Loose | 0.25 |
| ORIGIN REPOSITION | Very Tight | 0.03 |
| ORIGIN REPOSITION | Moderately Tight | 0.05 |
| ORIGIN REPOSITION | Balanced | 0.1 |
| ORIGIN REPOSITION | Slightly Loose | 0.15 |
| ORIGIN REPOSITION | Very Loose | 0.25 |

## 5. Equipments — ✅ implemented

| Equipment | Fuel | Fixed | Maint/Tires | Driver/Access |
|---|---|---|---|---|
| Truck Trailer | 1 | 1 | 1 | 1 |
| Thorton | 1.33 | 0.72 | 0.8 | 0.85 |
| Rabon | 1.75 | 0.58 | 0.65 | 0.75 |
| 3.5 tons | 2.85 | 0.38 | 0.45 | 0.55 |
| 1.5 tons | 3.5 | 0.25 | 0.3 | 0.45 |

## 6. Outputs — derivations (218)

Cost build-up + commercial (COGS…Commercial) ✅ implemented · Validations ⚠️ partial.

| Section | Field | Formula | Status |
|---|---|---|---|
| Operating | Driver Coverage Ratio | Operadores / Tamaño de Flota | ✅ |
| Operating | Productive Fleet Size | Tamaño de Flota * Índice de Operatividad | ✅ |
| Operating | Monthly Fleet KM | Operadores * Kilómetros promedio x operador | ✅ |
| Operating | Monthly Fleet Miles | Monthly Fleet KM / 1.60934 | ✅ |
| Operating | Productive Truck Days | Tamaño de Flota * Índice de Operatividad * Periodo de Operación | ✅ |
| Operating | KM per Productive Truck Day | Monthly Fleet KM / Productive Truck Days | ✅ |
| Operating | Miles per Productive Truck Day | Monthly Fleet Miles / Productive Truck Days | ✅ |
| Operating | Trailer Productive Capacity | Tamaño de Flota * Trailer Utilization | ✅ |
| Operating | Truck Utilization Ratio | Truck Utilization Days / Periodo de Operación | ✅ |
| Fuel | Total Fuel Purchase Mix | Fuel Purchase Mix MX + Fuel Purchase Mix US | ✅ |
| Fuel | Diesel MX USD/L | Diesel MX / Tipo de Cambio | ✅ |
| Fuel | Blended Diesel Cost USD/L | (Diesel MX USD/L * Fuel Purchase Mix MX) + (Diesel US Border * Fuel Purchase Mix US) | ✅ |
| Fuel | Loaded Fuel Cost per KM | Blended Diesel Cost USD/L / Rendimiento Cargado | ✅ |
| Fuel | Empty Fuel Cost per KM | Blended Diesel Cost USD/L / Rendimiento Vacío | ✅ |
| Fuel | Loaded Fuel Cost per Mile | Loaded Fuel Cost per KM * 1.60934 | ✅ |
| Fuel | Empty Fuel Cost per Mile | Empty Fuel Cost per KM * 1.60934 | ✅ |
| Fuel | Fuel Escalation Cost per KM | Loaded Fuel Cost per KM * Fuel Escalation Buffer | ✅ |
| Fuel | Fuel Cost per Loaded Trip | Loaded Miles * Loaded Fuel Cost per Mile | ✅ |
| Fuel | Fuel Cost per Empty Miles | Empty Miles * Empty Fuel Cost per Mile | ✅ |
| Fuel | Total Trip Fuel Cost | Fuel Cost per Loaded Trip + Fuel Cost per Empty Miles + Fuel Escalation Cost | ✅ |
| Labor | MX Base Driver Cost per Month | Sueldo Base Operador MX * 30 / Tipo de Cambio | ✅ |
| Labor | MX Base Driver Cost with Burden | MX Base Driver Cost per Month * (1 + Carga Social) | ✅ |
| Labor | MX Base Driver Cost per KM | MX Base Driver Cost with Burden / Kilómetros promedio x operador | ✅ |
| Labor | MX Base Driver Cost per Mile | MX Base Driver Cost per KM * 1.60934 | ✅ |
| Labor | MX Variable Driver Cost per Mile | Tarifa Operador MX | ✅ |
| Labor | US Variable Driver Cost per Mile | Tarifa Operador US | ✅ |
| Labor | MX Per Diem USD per Day | Viáticos MX / Tipo de Cambio | ✅ |
| Labor | MX Per Diem Cost per Trip | MX Per Diem USD per Day * MX Trip Days | ✅ |
| Labor | Team Driver Labor Uplift | Base Driver Labor Cost * Team Driver Premium | ✅ |
| Labor | Hazmat Driver Labor Uplift | Base Driver Labor Cost * Hazmat Driver Premium | ✅ |
| Labor | Total Labor Cost per Trip | Base Driver Labor Cost + Team Driver Labor Uplift + Hazmat Driver Labor Uplift + Viáticos | ✅ |
| Utilization | Base Empty Miles | Loaded Miles * Deadhead Base | ✅ |
| Utilization | Total Operational Miles | Loaded Miles + Empty Miles | ✅ |
| Utilization | Total Operational KM | Total Operational Miles * 1.60934 | ✅ |
| Utilization | Load/Unload Time | Load Time + Unload Time | ✅ |
| Utilization | Excess Detention Hours | MAX(Actual Wait Hours - Free Time, 0) | ✅ |
| Utilization | Detention Cost | Excess Detention Hours * Detention Rate | ✅ |
| Utilization | Border Friction Hours | Border Friction Time * 24 | ✅ |
| Utilization | Total Cycle Time Days | Transit Days + Load/Unload Time/24 + Border Friction Time + Detention Hours/24 | ✅ |
| Utilization | Cost per Productive Truck Day | Total Monthly Fixed Cost / Productive Truck Days | ✅ |
| Utilization | Time-Based Cost per Trip | Total Cycle Time Days * Cost per Productive Truck Day | ✅ |
| Maintenance | PM 10000 Cost | SUM(Qty_i * PU_i) for 10000kms | ✅ |
| Maintenance | PM 10000 Cost per KM | PM 10000 Cost / 10000 | ✅ |
| Maintenance | PM 10000 Cost per Mile | PM 10000 Cost per KM * 1.60934 | ✅ |
| Maintenance | PM 100000 Cost | SUM(Qty_i * PU_i) for 100000kms | ✅ |
| Maintenance | PM 100000 Cost per KM | PM 100000 Cost / 100000 | ✅ |
| Maintenance | PM 100000 Cost per Mile | PM 100000 Cost per KM * 1.60934 | ✅ |
| Maintenance | PM 250000 Cost | SUM(Qty_i * PU_i) for 250000kms | ✅ |
| Maintenance | PM 250000 Cost per KM | PM 250000 Cost / 250000 | ✅ |
| Maintenance | PM 250000 Cost per Mile | PM 250000 Cost per KM * 1.60934 | ✅ |
| Maintenance Reserve | DEF Cost per KM | DEF / Urea | ✅ |
| Maintenance Reserve | Top-off Lubricants per KM | Top-off Lubricants | ✅ |
| Maintenance Reserve | Coolant Cost per KM | Coolant / Anticongelante / 100000 | ✅ |
| Maintenance Reserve | DPF Aftertreatment per KM | DPF / Aftertreatment Reserve | ✅ |
| Maintenance Reserve | PM Unscheduled per KM | PM Unscheduled Reserve | ✅ |
| Maintenance Reserve | Total Maintenance Reserve per KM | SUM(Reserve per KM) | ✅ |
| Maintenance Reserve | Total Maintenance Reserve per Mile | Total Maintenance Reserve per KM * 1.60934 | ✅ |
| Tires | Steer Tires Cost | Qty Llantas Dirección * PU Llantas Dirección | ✅ |
| Tires | Drive Tires Cost | Qty Llantas Tracción * PU Llantas Tracción | ✅ |
| Tires | Trailer Tires Cost | Qty Llantas Remolque * PU Llantas Remolque | ✅ |
| Tires | Retread Tires Cost | Qty Llantas Recapeadas * PU Llantas Recapeadas | ✅ |
| Tires | Steer Tires Cost per KM | Steer Tires Cost / Life KM Dirección | ✅ |
| Tires | Drive Tires Cost per KM | Drive Tires Cost / Life KM Tracción | ✅ |
| Tires | Trailer Tires Cost per KM | Trailer Tires Cost / Life KM Remolque | ✅ |
| Tires | Retread Tires Cost per KM | Retread Tires Cost / Life KM Recapeadas | ✅ |
| Tires | Total Tires Cost per KM | SUM(Tire cost per KM) | ✅ |
| Tires | Total Tires Cost per Mile | Total Tires Cost per KM * 1.60934 | ✅ |
| Maintenance Total | Scheduled Maintenance Cost per KM | PM10000/km + PM100000/km + PM250000/km | ✅ |
| Maintenance Total | Scheduled Maintenance Cost per Mile | Scheduled Maintenance Cost per KM * 1.60934 | ✅ |
| Maintenance Total | Total Maintenance Cost per KM | Scheduled Maintenance Cost per KM + Total Maintenance Reserve per KM | ✅ |
| Maintenance Total | Total Maintenance Cost per Mile | Total Maintenance Cost per KM * 1.60934 | ✅ |
| Maintenance Total | Total Maintenance + Tires per KM | Total Maintenance Cost per KM + Total Tires Cost per KM | ✅ |
| Maintenance Total | Total Maintenance + Tires per Mile | Total Maintenance + Tires per KM * 1.60934 | ✅ |
| Maintenance Total | Trip Maintenance Cost | Total Operational KM * Total Maintenance Cost per KM | ✅ |
| Maintenance Total | Trip Tires Cost | Total Operational KM * Total Tires Cost per KM | ✅ |
| Insurance | Annual Vehicle Insurance Cost | Prima Anual por Vehículo * Poliza x Vehículo | ✅ |
| Insurance | Annual Fleet Insurance Cost | Annual Vehicle Insurance Cost * Tamaño de Flota | ✅ |
| Insurance | Monthly Fleet Insurance Cost | Annual Fleet Insurance Cost / Periodo de Poliza | ✅ |
| Insurance | Insurance Cost per Productive Truck Day | Monthly Fleet Insurance Cost / Productive Truck Days | ✅ |
| Insurance | Insurance Cost per KM | Monthly Fleet Insurance Cost / Monthly Fleet KM | ✅ |
| Insurance | Insurance Cost per Mile | Insurance Cost per KM * 1.60934 | ✅ |
| Insurance | Cargo Insurance Annual Cost | Cargo Insurance Annual Allocation * Tamaño de Flota | ✅ |
| Insurance | Excess Liability Annual Cost | Excess / Umbrella Liability Allocation * Tamaño de Flota | ✅ |
| Insurance | Trailer Physical Damage Annual Cost | Trailer Physical Damage Insurance * Trailer Count | ✅ |
| Insurance | Insurance Risk Adjusted Cost | Base Insurance Cost * Siniestralidad Factor * Hazmat Insurance Factor * High Value Cargo Factor | ✅ |
| Insurance | Deductible Loss Reserve Cost | Total Operational KM * Deductible / Loss Reserve | ✅ |
| Administrative Payroll | Monthly Dispatch Payroll | Despachador Qty * Despachador PU | ✅ |
| Administrative Payroll | Monthly Traffic Payroll | Jefe de Trafico Qty * Jefe de Trafico PU | ✅ |
| Administrative Payroll | Monthly Operations Payroll | Gerente Operaciones Qty * Gerente Operaciones PU | ✅ |
| Administrative Payroll | Monthly Commercial Payroll | Gerente Comercial Qty * Gerente Comercial PU | ✅ |
| Administrative Payroll | Monthly Safety Compliance Payroll | Safety Manager Qty * Safety Manager PU | ✅ |
| Administrative Payroll | Monthly Tracking CS Payroll | Tracking CS Qty * Tracking CS PU | ✅ |
| Administrative Payroll | Monthly Billing Admin Payroll | Billing Admin Qty * Billing Admin PU | ✅ |
| Administrative Payroll | Monthly Admin Payroll | SUM(All payroll lines) | ✅ |
| Administrative Payroll | Monthly Admin Payroll with Burden | Monthly Admin Payroll * (1 + Carga Social) | ✅ |
| Administrative Payroll | Admin Payroll per Productive Truck Day | Monthly Admin Payroll with Burden / Productive Truck Days | ✅ |
| Administrative Payroll | Admin Payroll per KM | Monthly Admin Payroll with Burden / Monthly Fleet KM | ✅ |
| Administrative Payroll | Admin Payroll per Mile | Admin Payroll per KM * 1.60934 | ✅ |
| Company Expenses | Monthly Company Expenses | SUM(Qty_i * PU_i) for Company Expenses | ✅ |
| Company Expenses | Annual Company Expenses | Monthly Company Expenses * 12 | ✅ |
| Company Expenses | Company Expenses per Productive Truck Day | Monthly Company Expenses / Productive Truck Days | ✅ |
| Company Expenses | Company Expenses per KM | Monthly Company Expenses / Monthly Fleet KM | ✅ |
| Company Expenses | Company Expenses per Mile | Company Expenses per KM * 1.60934 | ✅ |
| Capital | Asset Value | (Qty Tracto*PU Tracto)+(Qty Remolque*PU Remolque)+(Qty Dolly*PU Dolly) | ✅ |
| Capital | Residual Value | (Qty Rescue Tracto*PU Rescue Tracto)+(Qty Rescue Remolque*PU Rescue Remolque) | ✅ |
| Capital | Depreciable Base | Asset Value - Residual Value | ✅ |
| Capital | Monthly Depreciation per Unit | Depreciable Base / Periodo de Depreciacion | ✅ |
| Capital | Annual Depreciation per Unit | Monthly Depreciation per Unit * 12 | ✅ |
| Capital | Fleet Monthly Depreciation | Monthly Depreciation per Unit * Tamaño de Flota | ✅ |
| Capital | Depreciation Cost per KM | Fleet Monthly Depreciation / Monthly Fleet KM | ✅ |
| Capital | Depreciation Cost per Mile | Depreciation Cost per KM * 1.60934 | ✅ |
| Capital | Financed Principal | Asset Value * LTV Asset Financing | ✅ |
| Capital | Monthly Asset Finance Cost | Financed Principal * Asset Finance Annual Rate / 12 | ✅ |
| Capital | Fleet Monthly Asset Finance Cost | Monthly Asset Finance Cost * Tamaño de Flota | ✅ |
| Capital | Asset Finance Cost per KM | Fleet Monthly Asset Finance Cost / Monthly Fleet KM | ✅ |
| Capital | Asset Finance Cost per Mile | Asset Finance Cost per KM * 1.60934 | ✅ |
| Capital | Monthly Equipment Capital Cost | Fleet Monthly Depreciation + Fleet Monthly Asset Finance Cost | ✅ |
| Capital | Equipment Capital Cost per KM | Monthly Equipment Capital Cost / Monthly Fleet KM | ✅ |
| Capital | Equipment Capital Cost per Mile | Equipment Capital Cost per KM * 1.60934 | ✅ |
| Working Capital | Working Capital Gap Days | MAX(Customer Collection Days - Carrier Payment Days, 0) | ✅ |
| Working Capital | Working Capital Base | Monthly COGS * Working Capital Gap Days / 30 | ✅ |
| Working Capital | Monthly Working Capital Cost | Working Capital Base * Working Capital Annual Rate / 12 | ✅ |
| Working Capital | Working Capital Cost per KM | Monthly Working Capital Cost / Monthly Fleet KM | ✅ |
| Working Capital | Working Capital Cost per Mile | Working Capital Cost per KM * 1.60934 | ✅ |
| Crossborder Compliance | Annual Tractor-Level Compliance Cost | (Registro y doble matrícula + Seguros adicionales liabilities) * Tamaño de Flota | ✅ |
| Crossborder Compliance | Annual Company-Level Compliance Cost | CTPAT + FMCSA + Ajustes Regulatorios + SCAC + BOC-3 + Safety Audit | ✅ |
| Crossborder Compliance | Annual Crossborder Compliance Cost | Tractor-Level Compliance + Company-Level Compliance | ✅ |
| Crossborder Compliance | Monthly Crossborder Compliance Cost | Annual Crossborder Compliance Cost / 12 | ✅ |
| Crossborder Compliance | Crossborder Compliance Cost per KM | Monthly Crossborder Compliance Cost / Monthly Fleet KM | ✅ |
| Crossborder Compliance | Crossborder Compliance Cost per Mile | Crossborder Compliance Cost per KM * 1.60934 | ✅ |
| Crossborder Infrastructure | Monthly Crossborder Infrastructure Cost | SUM(Crossborder Infrastructure monthly PU items) | ✅ |
| Crossborder Infrastructure | Annual Crossborder Infrastructure Cost | Monthly Crossborder Infrastructure Cost * 12 | ✅ |
| Crossborder Infrastructure | Crossborder Infrastructure Cost per KM | Monthly Crossborder Infrastructure Cost / Monthly Fleet KM | ✅ |
| Crossborder Infrastructure | Crossborder Infrastructure Cost per Mile | Crossborder Infrastructure Cost per KM * 1.60934 | ✅ |
| Crossborder Infrastructure | Monthly Fixed Crossborder Cost | Monthly Crossborder Compliance Cost + Monthly Crossborder Infrastructure Cost | ✅ |
| Crossborder Infrastructure | Fixed Crossborder Cost per KM | Monthly Fixed Crossborder Cost / Monthly Fleet KM | ✅ |
| Crossborder Infrastructure | Fixed Crossborder Cost per Mile | Fixed Crossborder Cost per KM * 1.60934 | ✅ |
| Crossborder Transactional | Base Crossborder Transactional Cost | Border Crossing Fee + Border Admin Buffer + Gestión Aduanera/Broker + ACE/eManifest/PAPS | ✅ |
| Crossborder Transactional | Optional Yard Transfer Cost | Yard / Transfer Buffer if active | ✅ |
| Crossborder Transactional | Optional PAPS PARS Cost | PAPS / PARS Processing if not included in ACE/eManifest/PAPS | ✅ |
| Crossborder Transactional | Optional In-Bond Cost | In-Bond Processing if active | ✅ |
| Crossborder Transactional | Total Crossborder Transactional Cost | Base + Optional Yard + Optional PAPS/PARS + Optional In-Bond | ✅ |
| Crossborder Transactional | Inspection Delay Reserve Cost | Linehaul Cost * Inspection / Delay Reserve | ✅ |
| Crossborder Transactional | Total Crossborder Variable Cost | Total Crossborder Transactional Cost + Inspection Delay Reserve Cost | ✅ |
| Risk | MX Security Risk Cost | MX Linehaul Cost * MX Security Risk Reserve | ✅ |
| Risk | Tight Market Premium Cost | Base Cost * Tight Market Premium | ✅ |
| Risk | Expedited Premium Cost | Base Cost * Expedited Premium | ✅ |
| Risk | Flatbed Complexity Cost | Base Cost * Flatbed Complexity Factor | ✅ |
| Risk | Hazmat Premium Cost | Base Cost * Hazmat Premium | ✅ |
| Risk | Weather Disruption Cost | Base Cost * Weather Disruption Buffer | ✅ |
| Risk | Total Risk Adjustment | SUM(Active risk costs) | ✅ |
| Variable Cost | MX Variable Cost per Mile | MX Fuel per Mile + MX Driver per Mile + Maintenance per Mile + Tires per Mile | ✅ |
| Variable Cost | US Variable Cost per Mile | US Fuel per Mile + US Driver per Mile + Maintenance per Mile + Tires per Mile | ✅ |
| Variable Cost | Empty Variable Cost per Mile | Empty Fuel per Mile + Maintenance per Mile + Tires per Mile | ✅ |
| Variable Cost | MX Variable Cost per Trip | MX Loaded Miles * MX Variable Cost per Mile | ✅ |
| Variable Cost | US Variable Cost per Trip | US Loaded Miles * US Variable Cost per Mile | ✅ |
| Variable Cost | Empty Variable Cost per Trip | Empty Miles * Empty Variable Cost per Mile | ✅ |
| Variable Cost | Total Variable Cost per Trip | MX Variable Cost + US Variable Cost + Empty Variable Cost + Route Expenses | ✅ |
| Fixed Cost | Monthly Fixed Cost | Insurance + Admin Payroll + Company Expenses + Capital Cost + Crossborder Fixed Cost + Working Capital Cost | ✅ |
| Fixed Cost | Fixed Cost per Productive Truck Day | Monthly Fixed Cost / Productive Truck Days | ✅ |
| Fixed Cost | Fixed Cost per KM | Monthly Fixed Cost / Monthly Fleet KM | ✅ |
| Fixed Cost | Fixed Cost per Mile | Fixed Cost per KM * 1.60934 | ✅ |
| Fixed Cost | Trip Fixed Cost by Distance | Total Operational KM * Fixed Cost per KM | ✅ |
| Fixed Cost | Trip Fixed Cost by Time | Total Cycle Time Days * Fixed Cost per Productive Truck Day | ✅ |
| Fixed Cost | Trip Fixed Cost | MAX(Trip Fixed Cost by Distance, Trip Fixed Cost by Time) | ✅ |
| COGS | MX Linehaul COGS | MX Variable Cost + MX Fixed Cost Allocation + MX Route Expenses | ✅ |
| COGS | US Linehaul COGS | US Variable Cost + US Fixed Cost Allocation + US Route Expenses | ✅ |
| COGS | CA Linehaul COGS | CA Variable Cost + CA Fixed Cost Allocation + CA Route Expenses | ✅ |
| COGS | Border COGS | Total Crossborder Variable Cost + Border Delay Cost + Border Fixed Allocation | ✅ |
| COGS | Deadhead COGS | Empty Variable Cost + Empty Fixed Cost Allocation | ✅ |
| COGS | Total Direct COGS | MX Linehaul COGS + US Linehaul COGS + CA Linehaul COGS + Border COGS + Deadhead COGS | ✅ |
| COGS | Total Risk Adjusted COGS | Total Direct COGS + Total Risk Adjustment | ✅ |
| COGS | COGS per Loaded Mile | Total Risk Adjusted COGS / Loaded Miles | ✅ |
| COGS | COGS per Total Mile | Total Risk Adjusted COGS / Total Operational Miles | ✅ |
| Market | Market RPM | Market Rate / Loaded Miles | ✅ |
| Market | Market All-In Rate | Market Linehaul + Market Fuel + Market Accessorials | ✅ |
| Market | Market vs COGS Spread | Market All-In Rate - Total Risk Adjusted COGS | ✅ |
| Market | Market vs COGS Spread % | Market vs COGS Spread / Total Risk Adjusted COGS | ✅ |
| Market | Market Condition Score | Loose/Balanced/Tight/Very Tight | ✅ |
| Market | Market Adjustment Factor | Factor from market condition | ✅ |
| Market | Risk-Adjusted Market Reference | Market All-In Rate * Market Adjustment Factor | ✅ |
| Buy Rate | Cost-Based Buy Floor | Total Risk Adjusted COGS | ✅ |
| Buy Rate | Estimated Carrier Buy Rate | MAX(Cost-Based Buy Floor, Risk-Adjusted Market Reference * Buy Market Weight) | ✅ |
| Buy Rate | Carrier Buy Low | Estimated Carrier Buy Rate * 0.95 | ✅ |
| Buy Rate | Carrier Buy Target | Estimated Carrier Buy Rate | ✅ |
| Buy Rate | Carrier Buy High | Estimated Carrier Buy Rate * 1.08 | ✅ |
| Buy Rate | Buy RPM | Estimated Carrier Buy Rate / Loaded Miles | ✅ |
| Sell Rate | Minimum Sell Rate | Estimated Carrier Buy Rate / (1 - Minimum Gross Margin) | ✅ |
| Sell Rate | Target Sell Rate | Estimated Carrier Buy Rate / (1 - Target Gross Margin) | ✅ |
| Sell Rate | Premium Sell Rate | Estimated Carrier Buy Rate / (1 - Premium Gross Margin) | ✅ |
| Sell Rate | Aggressive Sell Rate | MAX(Minimum Sell Rate, Risk-Adjusted Market Reference * Aggressive Market Factor) | ✅ |
| Sell Rate | Recommended Sell Rate | Decision rule: market/cost/risk selected rate | ✅ |
| Sell Rate | Sell RPM | Recommended Sell Rate / Loaded Miles | ✅ |
| Margin | Gross Profit | Recommended Sell Rate - Estimated Carrier Buy Rate | ✅ |
| Margin | Gross Margin | Gross Profit / Recommended Sell Rate | ✅ |
| Margin | Markup | Gross Profit / Estimated Carrier Buy Rate | ✅ |
| Margin | Contribution Profit | Recommended Sell Rate - Total Risk Adjusted COGS | ✅ |
| Margin | Contribution Margin | Contribution Profit / Recommended Sell Rate | ✅ |
| Margin | GP per Loaded Mile | Gross Profit / Loaded Miles | ✅ |
| Margin | GP per Day | Gross Profit / Total Cycle Time Days | ✅ |
| Commercial | Risk Level | Rule based on active risk premiums | ✅ |
| Commercial | Confidence Level | Rule based on data completeness and market freshness | ✅ |
| Commercial | No-Go Flag | TRUE if Sell < Minimum Sell or Margin < Minimum Margin | ✅ |
| Commercial | Review Flag | TRUE if risk/accessorials/fuel/border exceed threshold | ✅ |
| Commercial | Market Classification | Loose/Balanced/Tight/Very Tight | ✅ |
| Commercial | Recommended Strategy | Aggressive / Target / Premium | ✅ |
| Commercial | Negotiation Floor | Minimum Sell Rate | ✅ |
| Commercial | Opening Ask | Premium Sell Rate | ✅ |
| Commercial | Target Close | Target Sell Rate | ✅ |
| Validation | Fuel Mix Check | IF(Fuel Purchase Mix MX + Fuel Purchase Mix US = 1, OK, ERROR) | ❌ |
| Validation | Low High Check | IF(Low <= Recommended Value <= High, OK, ERROR) | ❌ |
| Validation | Border Double Count Check | IF(Border Transactional Cost > threshold, REVIEW, OK) | ❌ |
| Validation | Insurance Double Count Check | IF(Base Insurance + Crossborder Liabilities overlap, REVIEW, OK) | ❌ |
| Validation | TMS Double Count Check | IF(Company Software + Crossborder TMS both active, REVIEW, OK) | ❌ |
| Validation | Hazmat Consistency Check | IF(Hazmat = TRUE and Hazmat Premium active, OK, REVIEW) | ❌ |
| Validation | Negative Margin Check | IF(Gross Profit < 0, ERROR, OK) | ❌ |
| Validation | Minimum Margin Check | IF(Gross Margin < Minimum Gross Margin, REVIEW, OK) | ❌ |
| Validation | COGS vs Market Check | IF(ABS(Market - COGS)/COGS > threshold, REVIEW, OK) | ❌ |

## 7. Per-lane production

## Production columns — mexLaneProd (MX leg, engine.mex.ts) (✅ implemented)

`Run ID` · `Production Version` · `Lane ID` · `Lane Key` · `Origin` · `Destination` · `Equipment` · `Trailer` · `Config` · `Operation` · `Service` · `Driver` · `Route` · `Is D2D` · `Is Drayage` · `Is Roundtrip` · `Is Backhaul` · `Leg Count` · `Empty KM %` · `Route Expense Multiplier` · `UT Margin` · `Border Transactional USD` · `Yard Optional USD` · `Base KM` · `Return KM` · `Loaded KM` · `Empty KM` · `Total KM` · `Loaded Miles` · `Empty Miles` · `Total Miles` · `Base Route Expenses MXN` · `Return Route Expenses MXN` · `Route Expenses MXN` · `Base Hours` · `Return Hours` · `Cycle Days` · `Fuel Factor` · `Adj Loaded km/L` · `Adj Empty km/L` · `Blended Diesel USD/L` · `Fuel USD` · `Route Expenses USD` · `Route Expense Buffer USD` · `Maint+Tires USD` · `Driver USD` · `Border Transactional USD` · `Total CVU USD` · `Monthly Fleet KM` · `Productive Truck Days` · `Monthly Fixed Cost USD` · `Fixed Cost per KM` · `Fixed Cost per Day` · `Equipment Fixed Factor` · `Config CFU Factor` · `CFU by Distance USD` · `CFU by Time USD` · `Total CFU USD` · `CVU USD` · `CFU USD` · `Carrier Production Cost USD` · `UT Margin` · `Carrier Technical Utility USD` · `Carrier Technical Tariff USD` · `Tariff per Loaded Mile USD` · `Tariff per Total Mile USD` · `Route Factor` · `Route Risk USD` · `Trailer Factor` · `Trailer Risk USD` · `Flatbed Complexity USD` · `Security Risk USD` · `Tandem Risk USD` · `Operation Factor` · `Operation Risk USD` · `Total Risk Adj USD` · `Loaded KM` · `Total KM` · `CVU USD` · `CFU USD` · `Carrier Production Cost USD` · `Technical Tariff USD` · `Risk Adj USD` · `Carrier Required Tariff USD` · `Carrier Operating Profit USD` · `Carrier Operating Margin` · `Carrier Required Tariff MXN` · `MX Outbound Leg` · `MX Inbound Leg` · `ReferenceKey` · `Miles` · `USD` · `RPM` · `FSC`

## Production columns — usaLaneProd (USA leg, engine.usa.ts) (✅ implemented)

`Route ID` · `Production Version` · `Lane ID` · `Business Key` · `Route Key` · `Origin` · `Destination` · `Equipment` · `Trailer` · `Config` · `Service` · `Operation` · `Driver` · `Origin Market` · `Destination Market` · `Loaded Miles` · `Transit Days Raw` · `Driver Expenses` · `Out State` · `Diesel $/gal` · `FSC $/mi` · `Driver Factor` · `Equipment Fuel Factor` · `Equipment Fixed Factor` · `Equipment Maint/Tires Factor` · `Loaded MPG` · `Empty MPG` · `Deadhead Fallback %` · `Total Empty Miles` · `Total Operational Miles` · `Fuel Gallons` · `Fuel Cost` · `Driver Cost` · `Maint+Tires Cost` · `CVU ex Fuel` · `CVU incl Fuel` · `Cycle Days Raw` · `CFU by Distance` · `CFU by Time` · `CFU Used` · `UT Rate` · `Technical Tariff ex Fuel` · `Technical Tariff incl Fuel` · `Market RPM` · `Market Linehaul Ref` · `Fuel Recovery Ref` · `Market All-In Ref` · `Linehaul Gap ex Fuel` · `All-In Gap` · `Market Condition` · `Market Adjustment Used` · `US Border Cost` · `Origin Outbound Condition` · `Destination Outbound Condition` · `Origin Reposition %` · `Destination Reposition %` · `Origin Empty Miles` · `Destination Reposition Miles` · `Empty Miles Logic` · `Trailer Factor` · `Trailer Risk Adj` · `Operation Factor` · `Operation Risk Adj` · `Service Factor` · `Service Risk Adj` · `Total Risk Adj` · `Carrier Required Tariff ex Fuel` · `Carrier Required Tariff USD` · `Required Tariff RPM incl Fuel` · `Carrier Operating Profit USD` · `Carrier Operating Margin` · `Validation v2` · `Production Notes` · `ReferenceKey` · `Miles` · `USD` · `RPM` · `FSC`

## 8. Reference data tables

| Sheet | Rows | Seeded as | Status |
|---|---|---|---|
| mexLaneData | 3225 | MexLaneExpense | ✅ |
| usaLaneData | 27169 | UsaLaneData | ✅ |
| usaLaneMktPrice | 19844 | UsaLaneMktPrice | ✅ |
| usaMktCondition | 1000 | UsaMktCondition | ✅ |
| usaFuel | 993 | UsaFuel | ✅ |
| cusCatalog | 9336 | ZipMarket | ✅ |
| usaDATbenchmark | 13584 | UsaDatBenchmark | ✅ |
| usaFSCindex | 1000 | FscIndex | ✅ |
| usaFuelcurrent | 12 | RegionDiesel | ✅ |
| usaFuelpast | 837 | DieselHistory | ✅ |
| usaFSCtrend | 837 | getDieselTrend() | ✅ |

## 9. Coverage summary

**✅ Done — full carrier model:** Assumptions, Inputs/cost cards (editable), Factors, Equipments, Outputs cost build-up + commercial layer (cost floor → sell tiers → margin → flags), per-lane production (MX+USA), DAT market reference. Validated $1,200 / $2,600.

**✅ Sheet-fidelity audit (2026-05): engine reproduces V3.0 exactly.**
`tests/sheet-fidelity.test.ts` runs the engine on 90 mexLaneProd + 90 usaLaneProd rows
and checks every component (miles/fuel/maint/driver/CVU/CFU/production/technical/risk/
required/RPM/FSC) — **180/180 exact**. Factors (39), Equipments (20), Assumptions (48),
Monthly Fixed Cost ($381,384.04) and Maint+Tires/km (0.2348385) all verified against
the workbook. EIA current + historical auto-fetch wired (historical needs EIA_API_KEY).

**❌ Pending (separate layers, NOT in the per-lane production path):**
1. Advanced-insurance detail layer (V3.0 Outputs: Cargo Insurance Annual Cost = allocation
   × fleet, Excess Liability, Trailer Physical Damage, deductible, siniestralidad × inflation,
   per-shipment cargo + hazmat/high-value loads). Real sheet values exist but feed a separate
   Outputs aggregation, not Monthly Fixed Cost — to be modeled faithfully when needed.
2. Profit determination (Tasa de Rendimiento Esperado) + extended Validation section.
3. Commercial flags currently: fuel-mix, No-Go (sell < floor), below-min-margin, 15%+ above market.