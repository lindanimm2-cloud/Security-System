-- WinCRAM-inspired ARC desk: claim/ack policy, zone reporting, schedules, operator responses

ALTER TYPE "AlarmEventType" ADD VALUE IF NOT EXISTS 'FAILED_CHECK_IN';
ALTER TYPE "AlarmEventType" ADD VALUE IF NOT EXISTS 'OUT_OF_HOURS';
ALTER TYPE "AlarmEventType" ADD VALUE IF NOT EXISTS 'INFORMATIVE';

ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "check_in_hours" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "last_check_in_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "monitoring_schedule" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "sensors"
  ADD COLUMN IF NOT EXISTS "report_as_type" TEXT,
  ADD COLUMN IF NOT EXISTS "required_action" TEXT,
  ADD COLUMN IF NOT EXISTS "requires_ack" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "alarm_events"
  ADD COLUMN IF NOT EXISTS "requires_ack" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "claimed_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "close_meta" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "operator_response_templates" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "mandatory" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operator_response_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "alarm_event_responses" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "template_id" UUID,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "note" TEXT,
  "actor_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "alarm_event_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "operator_response_templates_tenant_id_code_key"
  ON "operator_response_templates"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "operator_response_templates_tenant_id_sort_order_idx"
  ON "operator_response_templates"("tenant_id", "sort_order");

CREATE UNIQUE INDEX IF NOT EXISTS "alarm_event_responses_event_id_code_key"
  ON "alarm_event_responses"("event_id", "code");
CREATE INDEX IF NOT EXISTS "alarm_event_responses_tenant_id_event_id_idx"
  ON "alarm_event_responses"("tenant_id", "event_id");
CREATE INDEX IF NOT EXISTS "alarm_events_claimed_by_user_id_idx"
  ON "alarm_events"("claimed_by_user_id");

DO $$ BEGIN
  ALTER TABLE "operator_response_templates"
    ADD CONSTRAINT "operator_response_templates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "alarm_events"
    ADD CONSTRAINT "alarm_events_claimed_by_user_id_fkey"
    FOREIGN KEY ("claimed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "alarm_event_responses"
    ADD CONSTRAINT "alarm_event_responses_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "alarm_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "alarm_event_responses"
    ADD CONSTRAINT "alarm_event_responses_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "operator_response_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "alarm_event_responses"
    ADD CONSTRAINT "alarm_event_responses_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
