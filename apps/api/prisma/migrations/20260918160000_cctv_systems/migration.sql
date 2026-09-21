-- AlterEnum PropertyType
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'STORE';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'MALL';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'OFFICE';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'BRANCH';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'WAREHOUSE';

-- CreateEnum
CREATE TYPE "CctvRecorderType" AS ENUM ('DVR', 'NVR', 'HYBRID', 'IP_KIT');
CREATE TYPE "CctvConnectivity" AS ENUM ('AHD', 'ANALOG', 'LAN', 'WIFI', 'HYBRID', 'CLOUD');
CREATE TYPE "CctvSystemStatus" AS ENUM ('COMMISSIONING', 'ONLINE', 'OFFLINE', 'FAULT');

-- CreateTable
CREATE TABLE "cctv_systems" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "kit_sku" TEXT,
    "supplier" TEXT,
    "recorder_type" "CctvRecorderType" NOT NULL DEFAULT 'DVR',
    "channel_count" INTEGER NOT NULL DEFAULT 4,
    "connectivity" "CctvConnectivity" NOT NULL DEFAULT 'AHD',
    "recorder_serial" TEXT,
    "recorder_ip" TEXT,
    "cloud_id" TEXT,
    "hdd_installed" BOOLEAN NOT NULL DEFAULT false,
    "hdd_serial" TEXT,
    "hdd_capacity_gb" INTEGER,
    "firmware" TEXT,
    "mobile_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tech_notes" TEXT,
    "status" "CctvSystemStatus" NOT NULL DEFAULT 'COMMISSIONING',
    "installed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cctv_systems_pkey" PRIMARY KEY ("id")
);

-- AlterTable cameras
ALTER TABLE "cameras" ADD COLUMN IF NOT EXISTS "system_id" UUID;
ALTER TABLE "cameras" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "cameras" ADD COLUMN IF NOT EXISTS "serial_number" TEXT;
ALTER TABLE "cameras" ADD COLUMN IF NOT EXISTS "resolution" TEXT;

-- Indexes
CREATE INDEX "cctv_systems_property_id_idx" ON "cctv_systems"("property_id");
CREATE INDEX "cctv_systems_tenant_id_idx" ON "cctv_systems"("tenant_id");
CREATE INDEX "cctv_systems_recorder_serial_idx" ON "cctv_systems"("recorder_serial");
CREATE INDEX "cameras_system_id_idx" ON "cameras"("system_id");
CREATE INDEX "cameras_serial_number_idx" ON "cameras"("serial_number");

-- ForeignKeys
ALTER TABLE "cctv_systems" ADD CONSTRAINT "cctv_systems_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cctv_systems" ADD CONSTRAINT "cctv_systems_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "cctv_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
