-- Persistent Operational Mode / Duty Mode fields on officers
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "duty_mode_active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "duty_started_at" TIMESTAMP(3);
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "last_heartbeat_at" TIMESTAMP(3);
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "device_label" TEXT;
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "battery_pct" INTEGER;
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "network_type" TEXT;
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "push_token" TEXT;
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "app_version" TEXT;
ALTER TABLE "officers" ADD COLUMN IF NOT EXISTS "operational_checks" JSONB;

CREATE INDEX IF NOT EXISTS "officers_tenant_id_duty_mode_active_last_heartbeat_at_idx"
  ON "officers"("tenant_id", "duty_mode_active", "last_heartbeat_at");
