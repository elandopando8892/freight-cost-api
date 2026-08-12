-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Section" AS ENUM ('GENERAL_BASE', 'FUEL', 'LABOR', 'FINANCE', 'UTILIZATION', 'BORDER', 'RISK', 'CONFIG', 'TECHNICAL_MARGIN', 'FACTORS', 'COST_MAINT', 'COST_TIRES', 'COST_INSURANCE', 'COST_PAYROLL', 'COST_COMPANY', 'COST_CAPITAL', 'COST_CROSSBORDER');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketDataType" AS ENUM ('DIESEL_MX', 'DIESEL_US', 'FX_RATE', 'FSC');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'MX',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "kindeId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssumptionSet" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssumptionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssumptionParam" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "field" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "low" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "updateFrequency" TEXT,
    "costBehavior" TEXT,
    "activation" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssumptionParam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentConfig" (
    "id" TEXT NOT NULL,
    "truckType" TEXT NOT NULL,
    "trailerType" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "driverType" TEXT NOT NULL,
    "dispatchService" TEXT,
    "fuelEfficiencyFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "fixedCostFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maintTiresFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "driverFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "EquipmentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityMX" (
    "id" TEXT NOT NULL,
    "production" TEXT NOT NULL,
    "homologation" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,

    CONSTRAINT "CityMX_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZipMarket" (
    "id" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "metroZip" TEXT NOT NULL,
    "metroCity" TEXT NOT NULL,
    "market" TEXT NOT NULL,

    CONSTRAINT "ZipMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MexLaneExpense" (
    "id" TEXT NOT NULL,
    "laneKey" TEXT NOT NULL,
    "laneKeyNorm" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "tolls" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "driverExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pension" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sumaViaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasViaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasRuta" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "MexLaneExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierMexLane" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "laneKeyNorm" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "tolls" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasRuta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierMexLane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierUsaLane" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "laneKeyNorm" TEXT NOT NULL,
    "outState" TEXT NOT NULL,
    "miles" DOUBLE PRECISION NOT NULL,
    "truckDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "routeExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierUsaLane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsaLaneData" (
    "id" TEXT NOT NULL,
    "laneKey" TEXT NOT NULL,
    "outState" TEXT NOT NULL,
    "miles" DOUBLE PRECISION NOT NULL,
    "truckDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "routeExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "UsaLaneData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsaLaneMktPrice" (
    "id" TEXT NOT NULL,
    "laneKey" TEXT NOT NULL,
    "laneKeyNorm" TEXT NOT NULL,
    "rpm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UsaLaneMktPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsaDatBenchmark" (
    "id" TEXT NOT NULL,
    "laneKey" TEXT NOT NULL,
    "laneKeyNorm" TEXT NOT NULL,
    "miles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowRpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "highRpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fsc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allInUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "companies" INTEGER NOT NULL DEFAULT 0,
    "reports" INTEGER NOT NULL DEFAULT 0,
    "stdDev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "equipment" TEXT,
    "origin" TEXT,
    "dest" TEXT,

    CONSTRAINT "UsaDatBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsaMktCondition" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "dryVanCond" TEXT NOT NULL,
    "flatbedCond" TEXT NOT NULL,
    "reeferCond" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "UsaMktCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsaFuel" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "region" TEXT,
    "pricePerGallon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fsc" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "UsaFuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionDiesel" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "dieselUsdGal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionDiesel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FscIndex" (
    "id" TEXT NOT NULL,
    "fromDiesel" DOUBLE PRECISION NOT NULL,
    "toDiesel" DOUBLE PRECISION NOT NULL,
    "ltlPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "truckloadFscPerMile" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "FscIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DieselHistory" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "duoarea" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "units" TEXT NOT NULL DEFAULT '$/GAL',

    CONSTRAINT "DieselHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketData" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "MarketDataType" NOT NULL,
    "region" TEXT,
    "state" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lane" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "laneKey" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "equipmentId" TEXT,
    "operationType" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT 'Single',
    "isD2D" BOOLEAN NOT NULL DEFAULT false,
    "isDrayage" BOOLEAN NOT NULL DEFAULT false,
    "isRoundtrip" BOOLEAN NOT NULL DEFAULT false,
    "isBackhaul" BOOLEAN NOT NULL DEFAULT false,
    "baseKm" DOUBLE PRECISION,
    "returnKm" DOUBLE PRECISION,
    "loadedMiles" DOUBLE PRECISION,
    "transitDays" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "laneId" TEXT,
    "assumptionSetId" TEXT,
    "label" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operation" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "freightBaselineUsd" DOUBLE PRECISION NOT NULL,
    "requiredTariffUsd" DOUBLE PRECISION NOT NULL,
    "requiredTariffMxn" DOUBLE PRECISION NOT NULL,
    "fxRateUsed" DOUBLE PRECISION NOT NULL,
    "mexLeg" JSONB,
    "usaLeg" JSONB,
    "commercial" JSONB,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_kindeId_key" ON "User"("kindeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AssumptionSet_orgId_name_version_key" ON "AssumptionSet"("orgId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AssumptionParam_setId_section_field_key" ON "AssumptionParam"("setId", "section", "field");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentConfig_truckType_trailerType_config_operationType__key" ON "EquipmentConfig"("truckType", "trailerType", "config", "operationType", "serviceType", "driverType");

-- CreateIndex
CREATE UNIQUE INDEX "CityMX_production_key" ON "CityMX"("production");

-- CreateIndex
CREATE UNIQUE INDEX "ZipMarket_zipCode_key" ON "ZipMarket"("zipCode");

-- CreateIndex
CREATE UNIQUE INDEX "MexLaneExpense_laneKey_key" ON "MexLaneExpense"("laneKey");

-- CreateIndex
CREATE UNIQUE INDEX "MexLaneExpense_laneKeyNorm_key" ON "MexLaneExpense"("laneKeyNorm");

-- CreateIndex
CREATE INDEX "MexLaneExpense_laneKeyNorm_idx" ON "MexLaneExpense"("laneKeyNorm");

-- CreateIndex
CREATE INDEX "CarrierMexLane_orgId_idx" ON "CarrierMexLane"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierMexLane_orgId_laneKeyNorm_key" ON "CarrierMexLane"("orgId", "laneKeyNorm");

-- CreateIndex
CREATE INDEX "CarrierUsaLane_orgId_idx" ON "CarrierUsaLane"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierUsaLane_orgId_laneKeyNorm_key" ON "CarrierUsaLane"("orgId", "laneKeyNorm");

-- CreateIndex
CREATE UNIQUE INDEX "UsaLaneData_laneKey_key" ON "UsaLaneData"("laneKey");

-- CreateIndex
CREATE INDEX "UsaLaneData_laneKey_idx" ON "UsaLaneData"("laneKey");

-- CreateIndex
CREATE UNIQUE INDEX "UsaLaneMktPrice_laneKey_key" ON "UsaLaneMktPrice"("laneKey");

-- CreateIndex
CREATE UNIQUE INDEX "UsaLaneMktPrice_laneKeyNorm_key" ON "UsaLaneMktPrice"("laneKeyNorm");

-- CreateIndex
CREATE INDEX "UsaLaneMktPrice_laneKeyNorm_idx" ON "UsaLaneMktPrice"("laneKeyNorm");

-- CreateIndex
CREATE UNIQUE INDEX "UsaDatBenchmark_laneKey_key" ON "UsaDatBenchmark"("laneKey");

-- CreateIndex
CREATE UNIQUE INDEX "UsaDatBenchmark_laneKeyNorm_key" ON "UsaDatBenchmark"("laneKeyNorm");

-- CreateIndex
CREATE INDEX "UsaDatBenchmark_laneKeyNorm_idx" ON "UsaDatBenchmark"("laneKeyNorm");

-- CreateIndex
CREATE UNIQUE INDEX "UsaMktCondition_market_key" ON "UsaMktCondition"("market");

-- CreateIndex
CREATE UNIQUE INDEX "UsaFuel_state_key" ON "UsaFuel"("state");

-- CreateIndex
CREATE UNIQUE INDEX "RegionDiesel_region_key" ON "RegionDiesel"("region");

-- CreateIndex
CREATE INDEX "FscIndex_fromDiesel_idx" ON "FscIndex"("fromDiesel");

-- CreateIndex
CREATE INDEX "DieselHistory_period_idx" ON "DieselHistory"("period");

-- CreateIndex
CREATE UNIQUE INDEX "DieselHistory_duoarea_period_key" ON "DieselHistory"("duoarea", "period");

-- CreateIndex
CREATE INDEX "MarketData_orgId_type_date_idx" ON "MarketData"("orgId", "type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Lane_orgId_laneKey_key" ON "Lane"("orgId", "laneKey");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssumptionSet" ADD CONSTRAINT "AssumptionSet_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssumptionParam" ADD CONSTRAINT "AssumptionParam_setId_fkey" FOREIGN KEY ("setId") REFERENCES "AssumptionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierMexLane" ADD CONSTRAINT "CarrierMexLane_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierUsaLane" ADD CONSTRAINT "CarrierUsaLane_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketData" ADD CONSTRAINT "MarketData_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lane" ADD CONSTRAINT "Lane_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lane" ADD CONSTRAINT "Lane_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_laneId_fkey" FOREIGN KEY ("laneId") REFERENCES "Lane"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_assumptionSetId_fkey" FOREIGN KEY ("assumptionSetId") REFERENCES "AssumptionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
