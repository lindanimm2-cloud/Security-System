-- CreateEnum
CREATE TYPE "AlarmPanelConnectivity" AS ENUM ('WIFI', 'GSM_4G', 'WIFI_4G', 'ETHERNET', 'DUAL_PATH', 'RADIO');
CREATE TYPE "AlarmSystemStatus" AS ENUM ('COMMISSIONING', 'ONLINE', 'OFFLINE', 'FAULT');

-- CreateTable
CREATE TABLE "alarm_systems" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "kit_sku" TEXT,
    "supplier" TEXT,
    "connectivity" "AlarmPanelConnectivity" NOT NULL DEFAULT 'WIFI_4G',
    "panel_serial" TEXT,
    "imei" TEXT,
    "sim_iccid" TEXT,
    "wifi_mac" TEXT,
    "wifi_ssid" TEXT,
    "cloud_id" TEXT,
    "app_account" TEXT,
    "wireless_frequency" TEXT,
    "wireless_coding" TEXT,
    "gsm_bands" TEXT,
    "wifi_standard" TEXT,
    "input_voltage" TEXT,
    "backup_battery" TEXT,
    "icasa_cert" TEXT,
    "rfid_enabled" BOOLEAN NOT NULL DEFAULT true,
    "touch_keypad" BOOLEAN NOT NULL DEFAULT true,
    "mobile_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "zone_count" INTEGER NOT NULL DEFAULT 0,
    "firmware" TEXT,
    "tech_notes" TEXT,
    "status" "AlarmSystemStatus" NOT NULL DEFAULT 'COMMISSIONING',
    "installed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alarm_systems_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alarm_systems_property_id_idx" ON "alarm_systems"("property_id");
CREATE INDEX "alarm_systems_tenant_id_idx" ON "alarm_systems"("tenant_id");
CREATE INDEX "alarm_systems_panel_serial_idx" ON "alarm_systems"("panel_serial");
CREATE INDEX "alarm_systems_imei_idx" ON "alarm_systems"("imei");

ALTER TABLE "alarm_systems" ADD CONSTRAINT "alarm_systems_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alarm_systems" ADD CONSTRAINT "alarm_systems_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
