-- Control-panel VMS: camera config, recording schedules, e-map, alarm-video rules, exports, ops audit

CREATE TABLE IF NOT EXISTS "vms_camera_configs" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "camera_id" TEXT NOT NULL,
  "image" JSONB NOT NULL DEFAULT '{}',
  "encoding" JSONB NOT NULL DEFAULT '{}',
  "osd" JSONB NOT NULL DEFAULT '{}',
  "staged_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vms_camera_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "vms_camera_configs_tenant_id_camera_id_key"
  ON "vms_camera_configs"("tenant_id", "camera_id");

CREATE TABLE IF NOT EXISTS "vms_record_schedules" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "camera_id" TEXT NOT NULL,
  "days" JSONB NOT NULL DEFAULT '[]',
  "retention_days" INTEGER NOT NULL DEFAULT 30,
  "pre_record_sec" INTEGER NOT NULL DEFAULT 5,
  "post_record_sec" INTEGER NOT NULL DEFAULT 30,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vms_record_schedules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "vms_record_schedules_tenant_id_camera_id_key"
  ON "vms_record_schedules"("tenant_id", "camera_id");

CREATE TABLE IF NOT EXISTS "vms_floorplans" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "property_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vms_floorplans_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "vms_floorplans_tenant_id_property_id_idx"
  ON "vms_floorplans"("tenant_id", "property_id");

CREATE TABLE IF NOT EXISTS "vms_camera_placements" (
  "id" UUID NOT NULL,
  "floorplan_id" UUID NOT NULL,
  "camera_id" TEXT NOT NULL,
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "vms_camera_placements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "vms_camera_placements_floorplan_id_camera_id_key"
  ON "vms_camera_placements"("floorplan_id", "camera_id");

CREATE TABLE IF NOT EXISTS "vms_alarm_video_rules" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "camera_id" TEXT NOT NULL,
  "alarm_type" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "level" INTEGER NOT NULL DEFAULT 3,
  "actions" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vms_alarm_video_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "vms_alarm_video_rules_tenant_id_camera_id_alarm_type_key"
  ON "vms_alarm_video_rules"("tenant_id", "camera_id", "alarm_type");
CREATE INDEX IF NOT EXISTS "vms_alarm_video_rules_tenant_id_enabled_idx"
  ON "vms_alarm_video_rules"("tenant_id", "enabled");

CREATE TABLE IF NOT EXISTS "vms_video_export_jobs" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "camera_id" TEXT NOT NULL,
  "camera_name" TEXT NOT NULL,
  "site_name" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'MP4',
  "incident_ref" TEXT,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "size_mb" INTEGER NOT NULL DEFAULT 0,
  "path" TEXT NOT NULL DEFAULT '',
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vms_video_export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "vms_video_export_jobs_tenant_id_created_at_idx"
  ON "vms_video_export_jobs"("tenant_id", "created_at");

CREATE TABLE IF NOT EXISTS "ops_audit_entries" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "actor_id" UUID,
  "actor" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "detail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ops_audit_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ops_audit_entries_tenant_id_created_at_idx"
  ON "ops_audit_entries"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "ops_audit_entries_tenant_id_category_idx"
  ON "ops_audit_entries"("tenant_id", "category");

DO $$ BEGIN
  ALTER TABLE "vms_camera_placements"
    ADD CONSTRAINT "vms_camera_placements_floorplan_id_fkey"
    FOREIGN KEY ("floorplan_id") REFERENCES "vms_floorplans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
