ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEVICE_SECURITY';

CREATE TYPE "TrustedDeviceStatus" AS ENUM (
  'TRUSTED',
  'TEMPORARY',
  'PENDING_VERIFICATION',
  'LOST',
  'STOLEN',
  'REVOKED',
  'BLOCKED'
);

CREATE TYPE "EmergencySessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

CREATE TYPE "EmergencySessionPurpose" AS ENUM (
  'LOST_DEVICE',
  'BORROWED_DEVICE',
  'WEB_RECOVERY',
  'TEST'
);

CREATE TYPE "PanicSource" AS ENUM (
  'APP_PANIC',
  'NATIVE_SOS',
  'WEB_EMERGENCY_ACCESS',
  'DURESS',
  'CONTROL_ROOM',
  'TEST'
);

CREATE TYPE "DeviceLostReason" AS ENUM (
  'LOST',
  'STOLEN',
  'DAMAGED',
  'REPLACED',
  'UNKNOWN'
);

CREATE TYPE "PanicWorkflowStatus" AS ENUM (
  'NEW',
  'ACKNOWLEDGED',
  'CONTACTING_CLIENT',
  'DISPATCHED',
  'RESPONDING',
  'ON_SCENE',
  'RESOLVED',
  'FALSE_ALARM',
  'CANCELLED',
  'ESCALATED',
  'UNABLE_TO_CONTACT'
);

CREATE TYPE "NativeSosCapability" AS ENUM (
  'SUPPORTED',
  'PARTIALLY_SUPPORTED',
  'NOT_AVAILABLE',
  'PERMISSION_REQUIRED'
);

CREATE TYPE "LocationTrackingMode" AS ENUM ('OFF', 'EMERGENCY_ONLY', 'CONTINUOUS');

CREATE TYPE "SecurityConsentKind" AS ENUM (
  'EMERGENCY_SOS',
  'EMERGENCY_LOCATION',
  'MEDICAL_PROFILE',
  'DEVICE_REGISTRATION',
  'PRIVACY_POLICY'
);

ALTER TABLE "emergency_contacts" ADD COLUMN IF NOT EXISTS "permission_to_contact" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "emergency_contacts" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);

ALTER TABLE "medical_profiles" ADD COLUMN IF NOT EXISTS "doctor_contact" TEXT;
ALTER TABLE "medical_profiles" ADD COLUMN IF NOT EXISTS "ambulance_preference" TEXT;

ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "device_id" UUID;
CREATE INDEX IF NOT EXISTS "refresh_tokens_device_id_idx" ON "refresh_tokens"("device_id");

CREATE TABLE "trusted_devices" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "public_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "device_type" TEXT NOT NULL,
  "os_name" TEXT,
  "os_version" TEXT,
  "app_version" TEXT,
  "user_agent" TEXT,
  "fingerprint_hash" TEXT,
  "status" "TrustedDeviceStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "is_locked" BOOLEAN NOT NULL DEFAULT false,
  "lost_reason" "DeviceLostReason",
  "native_sos" "NativeSosCapability" NOT NULL DEFAULT 'NOT_AVAILABLE',
  "native_sos_note" TEXT,
  "last_lat" DECIMAL(10,8),
  "last_lng" DECIMAL(11,8),
  "last_location_accuracy" DOUBLE PRECISION,
  "last_active_at" TIMESTAMP(3),
  "last_auth_at" TIMESTAMP(3),
  "last_failed_auth_at" TIMESTAMP(3),
  "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  "locked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trusted_devices_public_id_key" ON "trusted_devices"("public_id");
CREATE INDEX "trusted_devices_user_id_status_idx" ON "trusted_devices"("user_id", "status");
CREATE INDEX "trusted_devices_tenant_id_status_idx" ON "trusted_devices"("tenant_id", "status");
CREATE INDEX "trusted_devices_public_id_idx" ON "trusted_devices"("public_id");

CREATE TABLE "device_sessions" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "device_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "ip_address" TEXT,
  "auth_method" TEXT,
  "is_emergency" BOOLEAN NOT NULL DEFAULT false,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "device_sessions_device_id_revoked_at_idx" ON "device_sessions"("device_id", "revoked_at");
CREATE INDEX "device_sessions_user_id_revoked_at_idx" ON "device_sessions"("user_id", "revoked_at");

CREATE TABLE "emergency_sessions" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "device_id" UUID,
  "token_hash" TEXT NOT NULL,
  "purpose" "EmergencySessionPurpose" NOT NULL,
  "status" "EmergencySessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "auth_method" TEXT NOT NULL,
  "ip_address" TEXT,
  "actions_json" JSONB NOT NULL DEFAULT '[]',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "emergency_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emergency_sessions_token_hash_key" ON "emergency_sessions"("token_hash");
CREATE INDEX "emergency_sessions_user_id_status_idx" ON "emergency_sessions"("user_id", "status");
CREATE INDEX "emergency_sessions_tenant_id_status_expires_at_idx" ON "emergency_sessions"("tenant_id", "status", "expires_at");

CREATE TABLE "panic_events" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "device_id" UUID,
  "session_id" UUID,
  "incident_id" UUID,
  "source" "PanicSource" NOT NULL,
  "workflow_status" "PanicWorkflowStatus" NOT NULL DEFAULT 'NEW',
  "transmission_status" TEXT NOT NULL DEFAULT 'SENT',
  "idempotency_key" TEXT,
  "lat" DECIMAL(10,8),
  "lng" DECIMAL(11,8),
  "location_accuracy" DOUBLE PRECISION,
  "location_source" TEXT,
  "battery_level" INTEGER,
  "network_status" TEXT,
  "authenticated" BOOLEAN NOT NULL DEFAULT true,
  "is_test" BOOLEAN NOT NULL DEFAULT false,
  "is_silent" BOOLEAN NOT NULL DEFAULT false,
  "acknowledged_at" TIMESTAMP(3),
  "acknowledged_by_user_id" UUID,
  "dispatcher_name" TEXT,
  "response_unit" TEXT,
  "resolved_at" TIMESTAMP(3),
  "cancellation_reason" TEXT,
  "cancel_requested_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "panic_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "panic_events_tenant_id_idempotency_key_key" ON "panic_events"("tenant_id", "idempotency_key");
CREATE INDEX "panic_events_user_id_created_at_idx" ON "panic_events"("user_id", "created_at");
CREATE INDEX "panic_events_tenant_id_workflow_status_created_at_idx" ON "panic_events"("tenant_id", "workflow_status", "created_at");
CREATE INDEX "panic_events_incident_id_idx" ON "panic_events"("incident_id");

CREATE TABLE "panic_event_history" (
  "id" UUID NOT NULL,
  "panic_event_id" UUID NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "actor_user_id" UUID,
  "actor_role" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "panic_event_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "panic_event_history_panic_event_id_created_at_idx" ON "panic_event_history"("panic_event_id", "created_at");

CREATE TABLE "device_security_events" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "device_id" UUID,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_security_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "device_security_events_tenant_id_created_at_idx" ON "device_security_events"("tenant_id", "created_at");
CREATE INDEX "device_security_events_user_id_created_at_idx" ON "device_security_events"("user_id", "created_at");
CREATE INDEX "device_security_events_type_idx" ON "device_security_events"("type");

CREATE TABLE "security_lockdowns" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "reason" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_lockdowns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_lockdowns_user_id_active_idx" ON "security_lockdowns"("user_id", "active");

CREATE TABLE "security_audit_events" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "actor_role" TEXT,
  "account_user_id" UUID,
  "device_id" UUID,
  "session_id" UUID,
  "action" TEXT NOT NULL,
  "result" TEXT NOT NULL DEFAULT 'SUCCESS',
  "reason" TEXT,
  "source" TEXT,
  "target" TEXT,
  "previous_state" JSONB,
  "new_state" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_audit_events_tenant_id_created_at_idx" ON "security_audit_events"("tenant_id", "created_at");
CREATE INDEX "security_audit_events_account_user_id_created_at_idx" ON "security_audit_events"("account_user_id", "created_at");
CREATE INDEX "security_audit_events_action_idx" ON "security_audit_events"("action");

CREATE TABLE "security_consents" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "kind" "SecurityConsentKind" NOT NULL,
  "version" TEXT NOT NULL,
  "policy_version" TEXT NOT NULL,
  "accepted" BOOLEAN NOT NULL,
  "ip_address" TEXT,
  "device_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_consents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_consents_user_id_kind_created_at_idx" ON "security_consents"("user_id", "kind", "created_at");

CREATE TABLE "client_security_settings" (
  "user_id" UUID NOT NULL,
  "duress_enabled" BOOLEAN NOT NULL DEFAULT false,
  "duress_pin_hash" TEXT,
  "panic_hold_ms" INTEGER NOT NULL DEFAULT 3000,
  "emergency_session_minutes" INTEGER NOT NULL DEFAULT 10,
  "tracking_mode" "LocationTrackingMode" NOT NULL DEFAULT 'EMERGENCY_ONLY',
  "emergency_setup_completed_at" TIMESTAMP(3),
  "panic_tested_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_security_settings_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "trusted_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "emergency_sessions" ADD CONSTRAINT "emergency_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_sessions" ADD CONSTRAINT "emergency_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_sessions" ADD CONSTRAINT "emergency_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "trusted_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "panic_events" ADD CONSTRAINT "panic_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "panic_events" ADD CONSTRAINT "panic_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "panic_events" ADD CONSTRAINT "panic_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "trusted_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "panic_events" ADD CONSTRAINT "panic_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "emergency_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "panic_events" ADD CONSTRAINT "panic_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "panic_event_history" ADD CONSTRAINT "panic_event_history_panic_event_id_fkey" FOREIGN KEY ("panic_event_id") REFERENCES "panic_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "device_security_events" ADD CONSTRAINT "device_security_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "trusted_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "security_lockdowns" ADD CONSTRAINT "security_lockdowns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_lockdowns" ADD CONSTRAINT "security_lockdowns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "security_audit_events" ADD CONSTRAINT "security_audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_audit_events" ADD CONSTRAINT "security_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "security_consents" ADD CONSTRAINT "security_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_consents" ADD CONSTRAINT "security_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_security_settings" ADD CONSTRAINT "client_security_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "trusted_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
