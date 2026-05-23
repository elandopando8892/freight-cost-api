export const EQUIPMENT_CATALOG = [
  // Truck Trailer — Dry Van
  { truckType: 'Truck Trailer', trailerType: 'Dry Van',   config: 'Single', operationType: 'D2D Export',    serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 1.0,  fixedCostFactor: 1.0,  maintTiresFactor: 1.0,  driverFactor: 1.0 },
  { truckType: 'Truck Trailer', trailerType: 'Dry Van',   config: 'Single', operationType: 'D2D Import',    serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 1.0,  fixedCostFactor: 1.0,  maintTiresFactor: 1.0,  driverFactor: 1.0 },
  { truckType: 'Truck Trailer', trailerType: 'Dry Van',   config: 'Single', operationType: 'Intra-Mex',     serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 1.0,  fixedCostFactor: 1.0,  maintTiresFactor: 1.0,  driverFactor: 1.0 },
  { truckType: 'Truck Trailer', trailerType: 'Dry Van',   config: 'Single', operationType: 'Intra-Mex',     serviceType: 'Roundtrip', driverType: 'Interstate', fuelEfficiencyFactor: 1.0,  fixedCostFactor: 1.0,  maintTiresFactor: 1.0,  driverFactor: 1.0 },
  { truckType: 'Truck Trailer', trailerType: 'Dry Van',   config: 'Single', operationType: 'MX Northbound', serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 1.0,  fixedCostFactor: 1.0,  maintTiresFactor: 1.0,  driverFactor: 1.0 },
  { truckType: 'Truck Trailer', trailerType: 'Dry Van',   config: 'Tandem', operationType: 'D2D Export',    serviceType: 'One Way',   driverType: 'CDL',        fuelEfficiencyFactor: 0.9,  fixedCostFactor: 1.2,  maintTiresFactor: 1.35, driverFactor: 1.1 },
  // Truck Trailer — Reefer
  { truckType: 'Truck Trailer', trailerType: 'Reefer',    config: 'Single', operationType: 'D2D Export',    serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 0.9,  fixedCostFactor: 1.15, maintTiresFactor: 1.1,  driverFactor: 1.0 },
  { truckType: 'Truck Trailer', trailerType: 'Reefer',    config: 'Single', operationType: 'D2D Import',    serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 0.9,  fixedCostFactor: 1.15, maintTiresFactor: 1.1,  driverFactor: 1.0 },
  { truckType: 'Truck Trailer', trailerType: 'Reefer',    config: 'Single', operationType: 'Intra-Mex',     serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 0.9,  fixedCostFactor: 1.15, maintTiresFactor: 1.1,  driverFactor: 1.0 },
  // Truck Trailer — Flatbed
  { truckType: 'Truck Trailer', trailerType: 'Flatbed',   config: 'Single', operationType: 'D2D Export',    serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 0.95, fixedCostFactor: 1.1,  maintTiresFactor: 1.05, driverFactor: 1.15 },
  { truckType: 'Truck Trailer', trailerType: 'Flatbed',   config: 'Single', operationType: 'Intra-Mex',     serviceType: 'One Way',   driverType: 'Interstate', fuelEfficiencyFactor: 0.95, fixedCostFactor: 1.1,  maintTiresFactor: 1.05, driverFactor: 1.15 },
  // Truck Trailer — Hazmat
  { truckType: 'Truck Trailer', trailerType: 'Hazmat',    config: 'Single', operationType: 'D2D Export',    serviceType: 'One Way',   driverType: 'Licencia E', fuelEfficiencyFactor: 1.0,  fixedCostFactor: 1.2,  maintTiresFactor: 1.1,  driverFactor: 1.35 },
  { truckType: 'Truck Trailer', trailerType: 'Hazmat',    config: 'Single', operationType: 'Intra-Mex',     serviceType: 'One Way',   driverType: 'Licencia E', fuelEfficiencyFactor: 1.0,  fixedCostFactor: 1.2,  maintTiresFactor: 1.1,  driverFactor: 1.35 },
  // Truck Trailer — Chassis / Drayage
  { truckType: 'Truck Trailer', trailerType: 'Chassis',   config: 'Single', operationType: 'Drayage',       serviceType: 'One Way',   driverType: 'B1',         fuelEfficiencyFactor: 0.85, fixedCostFactor: 0.9,  maintTiresFactor: 0.95, driverFactor: 0.9 },
  // Thorton
  { truckType: 'Thorton',       trailerType: 'Dry Van',   config: 'Single', operationType: 'Intra-Mex',     serviceType: 'One Way',   driverType: 'Intrastate', fuelEfficiencyFactor: 0.85, fixedCostFactor: 0.7,  maintTiresFactor: 0.9,  driverFactor: 0.85 },
  // Rabon
  { truckType: 'Rabon',         trailerType: 'Dry Van',   config: 'Single', operationType: 'Intra-Mex',     serviceType: 'One Way',   driverType: 'Intrastate', fuelEfficiencyFactor: 0.8,  fixedCostFactor: 0.6,  maintTiresFactor: 0.85, driverFactor: 0.8 },
  // 3.5 tons
  { truckType: '3.5 tons',      trailerType: 'Dry Van',   config: 'Single', operationType: 'Intra-Mex',     serviceType: 'One Way',   driverType: 'Intrastate', fuelEfficiencyFactor: 0.7,  fixedCostFactor: 0.4,  maintTiresFactor: 0.75, driverFactor: 0.7 },
  // 1.5 tons
  { truckType: '1.5 tons',      trailerType: 'Dry Van',   config: 'Single', operationType: 'Intra-Mex',     serviceType: 'One Way',   driverType: 'Intrastate', fuelEfficiencyFactor: 0.65, fixedCostFactor: 0.3,  maintTiresFactor: 0.7,  driverFactor: 0.65 },
]
