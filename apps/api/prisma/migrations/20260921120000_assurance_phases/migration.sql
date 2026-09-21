-- Phase 2+ assurance: evidence hashing, audit chain, vuln register, offline sync

ALTER TABLE "incident_media" ADD COLUMN IF NOT EXISTS "sha256_hash" TEXT;
ALTER TABLE "incident_media" ADD COLUMN IF NOT EXISTS "file_size_bytes" INTEGER;
ALTER TABLE "incident_media" ADD COLUMN IF NOT EXISTS "custody_hash" TEXT;
CREATE INDEX IF NOT EXISTS "incident_media_sha256_hash_idx" ON "incident_media"("sha256_hash");

ALTER TABLE "security_audit_events" ADD COLUMN IF NOT EXISTS "event_hash" TEXT;
ALTER TABLE "security_audit_events" ADD COLUMN IF NOT EXISTS "prev_event_hash" TEXT;
CREATE INDEX IF NOT EXISTS "security_audit_events_tenant_id_event_hash_idx" ON "security_audit_events"("tenant_id", "event_hash");

-- Append-only: block UPDATE/DELETE from application DB roles (best-effort; superuser still can).
CREATE OR REPLACE FUNCTION forbid_security_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'security_audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS security_audit_events_no_update ON "security_audit_events";
CREATE TRIGGER security_audit_events_no_update
  BEFORE UPDATE ON "security_audit_events"
  FOR EACH ROW EXECUTE PROCEDURE forbid_security_audit_mutation();

DROP TRIGGER IF EXISTS security_audit_events_no_delete ON "security_audit_events";
CREATE TRIGGER security_audit_events_no_delete
  BEFORE DELETE ON "security_audit_events"
  FOR EACH ROW EXECUTE PROCEDURE forbid_security_audit_mutation();

CREATE TABLE IF NOT EXISTS "vulnerability_findings" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "source" TEXT NOT NULL DEFAULT 'internal',
  "description" TEXT,
  "remediation" TEXT,
  "cve_id" TEXT,
  "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vulnerability_findings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vulnerability_findings_tenant_id_status_idx" ON "vulnerability_findings"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "vulnerability_findings_tenant_id_severity_idx" ON "vulnerability_findings"("tenant_id", "severity");

DO $$ BEGIN
  ALTER TABLE "vulnerability_findings" ADD CONSTRAINT "vulnerability_findings_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "offline_sync_cursors" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "device_key" TEXT NOT NULL,
  "last_sync_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cursor_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offline_sync_cursors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "offline_sync_cursors_tenant_id_user_id_device_key_key"
  ON "offline_sync_cursors"("tenant_id", "user_id", "device_key");
CREATE INDEX IF NOT EXISTS "offline_sync_cursors_tenant_id_user_id_idx"
  ON "offline_sync_cursors"("tenant_id", "user_id");

DO $$ BEGIN
  ALTER TABLE "offline_sync_cursors" ADD CONSTRAINT "offline_sync_cursors_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
