-- Fire roles (reserved for Phase 2 workspace)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FIRE_DISPATCHER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FIRE_CREW';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FIRE_SUPERVISOR';

-- Conversation + classification + notification priority
ALTER TYPE "ConversationType" ADD VALUE IF NOT EXISTS 'INCIDENT';

CREATE TYPE "IncidentClassification" AS ENUM ('SECURITY', 'MEDICAL', 'FIRE', 'ACCIDENT', 'THEFT', 'OTHER');
CREATE TYPE "ResponseAgency" AS ENUM ('SECURITY', 'MEDICAL', 'FIRE');
CREATE TYPE "NotificationPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- Incident hub fields
ALTER TABLE "incidents" ADD COLUMN "public_ref" TEXT;
ALTER TABLE "incidents" ADD COLUMN "classification" "IncidentClassification" NOT NULL DEFAULT 'SECURITY';
ALTER TABLE "incidents" ADD COLUMN "involved_agencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "incidents" ADD COLUMN "property_id" UUID;
ALTER TABLE "incidents" ADD COLUMN "vehicle_id" UUID;
ALTER TABLE "incidents" ADD COLUMN "context_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "incidents" ADD COLUMN "conversation_id" UUID;
ALTER TABLE "incidents" ADD COLUMN "acked_at" TIMESTAMP(3);
ALTER TABLE "incidents" ADD COLUMN "dispatched_at" TIMESTAMP(3);
ALTER TABLE "incidents" ADD COLUMN "on_scene_at" TIMESTAMP(3);

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS n
  FROM "incidents"
)
UPDATE "incidents" i
SET public_ref = 'NX-' || LPAD(numbered.n::text, 4, '0')
FROM numbered
WHERE i.id = numbered.id;

UPDATE "incidents" SET public_ref = 'NX-' || SUBSTRING(id::text, 1, 4) WHERE public_ref IS NULL;

ALTER TABLE "incidents" ALTER COLUMN "public_ref" SET NOT NULL;
CREATE UNIQUE INDEX "incidents_tenant_id_public_ref_key" ON "incidents"("tenant_id", "public_ref");
CREATE INDEX "incidents_property_id_idx" ON "incidents"("property_id");
CREATE INDEX "incidents_vehicle_id_idx" ON "incidents"("vehicle_id");

UPDATE "incidents" SET classification = 'MEDICAL' WHERE type = 'MEDICAL';
UPDATE "incidents" SET classification = 'FIRE' WHERE type = 'FIRE';
UPDATE "incidents" SET classification = 'THEFT' WHERE type = 'THEFT';
UPDATE "incidents" SET classification = 'SECURITY' WHERE type IN ('PANIC', 'ASSAULT', 'ALARM');
UPDATE "incidents" SET classification = 'OTHER' WHERE type = 'OTHER';

UPDATE "incidents" SET involved_agencies = ARRAY['MEDICAL'] WHERE type = 'MEDICAL';
UPDATE "incidents" SET involved_agencies = ARRAY['FIRE'] WHERE type = 'FIRE';
UPDATE "incidents" SET involved_agencies = ARRAY['SECURITY'] WHERE type NOT IN ('MEDICAL', 'FIRE') AND cardinality(involved_agencies) = 0;

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dispatch generalization
ALTER TABLE "dispatches" ALTER COLUMN "officer_id" DROP NOT NULL;
ALTER TABLE "dispatches" ADD COLUMN "company_vehicle_id" UUID;
ALTER TABLE "dispatches" ADD COLUMN "agency" "ResponseAgency" NOT NULL DEFAULT 'SECURITY';
ALTER TABLE "dispatches" ADD COLUMN "eta_seconds" INTEGER;
CREATE INDEX "dispatches_officer_id_idx" ON "dispatches"("officer_id");
CREATE INDEX "dispatches_company_vehicle_id_idx" ON "dispatches"("company_vehicle_id");
ALTER TABLE "dispatches"
  ADD CONSTRAINT "dispatches_company_vehicle_id_fkey"
  FOREIGN KEY ("company_vehicle_id") REFERENCES "company_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "dispatches" d
SET agency = 'MEDICAL'
FROM "incidents" i
WHERE d.incident_id = i.id AND i.type = 'MEDICAL';
UPDATE "dispatches" d
SET agency = 'FIRE'
FROM "incidents" i
WHERE d.incident_id = i.id AND i.type = 'FIRE';

-- Notifications
ALTER TABLE "notifications" ADD COLUMN "incident_id" UUID;
ALTER TABLE "notifications" ADD COLUMN "priority" "NotificationPriority" NOT NULL DEFAULT 'P2';
ALTER TABLE "notifications" ADD COLUMN "deep_link" TEXT;
CREATE INDEX "notifications_incident_id_idx" ON "notifications"("incident_id");
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_incident_id_fkey"
  FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "notifications" SET priority = 'P0' WHERE type = 'PANIC_ALERT';
UPDATE "notifications" SET priority = 'P1' WHERE type IN ('THEFT_ALERT', 'DISPATCH_ASSIGNED', 'ERROR_REPORT');

-- Alarm / call relations
UPDATE "alarm_events" SET incident_id = NULL
WHERE incident_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "incidents" i WHERE i.id = "alarm_events".incident_id);

CREATE INDEX "alarm_events_incident_id_idx" ON "alarm_events"("incident_id");
ALTER TABLE "alarm_events"
  ADD CONSTRAINT "alarm_events_incident_id_fkey"
  FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "call_sessions" SET incident_id = NULL
WHERE incident_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "incidents" i WHERE i.id = "call_sessions".incident_id);

CREATE INDEX "call_sessions_incident_id_idx" ON "call_sessions"("incident_id");
ALTER TABLE "call_sessions"
  ADD CONSTRAINT "call_sessions_incident_id_fkey"
  FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "incident_events" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "incident_id" UUID,
  "type" TEXT NOT NULL,
  "actor_user_id" UUID,
  "source" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "incident_events_incident_id_created_at_idx" ON "incident_events"("incident_id", "created_at");
CREATE INDEX "incident_events_tenant_id_created_at_idx" ON "incident_events"("tenant_id", "created_at");
CREATE INDEX "incident_events_type_idx" ON "incident_events"("type");

ALTER TABLE "incident_events"
  ADD CONSTRAINT "incident_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_events"
  ADD CONSTRAINT "incident_events_incident_id_fkey"
  FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incident_events"
  ADD CONSTRAINT "incident_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "role_permissions" (
  "role" "UserRole" NOT NULL,
  "permission_code" TEXT NOT NULL,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role", "permission_code")
);
